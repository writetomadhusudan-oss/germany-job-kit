"""Global Job Kit — FastAPI backend.

Serves the static frontend, handles payments through a pluggable provider
interface (Dodo Payments by default via the official Dodo SDK; Stripe
natively; Paddle / Gumroad via payment link + signed webhook), mints license
keys on completed payments, and gates the /app/* tools via a signed cookie.

Env vars (see ../.env.example):
  PAYMENT_PROVIDER=dodo|stripe|paddle|gumroad   (default: dodo)
  DODO_PAYMENTS_API_KEY, DODO_PRODUCT_ID,
  DODO_PAYMENTS_ENVIRONMENT, DODO_PAYMENTS_WEBHOOK_SECRET   (provider=dodo)
  STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET   (provider=stripe)
  PROVIDER_CHECKOUT_URL, PROVIDER_WEBHOOK_SECRET  (provider=paddle|gumroad)

v1 note: no emails are sent. The buyer gets the license key on the
confirmation page (Stripe) or via the success-page lookup (Dodo and other
providers, once the payment webhook fires). Hookup point for email delivery
is marked in README.
"""

import abc
import dataclasses
import datetime
import hashlib
import hmac
import html
import json
import os
import secrets

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import Column, DateTime, Integer, String, create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import declarative_base, sessionmaker

import stripe

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")

PAYMENT_PROVIDER = os.getenv("PAYMENT_PROVIDER", "dodo").strip().lower()
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
# --- Dodo Payments (default provider) ---
DODO_PAYMENTS_API_KEY = os.getenv("DODO_PAYMENTS_API_KEY", "").strip()
DODO_PRODUCT_ID = os.getenv("DODO_PRODUCT_ID", "").strip()
# Regional products: one Dodo product per checkout currency (all unlock the
# same Global Job Kit license). Falls back to DODO_PRODUCT_ID when unset.
DODO_PRODUCT_IDS = {
    "EUR": os.getenv("DODO_PRODUCT_ID_EUR", "").strip(),
    "CAD": os.getenv("DODO_PRODUCT_ID_CAD", "").strip(),
    "AUD": os.getenv("DODO_PRODUCT_ID_AUD", "").strip(),
    "GBP": os.getenv("DODO_PRODUCT_ID_GBP", "").strip(),
    "INR": os.getenv("DODO_PRODUCT_ID_INR", "").strip(),
}
DODO_PAYMENTS_ENVIRONMENT = os.getenv(
    "DODO_PAYMENTS_ENVIRONMENT", "test_mode").strip().lower()
DODO_PAYMENTS_WEBHOOK_SECRET = os.getenv(
    "DODO_PAYMENTS_WEBHOOK_SECRET", "").strip()
# --- Fallback providers (paddle / gumroad) ---
PROVIDER_CHECKOUT_URL = os.getenv("PROVIDER_CHECKOUT_URL", "").strip()
PROVIDER_WEBHOOK_SECRET = os.getenv("PROVIDER_WEBHOOK_SECRET", "").strip()
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:8000").rstrip("/")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
DEV_BYPASS_PAYWALL = os.getenv("DEV_BYPASS_PAYWALL", "false").lower() == "true"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./germany_job_kit.db")

PRICE_CENTS = 599  # €5.99
PRODUCT_NAME = "Global Job Kit — Lifetime Access"
COOKIE_NAME = "gjk_access"

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# ---------------------------------------------------------------- DB ----
Base = declarative_base()


class License(Base):
    __tablename__ = "licenses"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), default="")
    license_key = Column(String(32), unique=True, index=True)
    provider = Column(String(32), default="")
    external_id = Column(String(255), unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


_engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
engine = create_engine(DATABASE_URL, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
Base.metadata.create_all(engine)

# ------------------------------------------------------- license keys ----
_KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no ambiguous chars


def generate_license_key() -> str:
    groups = ["".join(secrets.choice(_KEY_ALPHABET) for _ in range(4))
              for _ in range(3)]
    return "GJK-" + "-".join(groups)


def _sign(key: str) -> str:
    return hmac.new(SECRET_KEY.encode(), key.encode(), hashlib.sha256).hexdigest()


def make_cookie_value(key: str) -> str:
    return f"{key}.{_sign(key)}"


def get_license(key: str):
    db = SessionLocal()
    try:
        return db.query(License).filter(License.license_key == key).first()
    finally:
        db.close()


def get_license_by_external_id(external_id: str):
    db = SessionLocal()
    try:
        return db.query(License).filter(
            License.external_id == external_id).first()
    finally:
        db.close()


def store_license(email: str, key: str, provider: str, external_id: str | None):
    """Insert a license; idempotent on external_id (webhook retries/races)."""
    db = SessionLocal()
    try:
        lic = License(email=email or "", license_key=key, provider=provider,
                      external_id=external_id)
        db.add(lic)
        db.commit()
        return lic
    except IntegrityError:
        db.rollback()
        if external_id:
            return db.query(License).filter(
                License.external_id == external_id).first()
        return db.query(License).filter(License.license_key == key).first()
    finally:
        db.close()


def cookie_grants_access(cookie_value: str | None) -> bool:
    if DEV_BYPASS_PAYWALL:
        return True
    if not cookie_value or "." not in cookie_value:
        return False
    key, sig = cookie_value.rsplit(".", 1)
    if not hmac.compare_digest(_sign(key), sig):
        return False
    return get_license(key) is not None


# ------------------------------------------------- payment providers ----
class ProviderError(Exception):
    """User-facing configuration/processing error."""


class ProviderNotConfigured(ProviderError):
    pass


@dataclasses.dataclass
class CompletedPayment:
    email: str
    external_id: str  # provider's order/session id, for idempotency


class PaymentProvider(abc.ABC):
    name: str

    @abc.abstractmethod
    def create_checkout(self, success_url: str, cancel_url: str) -> str:
        """Return the URL the buyer should be redirected to."""

    @abc.abstractmethod
    async def parse_webhook(self, request: Request) -> CompletedPayment | None:
        """Return a CompletedPayment for a completed purchase webhook,
        or None if the event is not a completed payment."""


class StripeProvider(PaymentProvider):
    name = "stripe"

    def create_checkout(self, success_url: str, cancel_url: str) -> str:
        if not STRIPE_SECRET_KEY:
            raise ProviderNotConfigured(
                "Stripe is not configured. Set STRIPE_SECRET_KEY, or switch "
                "PAYMENT_PROVIDER to dodo (default) with DODO_PAYMENTS_API_KEY "
                "and DODO_PRODUCT_ID, or to paddle/gumroad with "
                "PROVIDER_CHECKOUT_URL.")
        try:
            session = stripe.checkout.Session.create(
                mode="payment",
                line_items=[{
                    "price_data": {
                        "currency": "eur",
                        "unit_amount": PRICE_CENTS,
                        "product_data": {"name": PRODUCT_NAME},
                    },
                    "quantity": 1,
                }],
                success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
                cancel_url=cancel_url,
                metadata={"product": "germany-job-kit"},
            )
            return session.url
        except Exception as e:
            raise ProviderError(f"Stripe checkout failed: {e}")

    async def parse_webhook(self, request: Request) -> CompletedPayment | None:
        if not STRIPE_WEBHOOK_SECRET:
            raise ProviderNotConfigured("STRIPE_WEBHOOK_SECRET is not set.")
        payload = await request.body()
        sig = request.headers.get("stripe-signature", "")
        try:
            event = stripe.Webhook.construct_event(
                payload, sig, STRIPE_WEBHOOK_SECRET)
        except Exception as e:
            raise ProviderError(f"Invalid Stripe signature: {e}")
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            if session.get("payment_status") == "paid":
                details = session.get("customer_details") or {}
                return CompletedPayment(email=details.get("email", ""),
                                        external_id=session.get("id"))
        return None

    def retrieve_paid_session(self, session_id: str) -> CompletedPayment:
        """Server-side verification for the /success page."""
        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except Exception as e:
            raise ProviderError(f"Could not verify payment: {e}")
        if session.get("payment_status") != "paid":
            raise ProviderError("Payment not completed yet.")
        details = session.get("customer_details") or {}
        return CompletedPayment(email=details.get("email", ""),
                                external_id=session.get("id"))


# ------------------------------------------------------- Dodo Payments ----
# Dodo Payments (https://dodopayments.com, docs at
# https://docs.dodopayments.com) is the default provider. It is a merchant
# of record, so it handles EU VAT/GST on the €5.99 digital sale for an
# Indian seller — the seller's obligations are covered by Dodo.
#
# Flow:
#   1. Seller creates a ONE-TIME product (€5.99) in the Dodo dashboard and
#      copies its product id (looks like "pdt_...").
#   2. This app creates a Dodo Checkout Session server-side and redirects
#      the buyer to the returned checkout_url.
#   3. After payment, Dodo redirects to APP_BASE_URL/success with
#      ?payment_id=...&status=...&email=... appended.
#   4. Dodo also POSTs a `payment.succeeded` webhook to /api/webhook.
#      This app verifies it (Standard Webhooks scheme, via the official
#      `dodopayments[webhooks]` extra) and mints the GJK license key,
#      idempotent on Dodo's payment_id.
#   5. The success page polls /api/license-by-order?order_id={payment_id}
#      until the key appears, then verifies it to set the unlock cookie.
class DodoProvider(PaymentProvider):
    name = "dodo"

    def _client(self):
        try:
            from dodopayments import DodoPayments
        except ImportError:
            raise ProviderNotConfigured(
                "The 'dodopayments' package is not installed. Run "
                "'pip install -r requirements.txt'.")
        if not DODO_PAYMENTS_API_KEY:
            raise ProviderNotConfigured(
                "Dodo Payments is not configured. Set DODO_PAYMENTS_API_KEY "
                "(Dashboard → Developer → API keys) and at least one product "
                "id (DODO_PRODUCT_ID or DODO_PRODUCT_ID_EUR/_CAD/_AUD/_GBP/"
                "_INR). See README, 'Dodo Payments (default)'.")
        if not DODO_PRODUCT_ID:
            if not any(DODO_PRODUCT_IDS.values()):
                raise ProviderNotConfigured(
                    "No Dodo product is set. Create one-time products in the "
                    "Dodo dashboard and set DODO_PRODUCT_ID (single product) "
                    "or DODO_PRODUCT_ID_EUR/_CAD/_AUD/_GBP/_INR (regional "
                    "products). See README, 'Dodo Payments (default)'.")
        if DODO_PAYMENTS_ENVIRONMENT not in ("test_mode", "live_mode"):
            raise ProviderNotConfigured(
                "DODO_PAYMENTS_ENVIRONMENT must be 'test_mode' or "
                "'live_mode'.")
        return DodoPayments(bearer_token=DODO_PAYMENTS_API_KEY,
                            environment=DODO_PAYMENTS_ENVIRONMENT)

    def create_checkout(self, success_url: str, cancel_url: str, product_id: str = "") -> str:
        # Static payment-link fallback (Dashboard → Products → share link),
        # useful when you only have a dashboard link and no API key.
        product_id = product_id or DODO_PRODUCT_ID
        if (not DODO_PAYMENTS_API_KEY or not product_id) \
                and PROVIDER_CHECKOUT_URL:
            return PROVIDER_CHECKOUT_URL
        client = self._client()
        try:
            session = client.checkout_sessions.create(
                product_cart=[{"product_id": product_id, "quantity": 1}],
                return_url=success_url,
                cancel_url=cancel_url,
                minimal_address=True,  # faster checkout: country + ZIP only
                metadata={"product": "global-job-kit"},
            )
        except Exception as e:
            raise ProviderError(f"Dodo checkout failed: {e}")
        if not session.checkout_url:
            raise ProviderError("Dodo did not return a checkout URL.")
        return session.checkout_url

    async def parse_webhook(self, request: Request) -> CompletedPayment | None:
        """Verify the Dodo webhook (Standard Webhooks scheme) and return a
        CompletedPayment for `payment.succeeded` events."""
        if not DODO_PAYMENTS_WEBHOOK_SECRET:
            raise ProviderNotConfigured(
                "DODO_PAYMENTS_WEBHOOK_SECRET is not set. Create a webhook "
                "endpoint in the Dodo dashboard (Developer → Webhooks) "
                "pointing at https://YOUR-APP-DOMAIN/api/webhook, subscribe "
                "to 'payment.succeeded', and paste the webhook secret.")
        try:
            from dodopayments import DodoPayments
        except ImportError:
            raise ProviderNotConfigured(
                "The 'dodopayments[webhooks]' package is not installed. Run "
                "'pip install -r requirements.txt'.")
        raw = await request.body()
        payload = raw.decode("utf-8")
        headers = dict(request.headers)
        # NOTE: unwrap() verifies the signature; a dummy bearer token is
        # fine here because no API call is made.
        client = DodoPayments(bearer_token="verify-only",
                              environment=DODO_PAYMENTS_ENVIRONMENT)
        try:
            event = client.webhooks.unwrap(
                payload, headers=headers,
                key=DODO_PAYMENTS_WEBHOOK_SECRET)
        except Exception as e:
            raise ProviderError(f"Invalid Dodo webhook signature: {e}")
        if event.type == "payment.succeeded":
            payment = event.data
            customer = getattr(payment, "customer", None)
            email = getattr(customer, "email", "") or ""
            payment_id = getattr(payment, "payment_id", "") or ""
            if not payment_id:
                raise ProviderError(
                    "Dodo webhook payload missing payment_id.")
            return CompletedPayment(email=email, external_id=payment_id)
        # Other events (payment.failed, refunds, license_key.created, …)
        # are acknowledged but grant no entitlement.
        return None


# Expected JSON body for fallback-provider webhooks (paddle/gumroad):
#   {"event": "payment.completed", "email": "buyer@example.com",
#    "order_id": "ord_abc123", "timestamp": 1727000000}
# Signed with header:  X-Webhook-Signature: hex(hmac_sha256(
#     PROVIDER_WEBHOOK_SECRET, raw_request_body))
# Configure this in the provider's dashboard (webhook URL =
# https://YOUR-APP/api/webhook). See README for per-provider notes.
class GenericHmacProvider(PaymentProvider):
    def __init__(self, name: str):
        self.name = name

    def create_checkout(self, success_url: str, cancel_url: str) -> str:
        if not PROVIDER_CHECKOUT_URL:
            raise ProviderNotConfigured(
                f"Set PROVIDER_CHECKOUT_URL to your {self.name} payment link "
                f"for '{PRODUCT_NAME}' (€5.99).")
        return PROVIDER_CHECKOUT_URL

    async def parse_webhook(self, request: Request) -> CompletedPayment | None:
        if not PROVIDER_WEBHOOK_SECRET:
            raise ProviderNotConfigured("PROVIDER_WEBHOOK_SECRET is not set.")
        body = await request.body()
        sig = request.headers.get("x-webhook-signature", "")
        expected = hmac.new(PROVIDER_WEBHOOK_SECRET.encode(), body,
                            hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig):
            raise ProviderError("Invalid webhook signature.")
        try:
            data = json.loads(body)
        except Exception:
            raise ProviderError("Webhook body is not valid JSON.")
        if data.get("event") != "payment.completed":
            return None
        order_id = str(data.get("order_id") or "")
        if not order_id:
            raise ProviderError("Webhook payload missing order_id.")
        return CompletedPayment(email=str(data.get("email") or ""),
                                external_id=order_id)


def _build_provider() -> PaymentProvider:
    if PAYMENT_PROVIDER == "dodo":
        return DodoProvider()
    if PAYMENT_PROVIDER == "stripe":
        return StripeProvider()
    if PAYMENT_PROVIDER in ("paddle", "gumroad"):
        return GenericHmacProvider(PAYMENT_PROVIDER)
    raise RuntimeError(
        f"Unknown PAYMENT_PROVIDER={PAYMENT_PROVIDER!r} "
        "(expected dodo|stripe|paddle|gumroad)")


provider = _build_provider()

# ---------------------------------------------------------------- app ----
app = FastAPI(title="Global Job Kit")

app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")

APP_PAGES = {
    "": "index.html",  # /app hub
    "cv": "cv.html",
    "cover-letter": "cover-letter.html",
    "chancenkarte": "chancenkarte.html",
    "blue-card": "blue-card.html",
    "tracker": "tracker.html",
    "guide": "guide.html",
    # France kit
    "fr/cv": "fr/cv.html",
    "fr/lettre": "fr/lettre.html",
    "fr/passeport-talent": "fr/passeport-talent.html",
    "fr/guide": "fr/guide.html",
    # Canada kit
    "ca/resume": "ca/resume.html",
    "ca/cover-letter": "ca/cover-letter.html",
    "ca/crs": "ca/crs.html",
    "ca/guide": "ca/guide.html",
    # Australia kit
    "au/resume": "au/resume.html",
    "au/cover-letter": "au/cover-letter.html",
    "au/skillselect": "au/skillselect.html",
    "au/guide": "au/guide.html",
    # UK kit
    "uk/cv": "uk/cv.html",
    "uk/cover-letter": "uk/cover-letter.html",
    "uk/skilled-worker": "uk/skilled-worker.html",
    "uk/guide": "uk/guide.html",
    # Netherlands kit
    "nl/cv": "nl/cv.html",
    "nl/motivation": "nl/motivation.html",
    "nl/hsm": "nl/hsm.html",
    "nl/guide": "nl/guide.html",
}


def _page(name: str) -> FileResponse:
    return FileResponse(os.path.join(FRONTEND_DIR, "app", name))


@app.get("/", response_class=HTMLResponse)
def landing():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/unlock", response_class=HTMLResponse)
def unlock():
    return FileResponse(os.path.join(FRONTEND_DIR, "unlock.html"))


@app.get("/app")
def app_hub(request: Request):
    if not cookie_grants_access(request.cookies.get(COOKIE_NAME)):
        return RedirectResponse("/unlock", status_code=302)
    return _page(APP_PAGES[""])


@app.get("/app/{page:path}")
def app_page(page: str, request: Request):
    if page not in APP_PAGES or page == "":
        return JSONResponse({"error": "not found"}, status_code=404)
    if not cookie_grants_access(request.cookies.get(COOKIE_NAME)):
        return RedirectResponse("/unlock", status_code=302)
    return _page(APP_PAGES[page])


# -------------------------------------------------------------- payments --
@app.post("/api/checkout")
async def create_checkout(request: Request):
    # Optional JSON body: {"currency": "EUR"|"CAD"|"AUD"|"GBP"|"INR"} — picks
    # the regional Dodo product so buyers check out in their local currency.
    # Never accept a raw product id from the browser: only the allowlist.
    currency = "EUR"
    try:
        body = await request.json()
        if isinstance(body, dict) and body.get("currency"):
            currency = str(body["currency"]).upper()
    except Exception:
        pass
    if currency not in DODO_PRODUCT_IDS:
        return JSONResponse({"error": "Unsupported currency."}, status_code=400)
    product_id = DODO_PRODUCT_IDS[currency] or DODO_PRODUCT_ID
    try:
        if isinstance(provider, DodoProvider):
            url = provider.create_checkout(
                success_url=f"{APP_BASE_URL}/success",
                cancel_url=f"{APP_BASE_URL}/#pricing",
                product_id=product_id)
        else:
            url = provider.create_checkout(
                success_url=f"{APP_BASE_URL}/success",
                cancel_url=f"{APP_BASE_URL}/#pricing")
        return {"url": url, "provider": provider.name, "currency": currency}
    except ProviderNotConfigured as e:
        return JSONResponse({"error": str(e)}, status_code=503)
    except ProviderError as e:
        return JSONResponse({"error": str(e)}, status_code=502)


@app.post("/api/webhook")
async def webhook(request: Request):
    """Single webhook endpoint for every provider.

    Dodo: native Dodo webhook, verified with the Standard Webhooks scheme
        (DODO_PAYMENTS_WEBHOOK_SECRET). Subscribe the endpoint to
        'payment.succeeded' in the Dodo dashboard.
    Stripe: native Stripe webhook (verified with STRIPE_WEBHOOK_SECRET).
    Paddle/Gumroad: signed JSON, see GenericHmacProvider docstring + README.

    Completed payments mint a GJK license key idempotently keyed on the
    provider's order/payment id.
    """
    try:
        event = await provider.parse_webhook(request)
    except ProviderNotConfigured as e:
        return JSONResponse({"error": str(e)}, status_code=500)
    except ProviderError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    if event:
        store_license(email=event.email, key=generate_license_key(),
                      provider=provider.name, external_id=event.external_id)
    return {"received": True}


@app.get("/api/license-by-order")
def license_by_order(order_id: str = ""):
    """Lets the generic-provider success page fetch the freshly minted key
    (order ids are provider-generated random strings)."""
    if not order_id:
        return JSONResponse({"error": "missing order_id"}, status_code=400)
    lic = get_license_by_external_id(order_id)
    if not lic:
        return JSONResponse({"error": "not ready yet"}, status_code=404)
    return {"key": lic.license_key}


@app.get("/api/me")
def me(request: Request):
    return {"unlocked": cookie_grants_access(request.cookies.get(COOKIE_NAME)),
            "dev_bypass": DEV_BYPASS_PAYWALL,
            "provider": provider.name}


@app.post("/api/verify")
async def verify_license(request: Request):
    """Generic license check — works for keys issued after a purchase
    through ANY provider, since the app mints and owns the keys."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid request."}, status_code=400)
    key = (body.get("key") or "").strip().upper()
    lic = get_license(key)
    if not lic:
        return JSONResponse({"error": "That license key was not found. "
                                      "Check it and try again."}, status_code=401)
    resp = JSONResponse({"ok": True})
    resp.set_cookie(COOKIE_NAME, make_cookie_value(key), httponly=True,
                    samesite="lax", max_age=5 * 365 * 24 * 3600, path="/")
    return resp


def _success_page_inner(body_html: str, key: str | None) -> HTMLResponse:
    page = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Payment successful — Global Job Kit</title>
<link rel="stylesheet" href="/css/style.css"></head>
<body><div class="wrap narrow">
<header class="topbar"><a class="brand" href="/">Global <span>Job Kit</span></a></header>
<main class="card center">
<h1>Payment successful</h1>
{body_html}
</main></div>
<script>
function copyKey(k) {{ navigator.clipboard.writeText(k); }}
</script>
</body></html>"""
    resp = HTMLResponse(page)
    if key:
        resp.set_cookie(COOKIE_NAME, make_cookie_value(key), httponly=True,
                        samesite="lax", max_age=5 * 365 * 24 * 3600, path="/")
    return resp


@app.get("/success", response_class=HTMLResponse)
def success(session_id: str = "", order_id: str = "", payment_id: str = ""):
    """Post-payment landing.

    Stripe: ?session_id= — verified server-side via the Stripe API.
    Dodo: ?payment_id= (appended by Dodo to the return_url) — the page polls
        /api/license-by-order until Dodo's payment.succeeded webhook has
        minted the key.
    Paddle/Gumroad: ?order_id= — the page polls /api/license-by-order until
        the provider's webhook has minted the key.
    """
    if provider.name == "stripe":
        if not session_id:
            return RedirectResponse("/", status_code=302)
        try:
            event = provider.retrieve_paid_session(session_id)
        except ProviderError as e:
            return HTMLResponse(
                f"<h1>Payment issue</h1><p>{html.escape(str(e))}</p>",
                status_code=402)
        lic = get_license_by_external_id(event.external_id)
        if not lic:  # webhook may not have fired yet — mint idempotently
            lic = store_license(email=event.email,
                                key=generate_license_key(),
                                provider="stripe",
                                external_id=event.external_id)
        key = html.escape(lic.license_key)
        body = f"""
<p class="muted">Your lifetime access is unlocked on this device. Save your license key — it also unlocks the tools on any other device.</p>
<div class="keybox">{key}</div>
<button class="btn" onclick="copyKey('{key}');this.textContent='Copied!'">Copy key</button>
<p><a class="btn primary" href="/app">Open your tools →</a></p>
<p class="muted small">A receipt was emailed by the payment provider.</p>"""
        return _success_page_inner(body, lic.license_key)

    # Dodo (default) and other non-Stripe providers
    oid = html.escape(payment_id or order_id)
    body = f"""
<p class="muted">Your license key is being generated. It will appear below automatically — no need to refresh.</p>
<div class="keybox" id="keybox">waiting for payment confirmation…</div>
<p><a class="btn primary" id="openTools" href="/app" style="display:none">Open your tools →</a></p>
<p class="muted small">Paid but no key after a minute? The payment webhook may still be delivering — you can also <a href="/unlock">unlock with your key</a> once you receive it.</p>
<script>
const orderId = "{oid}";
async function poll() {{
  if (!orderId) {{ document.getElementById('keybox').textContent = 'Missing order reference.'; return; }}
  try {{
    const r = await fetch('/api/license-by-order?order_id=' + encodeURIComponent(orderId));
    if (r.ok) {{
      const d = await r.json();
      document.getElementById('keybox').textContent = d.key;
      // verify to set the unlock cookie, then show the button
      const v = await fetch('/api/verify', {{method:'POST', headers:{{'Content-Type':'application/json'}}, body: JSON.stringify({{key: d.key}})}});
      if (v.ok) document.getElementById('openTools').style.display = 'inline-block';
      return;
    }}
  }} catch (e) {{}}
  setTimeout(poll, 3000);
}}
poll();
</script>"""
    return _success_page_inner(body, None)
