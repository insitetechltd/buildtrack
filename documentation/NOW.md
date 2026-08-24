# NOW — session continuity

**SOP:** git-tracked NOW + **full cycle** in `~/.cursor/skills/solo-dev-harness/SOP.md`.

---

## Doing

**RC gate `M-AUTHZ-RC`:** host-company user/project/assignment contract — **this commercial RC**, not AUTHZ-02. App-side landed (Jest 38/38); headed Add Member / Assign / Edit Lead PM smoke remaining. SoT: `docs/superpowers/plans/2026-08-24-company-user-project-model.md`.

**TF 195 crash (fixed, unreleased):** returning from Stripe checkout aborted the app (`RCTFatal`). Cause: Company Plan rendered limit rows while `catalog` was still null (`catalog?.metersBySlug[slug]`). Needs next TF after this commit.

**Company Plan add-ons:** PM seat + worker pack steppers shipped app-side + `update-company-addons` Edge; webhook now merges base+addon meters. Edge deployed 2026-08-24.

**TF 194/195:** catalog-driven Company Plan already on TestFlight. Add-ons + crash fix are **not** in a TF build yet.

**Edge:** billing functions **deployed 2026-08-24** (`create-checkout-session`, `stripe-webhook`, `invite-user`/`invite-open`, `update-company-addons`) + HKD catalog sync OK.

## Next (definitive — locked master plan)

1. **M-AUTHZ-RC close:** headed smoke of the three admin assignment surfaces
2. Next TF: add-on steppers + Company Plan null-catalog crash fix; smoke checkout return + add-on +/−
3. **M-AUTHZ-02** after RC (liaison / project invite / host-absorb)
4. **M-AI-01** — **planning gate first** (`docs/superpowers/plans/2026-08-24-m-ai-01-query-gateway-planning-brief.md`); then Wave 2 per spine

**Parked for now:** **M-BILL-F**; **M-BILL-01G** display-only FX (next billing slice); **M-AI-01 build** (options/economics doc above — no code until checklist GO).

## Recently closed

**M-BILL-01 catalog dynamism (2026-08-24):** Company Plan cards/prices/caps/currency from `plan_prices` + `meter_definitions`; checkout pins `planPriceId`; webhook trial meters from catalog; invite seat caps from snapshot. Ops: `documentation/billing-catalog-ops-runbook.md`. Edge deploy + HKD sync applied.

**M-BILL-01 HKD Phase 1+2 (2026-08-24):** signup → Company Plan; checkout return highlight; HKD Stripe catalog + DB meters. Commits `5f6b55d` / `40ff9ec`. TF **193**.

**M-BILL-01 BILL-D/E Closed (2026-08-23):** Company Plan screen; checkout Edge; invite-user caps. TF **192**.

**M-OPS-02 Closed (2026-08-22):** commit `e3eeb6d`.

## Locked

- **Master plan:** `docs/superpowers/plans/2026-08-22-master-plan-parallel.md` (**LOCKED**)
- **HK billing:** charge HKD; dynamic catalog; **no grandfathering** (all test); display FX = **M-BILL-01G tabled** — `docs/superpowers/plans/2026-08-24-billing-hkd-pricing-lock.md`
- **Spine:** OPS-01 v1 ✓ → OPS-02 ✓ → **M-BILL-01** + **M-AUTHZ-RC (this RC)** → **M-AUTHZ-02** → AI-01 → Wave 2
- **Frozen:** KPI v2 apply, Wave 2 web, **new owner modules in Taskr** (→ **M-OPS-03**)
- No service-role in mobile; no company switch

## Parked

- **M-BILL-01G** — display-only FX (view other currencies; charge HKD; no VAT)
- **M-BILL-F** — usage gates / hard enforcement
- **M-AI-01 implementation** — deferred until planning brief checklist complete (`docs/superpowers/plans/2026-08-24-m-ai-01-query-gateway-planning-brief.md`)
- Owner KPI v2 → **M-OPS-03 Owner Admin app**
- Owner tenant writes, feedback inbox, BYO storage

---

Updated: 2026-08-24
