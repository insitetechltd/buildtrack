# ENV-01 Phase D — App Store submit + Stripe live on PROD

**Date:** 2026-08-29 · **Status update:** 2026-09-29 (Phase D **Closed**)  
**Prereq:** M-OPS-ENV-01 Phases A–C **Closed** (`a0697e4`). PROD empty + schema + Edge; daily TF → DEV.  
**Authority:** Human GO before any `sk_live` / live webhook / App Store submit.  
**SoT topology:** `documentation/PROD_DEV_PROMOTION.md` · plan `2026-08-26-prod-dev-supabase-split.md` § D  
**Listing paste:** `2026-09-01-asc-listing-paste.md`

---

## Status (2026-09-29)

**M-OPS-ENV-01 Phase D CLOSED.** Live Stripe Checkout on PROD + stripe-webhook v14 deployed. Current submission: Taskr **1.1.3 build 280** is **REJECTED / UNRESOLVED_ISSUES** (Guideline 2.1 — demo credentials). Resolution Center reply sent by Tristan after demo password reset. Awaiting Apple clearance. **Public listing remains off.**

---

## Goal

Ship the first **App Store** binary that talks to **PROD** Supabase with **live** Stripe (HKD), without dogfooding PROD via daily TestFlight.

---

## Pre-flight (before touch Stripe live)

- [x] Confirm PROD ref `jcnzjigxgkzhjsaekoqz` healthy; anon REST denied on tasks (401)
- [x] Confirm EAS env: `production` → PROD host; `preview` → DEV
- [x] Confirm `eas.json`: profile **`production`** → `"environment": "production"`; **`production-local`** → `"preview"` (DEV)
- [x] PROD service role + DB password in `.cache/env-cutover/insite-prod.env.local` (gitignored)
- [ ] Apple: ASC app `6754898737` — privacy/support URLs on GitHub Pages; **paste pack ready**; screenshots not yet in ASC UI
- [ ] Optional: one-shot PROD founding-CA smoke — skip until live Checkout works (**extra Human GO** before charging)

**Human GO:** 2026-08-29 (this chat). Stripe MCP **livemode** authorized.

---

## Checklist D1 — Live catalog on PROD ✅ COMPLETE

- [x] Create Stripe **live** HKD Products/Prices (Starter HK$160 / Pro HK$400 + worker/PM add-ons) via MCP livemode
- [x] Upsert `plan_prices` / meters on PROD with **`livemode=true`** (4 sellable HKD; USD live sellable deprecated)
- [x] Verify sellable rows: 16000 / 40000 / 2000 / 10000 cents HKD

---

## Checklist D2 — Live Stripe on PROD Edge ✅ COMPLETE

- [x] Live webhook endpoint → `https://jcnzjigxgkzhjsaekoqz.supabase.co/functions/v1/stripe-webhook` (`we_1U9h2y…`)
- [x] `STRIPE_WEBHOOK_SECRET` + `BILLING_CURRENCY=hkd` + checkout URL secrets set on PROD (secret in `.cache/env-cutover/insite-prod-stripe.env.local`)
- [x] Edge redeployed: `deploy-edge-to-project.sh --project-ref jcnzjigxgkzhjsaekoqz`
- [x] **`STRIPE_SECRET_KEY=sk_live_…`** on PROD Edge — synced 2026-08-30 (`APP_STORE_STRIPE_GO=1`)
- [x] `pk_live` on EAS `production` (catalog prefers live rows)
- [x] Edge redeployed after live secret sync
- [x] stripe-webhook v14 live on PROD (claim/retry hardening complete)

**Guard:** `sync-stripe-secrets.sh` refuses `sk_live` → PROD unless `APP_STORE_STRIPE_GO=1`.

---

## Checklist D3 — App Store binary ⚠️ REJECTED (awaiting Apple clearance)

- [x] Local production builds submitted: 243, 253-280 (see NOW.md session history)
- [x] Current submission: **Taskr 1.1.3 build 280** (v1.1.3)
- [x] ASC metadata pasted via Fastlane Deliver (EN + zh-Hant; 6.7" + 13" screenshots)
- [x] Submitted for Review 2026-09-27
- [x] **Status: REJECTED / UNRESOLVED_ISSUES** (Guideline 2.1 - demo login credentials)
- [x] Resolution Center reply sent by Tristan after demo password reset
- [ ] Awaiting Apple to clear rejection and re-review
- [x] Keep daily internal TF on **`dev`** / `production-local` -> DEV forever for junk/Maestro

---

---

## Checklist D4 — After submit ✅ COMPLETE

- [x] Monitor Stripe live webhook delivery + Edge logs on PROD (v14 deployed)
- [x] Monitor Supabase PROD auth signups / RLS denials (operational)
- [x] Do **not** point Maestro at PROD (standing law)

**Next (Human):** Await Apple Resolution Center response. Do not re-submit until Apple clears UNRESOLVED_ISSUES. Do not enable Public listing.

---

## Explicit non-goals

- Migrating DEV tenants into PROD  
- Switching daily TF to PROD  
- M-BILL-F hard gates / M-BILL-01G FX  
- Privilege RLS apply (separate Human Gate, post-Store idle)  
- Apple Individual → Organization conversion (GTM Gate 2)  
- New production binary for support-email constant (ships on the next `production` build; listing URLs already GitHub Pages)

---

## Effort

Listing paste is Human in ASC UI. Founding-CA Checkout smoke is Human + extra GO. Do not start another production EAS build unless 243 is rejected.
