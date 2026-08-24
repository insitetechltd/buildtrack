# NOW — session continuity

**SOP:** git-tracked NOW + **full cycle** in `~/.cursor/skills/solo-dev-harness/SOP.md`.

---

## Doing

**TF 194:** local iOS build + EAS submit in progress. Includes catalog-driven Company Plan (N tiers, meters, currency) + `planPriceId` checkout pin + hard signup plan gate.

**Edge:** billing functions **deployed 2026-08-24** (`create-checkout-session`, `stripe-webhook`, `invite-user`/`invite-open`) + HKD catalog sync OK.

## Next (definitive — locked master plan)

1. Wait ASC processing → install **TF 194**; smoke signup → locked Company Plan until Subscribe; HKD prices from catalog
2. **M-AUTHZ-02** after billing smoke
3. **M-AI-01** — **planning gate first** (`docs/superpowers/plans/2026-08-24-m-ai-01-query-gateway-planning-brief.md`); then Wave 2 per spine

**Parked for now:** **M-BILL-F**; **M-BILL-01G** display-only FX (next billing slice); **M-AI-01 build** (options/economics doc above — no code until checklist GO).

## Recently closed

**M-BILL-01 catalog dynamism (2026-08-24):** Company Plan cards/prices/caps/currency from `plan_prices` + `meter_definitions`; checkout pins `planPriceId`; webhook trial meters from catalog; invite seat caps from snapshot. Ops: `documentation/billing-catalog-ops-runbook.md`. Edge deploy + HKD sync applied.

**M-BILL-01 HKD Phase 1+2 (2026-08-24):** signup → Company Plan; checkout return highlight; HKD Stripe catalog + DB meters. Commits `5f6b55d` / `40ff9ec`. TF **193**.

**M-BILL-01 BILL-D/E Closed (2026-08-23):** Company Plan screen; checkout Edge; invite-user caps. TF **192**.

**M-OPS-02 Closed (2026-08-22):** commit `e3eeb6d`.

## Locked

- **Master plan:** `docs/superpowers/plans/2026-08-22-master-plan-parallel.md` (**LOCKED**)
- **HK billing:** charge HKD; dynamic catalog; **no grandfathering** (all test); display FX = **M-BILL-01G tabled** — `docs/superpowers/plans/2026-08-24-billing-hkd-pricing-lock.md`
- **Spine:** OPS-01 v1 ✓ → OPS-02 ✓ → **M-BILL-01** → RC → **M-AUTHZ-02** → AI-01 → Wave 2
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
