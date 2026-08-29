# Prod vs Dev Supabase split (pre-commercial RC)

**Date:** 2026-08-26  
**Status:** **Phases A–C Closed (2026-08-29)** — empty PROD live; migrations + Edge on PROD; EAS preview→DEV / production→PROD. Phase D (live Stripe) = App Store submit gate, not this close.  
**Why now:** Test tenants + Stripe test ops clutter the only DB; commercial RC needs an isolated production tenant plane.

### Decisions locked (2026-08-26)

| Decision | Lock |
|---|---|
| Project roles | **Current Supabase = DEV**; **new empty project = PROD** |
| Stripe live | **Only at App Store submit** — until then PROD Edge stays unwired or `sk_test` for plumbing checks only |
| TestFlight ↔ DB | Daily TF = **DEV**; PROD not used for dogfood (see policy) |

---

## TestFlight policy (recommendation — locked)

**Your concern is correct:** TestFlight → PROD means every tap creates **prod DB rows**, even if Stripe is still test mode. Fake payments ≠ disposable data.

| Build | Points at | Stripe | Purpose |
|---|---|---|---|
| Local / simulator / EAS `preview` + **internal TestFlight** | **DEV** | `sk_test` | Daily RC, Maestro, billing experiments, junk OK |
| EAS `production` → **App Store** | **PROD** | **`sk_live` at submit** | Real customers |
| Optional: **one** pre-submit PROD smoke | **PROD** | still `sk_test` or checkout off | Create Company **once** as Tristan founding CA — intentional seed only |

**Rules**

1. **Default TestFlight = DEV.** Do not dogfood PROD.  
2. **No Maestro / clearState / sim-user factories against PROD.**  
3. PROD may sit **empty** for weeks (migrations + Edge only).  
4. Pre-submit PROD UX check (optional): one real founding CA, then **stop**. Not Death Star / Stark.  
5. **App Store submit:** live Stripe secrets + live HKD catalog + webhook on PROD → rebuild `production`. No DEV→PROD data copy.

No third “staging” project unless DEV becomes unusable.

---

## Topology

```text
DEV (current project)              PROD (new empty)
  Stripe test                        Stripe live @ App Store submit only
  Local + simulator + internal TF      App Store (+ optional one-shot smoke)
  Maestro / junk OK                  Empty or single founding CA
```

---

## What duplicates per environment

| Asset | Dev | Prod |
|---|---|---|
| Supabase project | **current** | **new** |
| Migrations | iterate | apply on create + each release (Human Gate) |
| Edge Functions | deploy to dev ref | deploy to prod ref |
| Edge Stripe secrets | `sk_test` | `sk_live` **only at submit** |
| App env | local `.env` + EAS preview | EAS `production` secrets |
| Storage `buildtrack-files` | yes | yes (empty) |
| Tenant purge (M-OPS-03 §3e) | allowed | Human Gate / off by default |

---

## Cutover checklist

### A — Projects
- [x] Decision: current = DEV, new = PROD  
- [x] Create `insite-prod`; store URL/anon/service role in password manager (not git) — **2026-08-29** ref `jcnzjigxgkzhjsaekoqz` (ap-south-1); local secrets in gitignored `.cache/env-cutover/insite-prod.env.local`  
- [x] Label Dashboard: rename `buildtrack-production` display → `insite-dev` (user confirmed 2026-08-29); PROD named `insite-prod`  

### B — PROD schema + Edge (no live Stripe yet)
- [x] Apply `supabase/migrations` to PROD (2026-08-29) via `scripts/supabase/apply-migrations-to-project.sh` + pooler `aws-0-ap-south-1`; skipped DRAFT/ROLLBACK/`20260825000600` on_hold drop; dual-path seat triggers for greenfield `system_permission`  
- [x] Deploy: create-checkout-session, stripe-webhook, invite-user, invite-open, update-company-addons → PROD (`scripts/supabase/deploy-edge-to-project.sh --project-ref`)  
- [x] Edge secrets: `BILLING_CURRENCY=hkd` + checkout deep links; Stripe **omitted** until App Store submit  
- [x] Storage bucket `buildtrack-files` public=false + policies (from migrations)  

### C — App builds
- [x] EAS `preview` / `simulator` / **`production-local`** → EAS env **`preview`** → **DEV** URL (explicit in `eas.json`)  
- [x] EAS **`production`** → EAS env **`production`** → **PROD** URL  
- [x] Sync: `bash scripts/eas/sync-supabase-env-to-eas.sh` (2026-08-29)  
- [x] Deploy scripts require `--project-ref` (or `--use-env` DEV-only): see `scripts/supabase/_resolve_project_ref.sh`  
- [x] Promotion runbook: `documentation/PROD_DEV_PROMOTION.md`  

### D — App Store submit (later)
- [ ] Live HKD catalog bootstrap + `plan_prices` livemode=true on PROD  
- [ ] `sk_live` + live webhook secret on PROD Edge  
- [ ] Stripe Dashboard webhook → PROD function URL  
- [ ] Rebuild/submit `production`  

**Operator checklist (2026-08-29):** `docs/superpowers/plans/2026-08-29-env01-phase-d-app-store-checklist.md`

### E — Ops hygiene
- [x] Runbooks: dual-project + promotion path (`documentation/PROD_DEV_PROMOTION.md`)  
- [x] Maestro/CI: **DEV only** (policy locked; never clearState against PROD)  

---

## Effort reminder

Empty PROD + Edge (no live Stripe): ~**1 day**. Live Stripe at submit: ~**+0.5 day**.

---

## Out of scope

- Git repo fork  
- Migrating DEV tenants into PROD  
- Building M-OPS-03 UI now  

## Related

- Tenant purge: M-OPS-03 Owner management interface §3e  
- `documentation/billing-catalog-ops-runbook.md`  
- Danger gates: no live schema/Stripe without Human GO  
