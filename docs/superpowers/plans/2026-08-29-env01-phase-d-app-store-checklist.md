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

- [x] Confirm PROD ref `jcnzjigxgkzhjsaekoqz` healthy; anon REST denied on tasks (401)
- [x] Confirm EAS env: `production` → PROD host; `preview` → DEV
- [x] Confirm `eas.json`: profile **`production`** → `"environment": "production"`; **`production-local`** → `"preview"` (DEV)
- [x] PROD service role + DB password in `.cache/env-cutover/insite-prod.env.local` (gitignored)
- [ ] Apple: ASC app `6754898737`, privacy policy URL, screenshots / metadata ready
- [ ] Optional: one-shot PROD founding-CA smoke — skip until live Checkout works

**Human GO:** 2026-08-29 (this chat). Stripe MCP **livemode** authorized.

---

## Checklist D1 — Live catalog on PROD

- [x] Create Stripe **live** HKD Products/Prices (Starter HK$160 / Pro HK$400 + worker/PM add-ons) via MCP livemode
- [x] Upsert `plan_prices` / meters on PROD with **`livemode=true`** (4 sellable HKD; USD live sellable deprecated)
- [x] Verify sellable rows: 16000 / 40000 / 2000 / 10000 cents HKD

---

## Checklist D2 — Live Stripe on PROD Edge

- [x] Live webhook endpoint → `https://jcnzjigxgkzhjsaekoqz.supabase.co/functions/v1/stripe-webhook` (`we_1U9h2y…`)
- [x] `STRIPE_WEBHOOK_SECRET` + `BILLING_CURRENCY=hkd` + checkout URL secrets set on PROD (secret in `.cache/env-cutover/insite-prod-stripe.env.local`)
- [x] Edge redeployed: `deploy-edge-to-project.sh --project-ref jcnzjigxgkzhjsaekoqz`
- [ ] **`STRIPE_SECRET_KEY=sk_live_…`** on PROD Edge — **blocked** (MCP OAuth cannot export API keys)
  - Add `STRIPE_SECRET_KEY=sk_live_…` to `.cache/env-cutover/insite-prod-stripe.env.local`
  - Then: `APP_STORE_STRIPE_GO=1 STRIPE_ENV_FILE=.cache/env-cutover/insite-prod-stripe.env.local bash scripts/supabase/sync-stripe-secrets.sh --project-ref jcnzjigxgkzhjsaekoqz`
- [ ] Smoke (PROD, careful): Checkout Starter once as founding CA → webhook writes entitlements

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
