# Stripe bootstrap (R7) — 2026-08-18

No keys in this file.

## What goes where

| Key | Prefix | Where |
|-----|--------|--------|
| Restricted or secret API key | `rk_` preferred / `sk_` | `.env` as `STRIPE_SECRET_KEY` **only**. Never in the app binary. |
| Publishable key | `pk_` | Optional this week (`EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`). Needed only if we add Stripe.js / Payment Sheet later. |
| Checkout URL | `https://buy.stripe.com/…` | `.env` as `EXPO_PUBLIC_STRIPE_CHECKOUT_URL`. This **is** what the app opens from Profile → Company plan. |

## Catalog (R6)

One Product per plan (Stripe rule). Monthly Prices:

- Taskr Growth — US$19.99 (`taskr_growth_monthly`) — **CTA Payment Link** + 30-day trial
- Taskr Unlimited — US$199.99 (`taskr_unlimited_monthly`)
- Taskr Worker pack (+5) — US$4.99 (`taskr_worker_pack_monthly`)
- Taskr PM seat (+1) — US$9.99 (`taskr_pm_seat_monthly`)

## Command

```bash
# After adding STRIPE_SECRET_KEY to .env (do not paste keys in chat)
bash scripts/stripe/bootstrap-org-catalog.sh
```

Then restart Metro so Expo reloads `EXPO_PUBLIC_*`.

## Smoke (2026-08-18)

Henry (`henry@grandly.com`) → Profile → Company plan → test Payment Link. Transaction visible in Stripe Dashboard **Test mode**. Checkout stays on Stripe success page (no app return) — expected.

## Not this slice

Webhooks, Customer Portal, seat metering (R13), Stripe Tax until a registration is active.
