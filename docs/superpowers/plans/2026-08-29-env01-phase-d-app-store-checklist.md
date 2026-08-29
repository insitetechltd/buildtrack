# ENV-01 Phase D — App Store submit + Stripe live on PROD

**Date:** 2026-08-29  
**Prereq:** M-OPS-ENV-01 Phases A–C **Closed** (`a0697e4`). PROD empty + schema + Edge; daily TF → DEV.  
**Authority:** Human GO before any `sk_live` / live webhook / App Store submit.  
**SoT topology:** `documentation/PROD_DEV_PROMOTION.md` · plan `2026-08-26-prod-dev-supabase-split.md` § D

---

## Goal

Ship the first **App Store** binary that talks to **PROD** Supabase with **live** Stripe (HKD), without dogfooding PROD via daily TestFlight.

---

## Pre-flight (before touch Stripe live)

- [x] Confirm PROD ref `jcnzjigxgkzhjsaekoqz` healthy; anon REST denied on tasks (401); plan_prices table present (seed USD rows only — HKD live pending)
- [x] Confirm EAS env: `production` → `https://jcnzjigxgkzhjsaekoqz.supabase.co`; `preview` → DEV
- [x] Confirm `eas.json`: profile **`production`** → `"environment": "production"`; **`production-local`** → `"preview"` (DEV)
- [x] PROD service role + DB password in `.cache/env-cutover/insite-prod.env.local` (gitignored)
- [ ] Apple: ASC app `6754898737`, privacy policy URL, screenshots / metadata ready
- [ ] Optional: one-shot PROD founding-CA smoke with **test** Stripe still OK — or skip until live

**Human GO:** 2026-08-29 (this chat).

**Blocked (need from operator):** Stripe **live** `sk_live_…` + live webhook `whsec_…` (local `.env` is `sk_test` only; Stripe MCP connected in test mode only). Put live keys in gitignored `.cache/env-cutover/insite-prod-stripe.env.local` then continue D1–D2.

---

## Checklist D1 — Live catalog on PROD

- [ ] Create/verify Stripe **live** HKD Products/Prices (Starter HK$160 / Pro HK$400 + add-ons) — charge **HKD only**
- [ ] Bootstrap `plan_tiers` / `plan_prices` / meters on PROD with **`livemode=true`** (do not copy DEV test-mode `stripe_price_id` blindly)
- [ ] Sync script against PROD DB (or documented SQL) — see `documentation/billing-catalog-ops-runbook.md`
- [ ] Verify sellable rows: Company Plan would show correct HKD amounts if pointed at PROD

---

## Checklist D2 — Live Stripe on PROD Edge

- [ ] Set PROD Edge secrets (explicit `--project-ref jcnzjigxgkzhjsaekoqz`):
  - `STRIPE_SECRET_KEY=sk_live_…`
  - `STRIPE_WEBHOOK_SECRET=whsec_…` (from live endpoint)
  - Keep `BILLING_CURRENCY=hkd` + checkout deep links
- [ ] Stripe Dashboard → **live** webhook → `https://jcnzjigxgkzhjsaekoqz.supabase.co/functions/v1/stripe-webhook`
  - Events: subscription + invoice family used by `stripe-webhook` today
- [ ] Redeploy Edge on PROD after secrets:  
  `bash scripts/supabase/deploy-edge-to-project.sh --project-ref jcnzjigxgkzhjsaekoqz`
- [ ] Smoke (PROD, careful): Checkout Starter once as founding CA → webhook writes entitlements → cancel/refund policy understood

**Guard:** `sync-stripe-secrets.sh` refuses `sk_live` → PROD unless `APP_STORE_STRIPE_GO=1`.

---

## Checklist D3 — App Store binary

- [ ] `eas build --profile production` (or cloud equivalent) — **not** `production-local`
- [ ] Confirm build logs show PROD Supabase host (not `zusulknbhaumougqckec`)
- [ ] Submit to App Store Connect / review
- [ ] Keep daily internal TF on **`production-local`** → DEV forever for junk/Maestro

---

## Checklist D4 — After submit

- [ ] Monitor Stripe live webhook delivery + Edge logs on PROD
- [ ] Monitor Supabase PROD auth signups / RLS denials
- [ ] Update `documentation/NOW.md`: Phase D done; next **M-OPS-03**
- [ ] Do **not** point Maestro at PROD

---

## Explicit non-goals

- Migrating DEV tenants into PROD  
- Switching daily TF to PROD  
- M-BILL-F hard gates / M-BILL-01G FX  
- Privilege RLS apply (separate Human Gate, post-Store idle)

---

## Effort

~0.5–1 day if catalog + ASC assets ready. Stop for Human GO at D2 (`sk_live`) and D3 (submit).
