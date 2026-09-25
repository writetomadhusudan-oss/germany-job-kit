# Deploying Global Job Kit v2

## 1. Push to GitHub

Upload the contents of `global-job-kit-v2.zip` to the existing
`germany-job-kit` repository (replace all files). Render auto-deploys
from the repo — give it ~3 minutes after the push.

Verify: `https://careerkit.mindnspace.com/` should show the new
"Global Job Kit — Land your IT job abroad, in six countries." landing
page with six country sections and five region buttons.

## 2. After Dodo approves your account

Create 5 one-time products (all grant the same Global Job Kit license):

| Product | Price |
|---|---|
| Global Job Kit — EUR | €5.99 |
| Global Job Kit — GBP | £4.99 |
| Global Job Kit — CAD | CAD 7.99 |
| Global Job Kit — AUD | AUD 8.99 |
| Global Job Kit — INR | ₹499 |

Set the webhook: `https://careerkit.mindnspace.com/api/webhook`
(event: `payment.succeeded`).

Add to Render environment (same service):

- `DODO_API_KEY`, `DODO_WEBHOOK_SECRET`
- `DODO_PRODUCT_ID_EUR`, `DODO_PRODUCT_ID_GBP`, `DODO_PRODUCT_ID_CAD`,
  `DODO_PRODUCT_ID_AUD`, `DODO_PRODUCT_ID_INR`

Then test in Dodo test mode: checkout (any region) → payment →
redirect to `/success` → license issued → unlock at `/unlock` →
all six country tabs open.

## 3. Do NOT change

- The `www.mindnspace.com` book site (separate Hostinger hosting).
- Existing `careerkit` CNAME DNS record.
