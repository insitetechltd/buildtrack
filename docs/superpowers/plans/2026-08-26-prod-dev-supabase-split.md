# Prod vs Dev Supabase split (pre-commercial RC)

**Date:** 2026-08-26  
**Status:** **Decisions locked** (2026-08-26 evening) — execute create when operator starts cutover  
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
- [ ] Create `insite-prod`; store URL/anon/service role in password manager (not git)  
- [ ] Label Dashboard: `insite-dev` / `insite-prod`  

### B — PROD schema + Edge (no live Stripe yet)
- [ ] Apply `supabase/migrations` to PROD  
- [ ] Deploy: create-checkout-session, stripe-webhook, invite-user, invite-open, update-company-addons  
- [ ] Edge secrets: trial/currency as needed; Stripe **test or omit** until submit  
- [ ] Storage bucket + policies  

### C — App builds
- [ ] EAS preview/simulator → **DEV** URL (explicit)  
- [ ] EAS production → **PROD** URL (set when first store/RC build; not for daily TF)  
- [ ] Deploy scripts require `--project-ref` (no silent `.env` → wrong plane)  

### D — App Store submit (later)
- [ ] Live HKD catalog bootstrap + `plan_prices` livemode=true on PROD  
- [ ] `sk_live` + live webhook secret on PROD Edge  
- [ ] Stripe Dashboard webhook → PROD function URL  
- [ ] Rebuild/submit `production`  

### E — Ops hygiene
- [ ] Runbooks: dual-project placeholders  
- [ ] Maestro/CI: **DEV only**  

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
