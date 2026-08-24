# NOW — session continuity

**SOP:** git-tracked NOW + **full cycle** in `~/.cursor/skills/solo-dev-harness/SOP.md`.

---

## Doing

**TF 193:** local build + EAS submit **done** — IPA `.eas/artifacts/build-1787544782036.ipa`. Wait ASC processing → install **193**; smoke signup → Company Plan + HKD prices. Do not tick Public.

**Edge:** `create-checkout-session` still needs `supabase login` + deploy for HKD Checkout charge path.

## Next (definitive — locked master plan)

1. Install **TF 193**; smoke signup → Company Plan + HKD prices
2. Deploy `create-checkout-session` when CLI auth available
3. **M-AUTHZ-02** after billing smoke
4. **M-AI-01** / Wave 2 per locked spine

**Parked for now:** **M-BILL-F**; **M-BILL-01G** display-only FX (next billing slice).

## Recently closed

**M-BILL-01 HKD Phase 1+2 (2026-08-24):** signup → Company Plan; checkout return highlight; HKD Stripe catalog + DB meters; dynamic catalog fetch. Commit `5f6b55d` + follow-up dynamic catalog.

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
- Owner KPI v2 → **M-OPS-03 Owner Admin app**
- Owner tenant writes, feedback inbox, BYO storage

---

Updated: 2026-08-24
