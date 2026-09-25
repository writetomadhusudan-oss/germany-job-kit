# Global Job Kit

A production web app for IT professionals applying for jobs in Germany, France, Canada, Australia, the UK, and the Netherlands.
Regional one-time pricing, lifetime access: **€5.99 (Europe) · £4.99 (UK) · CAD 7.99 (Canada) · AUD 8.99 (Australia) · ₹499 (India)**.

**Tools (all behind the paywall at `/app`):**

- **CV / resume builders** — country-correct layouts (German Lebenslauf, French CV, Canadian/Australian/UK/Dutch formats), ATS-safe, live A4 preview, print-to-PDF
- **Cover-letter generators** — per-country business-letter conventions with PDF export
- **Visa eligibility checkers** — Chancenkarte & EU Blue Card (Germany), Passeport Talent & EU Blue Card (France), Express Entry CRS (Canada), SkillSelect (Australia), Skilled Worker (UK), Highly Skilled Migrant & EU Blue Card (Netherlands)
- **Application tracker** — shared across all six countries, localStorage CRUD with CSV export
- **Country guides** — hiring, CV/ATS, visa routes, interviews, salary, relocation for each market

**Stack:** FastAPI + static vanilla HTML/CSS/JS · SQLite (dev) / PostgreSQL (prod via `DATABASE_URL`) · Docker-ready.

> **Visa figures disclaimer:** the eligibility checkers are general information only, not legal advice. Thresholds change — always re-check current figures at official sources such as [make-it-in-germany.com](https://www.make-it-in-germany.com).

---

## Quick start (local)

```bash
cd germany-job-kit
cp .env.example .env
# edit .env (at minimum: PAYMENT_PROVIDER=dodo + Dodo keys, or set
# DEV_BYPASS_PAYWALL=true to click through the app without paying)
pip install -r backend/requirements.txt
uvicorn backend.app:app --reload --port 8000
```

Open http://localhost:8000. With `DEV_BYPASS_PAYWALL=true`, `/app/*` opens without a license (local testing only — never in production).

---

## Choosing a payment provider (for Indian sellers)

**Dodo Payments is the default** (`PAYMENT_PROVIDER=dodo`).

Why Dodo first for this product: the seller lives in India with an Indian bank account, and the product is a €5.99 digital sale to buyers in the EU. Dodo Payments is a **merchant of record** (MoR) built for exactly this — it handles EU digital VAT/GST collection and remittance, global cards, UPI and other local methods, so the seller doesn't carry the EU VAT compliance burden themselves. Signup and verification are designed for Indian individual sellers (name matching PAN, Indian phone OTP).

Alternatives:

- **Paddle** — also a merchant of record; higher fees, more enterprise-oriented onboarding.
- **Gumroad** — merchant of record with very simple setup, but higher fees and less control over checkout/tax invoices.
- **Stripe** — kept as a native integration in this codebase (`PAYMENT_PROVIDER=stripe`), but **Stripe India is invite-only for new merchants as of 2026**, so a new Indian seller generally cannot onboard. Only choose this if you already have an active Stripe account.
- **Razorpay** — supports cards/UPI and is popular in India, but it is **not** a merchant of record: EU digital VAT obligations stay with the seller. Not integrated here for that reason.

## Dodo Payments (default) — exact setup steps

1. **Sign up** at [dodopayments.com](https://dodopayments.com) and open the dashboard at [app.dodopayments.com](https://app.dodopayments.com).
2. **Verify as an individual seller.** Complete KYC in the dashboard: name matching your **PAN**, Indian phone **OTP** verification, and add your Indian **bank account** for payouts. Paid checkout stays disabled until verification is complete — use **test mode** meanwhile.
3. **Create the five regional products.** Dashboard → **Products** → create five **one-time** products (each issues the same Global Job Kit license; the buyer picks their region on the sales page):
   - Name: `Global Job Kit — Lifetime Access` in each case
   - **EUR** — €5.99 (Europe) → `DODO_PRODUCT_ID_EUR`
   - **CAD** — CAD 7.99 (Canada) → `DODO_PRODUCT_ID_CAD`
   - **AUD** — AUD 8.99 (Australia) → `DODO_PRODUCT_ID_AUD`
   - **GBP** — £4.99 (UK) → `DODO_PRODUCT_ID_GBP`
   - **INR** — ₹499 (India) → `DODO_PRODUCT_ID_INR`
   - Copy each product id — they look like `pdt_...`.
4. **Copy API keys into env.** Dashboard → **Developer → API**: create an API key (use a test key while testing), then set in your `.env`:
   ```env
   PAYMENT_PROVIDER=dodo
   DODO_PAYMENTS_API_KEY=<your key>
   DODO_PRODUCT_ID_EUR=<pdt_... for the €5.99 product>
   DODO_PRODUCT_ID_CAD=<pdt_... for the CAD 7.99 product>
   DODO_PRODUCT_ID_AUD=<pdt_... for the AUD 8.99 product>
   DODO_PRODUCT_ID_GBP=<pdt_... for the £4.99 product>
   DODO_PRODUCT_ID_INR=<pdt_... for the ₹499 product>
   DODO_PAYMENTS_ENVIRONMENT=test_mode   # switch to live_mode when going live
   DODO_PAYMENTS_WEBHOOK_SECRET=<from step 5>
   APP_BASE_URL=https://YOUR-APP-DOMAIN   # your deployed domain
   ```
5. **Configure the webhook.** Dashboard → **Developer → Webhooks** → add endpoint:
   - URL: `https://YOUR-APP-DOMAIN/api/webhook`
   - Subscribe to at least **`payment.succeeded`**
   - Copy the **webhook secret** into `DODO_PAYMENTS_WEBHOOK_SECRET`.
   
   Dodo signs webhooks with the [Standard Webhooks](https://www.standardwebhooks.com) scheme (`webhook-id`, `webhook-signature`, `webhook-timestamp` headers). This app verifies them with the official `dodopayments[webhooks]` SDK.
6. **Test with a sandbox purchase.** Keep `DODO_PAYMENTS_ENVIRONMENT=test_mode`, click *Buy now* on your site, and pay with Dodo's test card (`4242 4242 4242 4242`, any future expiry, any CVC). Dodo redirects back to `/success?payment_id=...&status=...`, the `payment.succeeded` webhook fires, the app mints a `GJK-XXXX-XXXX-XXXX` license key (idempotent on Dodo's `payment_id`), and the success page picks it up automatically.
7. **Go live.** Finish verification, create the same €5.99 one-time product in **live mode**, set `DODO_PAYMENTS_ENVIRONMENT=live_mode`, swap in the **live** API key + live webhook secret, and re-run a real small test purchase. Never commit real keys to git — see `.gitignore`.

No-API-key fallback: if you only have a dashboard payment link (Dashboard → Products → share link, e.g. `https://checkout.dodopayments.com/buy/pdt_...` / `https://test.checkout.dodopayments.com/buy/pdt_...`), you can set it as `PROVIDER_CHECKOUT_URL` and the app will redirect buyers there instead of creating a checkout session. The webhook flow is unchanged.

### Dodo data flow (how the code uses it)

| Step | Dodo API / event | App code |
|---|---|---|
| Create checkout | `client.checkout_sessions.create(product_cart=[{product_id, quantity: 1}], return_url, minimal_address=True, metadata=…)` → `checkout_url` | `DodoProvider.create_checkout` in `backend/app.py` |
| Buyer returns | Dodo appends `?payment_id=…&status=…&email=…` to `APP_BASE_URL/success` | `/success` handler (dodo branch) polls `/api/license-by-order` |
| Payment confirmed | `payment.succeeded` webhook → verified via `client.webhooks.unwrap(...)` | `DodoProvider.parse_webhook` → `CompletedPayment(email, payment_id)` |
| License | App mints `GJK-XXXX-XXXX-XXXX`, idempotent on `payment_id` | `store_license(...)` |
| Unlock | `/api/verify` sets the signed HttpOnly cookie gating `/app/*` | `cookie_grants_access(...)` |

---

## Webhooks

Single endpoint: `POST /api/webhook`.

- **Dodo (default):** native Dodo webhook format (see the Dodo section above). Verified with the Standard Webhooks scheme; invalid signatures return `400`. Only `payment.succeeded` mints a license; other events are acknowledged without granting access.
- **Stripe:** native Stripe webhook, verified with `STRIPE_WEBHOOK_SECRET`.
- **Paddle / Gumroad:** this app does not parse their native webhook formats. Configure the provider (or a tiny adapter) to POST this normalized JSON, HMAC-signed:
  ```json
  {"event": "payment.completed", "email": "buyer@example.com",
   "order_id": "provider-order-id", "timestamp": 1727000000}
  ```
  Header: `X-Webhook-Signature: hex(HMAC-SHA256(PROVIDER_WEBHOOK_SECRET, raw_body))`.

Idempotency: licenses are stored with a unique `external_id` (Dodo `payment_id`, Stripe session id, or provider `order_id`), so duplicate webhook deliveries and race conditions never mint two keys for one payment.

## License keys

The **app issues and owns** its license keys (`GJK-XXXX-XXXX-XXXX`) for every provider — `/api/verify` accepts any key the app minted, so one key works on any device. Keys are random (no ambiguous characters) and the unlock cookie is HMAC-signed with `SECRET_KEY`. Dodo's own license-key feature is not used.

## API reference

| Method & path | Description |
|---|---|
| `GET /` | Landing / sales page |
| `GET /unlock` | License-key entry page |
| `GET /app`, `GET /app/{cv,cover-letter,chancenkarte,blue-card,tracker,guide}` | Paywalled tools (302 → `/unlock` when locked) |
| `POST /api/checkout` | Returns `{url, provider}` — 503 with setup guidance when the provider isn't configured |
| `POST /api/webhook` | Provider webhook receiver (mints license) |
| `GET /api/license-by-order?order_id=` | Success-page lookup of the freshly minted key |
| `POST /api/verify` | Validates a key, sets the unlock cookie |
| `GET /api/me` | `{unlocked, dev_bypass, provider}` |
| `GET /success` | Post-payment page: Stripe `?session_id=` verified server-side; Dodo `?payment_id=` / others `?order_id=` polled |

## Configuration

See `.env.example` for every variable. Key ones:

- `PAYMENT_PROVIDER` — `dodo` (default) | `stripe` | `paddle` | `gumroad`
- `DODO_PAYMENTS_API_KEY`, `DODO_PRODUCT_ID` (legacy single-product fallback), `DODO_PRODUCT_ID_EUR` / `_CAD` / `_AUD` / `_GBP` / `_INR` (regional one-time products), `DODO_PAYMENTS_ENVIRONMENT` (`test_mode`/`live_mode`), `DODO_PAYMENTS_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`
- `PROVIDER_CHECKOUT_URL`, `PROVIDER_WEBHOOK_SECRET` (Paddle/Gumroad; also a Dodo static-link fallback)
- `APP_BASE_URL`, `SECRET_KEY`, `DATABASE_URL`, `DEV_BYPASS_PAYWALL`

Never commit a real `.env` — `.gitignore` excludes it.

## Testing

```bash
python -m py_compile backend/app.py
# With DEV_BYPASS_PAYWALL=true you can click through every /app/* page.
# For payments: use Dodo test mode (DODO_PAYMENTS_ENVIRONMENT=test_mode)
# and the Dodo dashboard's webhook Testing tab, or its CLI trigger command,
# to fire a payment.succeeded event at /api/webhook.
```

The Dodo integration is covered against the official `dodopayments` Python SDK (v1.117.0, `[webhooks]` extra for signature verification), with checkout sessions created via `client.checkout_sessions.create` and webhooks verified via `client.webhooks.unwrap` per the Standard Webhooks spec.

## Deployment notes

- Set `DATABASE_URL` to PostgreSQL (e.g. `postgresql+psycopg2://…`) in production; SQLite is dev-only.
- Serve behind HTTPS (required for Dodo webhooks) and set `APP_BASE_URL` to the public domain.
- Generate a strong `SECRET_KEY`: `python -c "import secrets; print(secrets.token_hex(32))"`.

## Email delivery (v1 gap)

v1 shows the license key on the success page only — no emails are sent. To add email delivery later, hook into `store_license()` in `backend/app.py` (called exactly once per completed payment, idempotently) and send the key to `CompletedPayment.email` via your provider (e.g. the Resend/SendGrid connector in the Dodo dashboard, or any transactional email service).
