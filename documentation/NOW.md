# NOW — session continuity

**SOP:** git-tracked NOW + **full cycle** in `~/.cursor/skills/solo-dev-harness/SOP.md`.

---

## Doing

**RC ship (2026-08-23):** Billing MVP + Company Plan landed locally; **commit + native rebuild + TestFlight submit** pending. TF **190** in review may predate billing — plan **191+** if ASC not yet public.

**Marketing site:** almost ready — uncommitted separately.

## Next (definitive — locked master plan)

1. **Ship commercial RC** — TestFlight / store path; marketing site if still gating
2. **M-AUTHZ-02** — multi-company project membership (liaison + project invite + host-absorb seats)
3. **M-AI-01** / Wave 2 per locked spine after AUTHZ-02

**Parked for now:** **M-BILL-F** — soft/hard metering gates deferred; complicates pricing enforcement before AUTHZ-02 and not needed for RC.

## Recently closed

**M-BILL-01 BILL-D/E Closed (2026-08-23):** Company Plan screen (Profile → dedicated screen); Growth/Unlimited checkout + in-app upgrade via `create-checkout-session`; Stripe webhook entitlements sync; `invite-user` reads `company_entitlements` + `seat_class_rules` (deployed); checkout return deep link `taskr://profile?checkout=success`; upgrade DB sync after Stripe swap; `sync-plan-prices-to-db` script for Stripe catalog ↔ `plan_prices` alignment. Edge fns deployed: `create-checkout-session`, `invite-user`, `stripe-webhook`.

**M-BILL-01 BILL-C Closed (2026-08-23):** `stripe-webhook` deployed; `constructEventAsync` Deno fix; Stripe endpoint + secrets; test delivery verified. Commits `e0255e7`, `6977725`.

**M-BILL-01 BILL-B Closed:** parity migration `113bf84`, 7 companies backfilled.

**M-OPS-02 Closed (2026-08-22):** OPS02-A/B create+update guards, local drafts + WIP reconcile, OPS02-C hot-file shrink. Commit `e3eeb6d`.

## Locked

- **Master plan:** `docs/superpowers/plans/2026-08-22-master-plan-parallel.md` (**LOCKED**)
- **Spine:** OPS-01 v1 ✓ → **OPS-02 MVP** ✓ → **M-BILL-01 MVP** ✓ → **RC** → **M-AUTHZ-02** → AI-01 → Wave 2
- **Parallel now:** marketing GHPages, idle P1s only
- **Frozen:** KPI v2 apply, BILL live apply (live Stripe catalog placeholders), Wave 2 web
- No service-role in mobile; no company switch

## Parked

- **M-BILL-F** — usage gates / hard enforcement (explicitly deferred post-billing MVP; RC + AUTHZ-02 first)
- Owner KPI v2 (`owner_kpi_snapshot`)
- Owner tenant writes, feedback inbox, BYO storage
- BILL-F hard enforcement gates

---

Updated: 2026-08-23
