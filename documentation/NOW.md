# NOW — session continuity

**SOP:** git-tracked NOW + **full cycle** in `~/.cursor/skills/solo-dev-harness/SOP.md`.

---

## Doing

**M-BILL-01 BILL-D** — `invite-user` reads `company_entitlements` + `seat_class_rules`; **deploy Edge fn** pending.

**Marketing site:** almost ready — uncommitted separately.

**iOS:** TF 190 Waiting for Review; user ships Owner Console build.

## Next (definitive — locked master plan)

1. **M-BILL-01 BILL-E deploy + checkout E2E** — deploy `create-checkout-session`, verify entitlements sync
2. **M-BILL-01 BILL-F** — soft/hard metering gates (optional)
3. **M-AUTHZ-02** after billing MVP

## Recently closed

**M-BILL-01 BILL-C Closed (2026-08-23):** `stripe-webhook` deployed; `constructEventAsync` Deno fix; Stripe endpoint + secrets; test delivery verified. Commits `e0255e7`, `6977725`.

**M-BILL-01 BILL-E (code closed 2026-08-23):** `create-checkout-session` Edge fn + Profile Growth/Unlimited checkout wired. Commit `08f7267`. Deploy + E2E pending.

**M-BILL-01 BILL-B Closed:** parity migration `113bf84`, 7 companies backfilled.

**M-OPS-02 Closed (2026-08-22):** OPS02-A/B create+update guards, local drafts + WIP reconcile, OPS02-C hot-file shrink (`taskDerivedState`, `taskNormalization`, `taskDeferredSchemaCompat`, `taskStore.selectors`, AppNavigator nav helpers, `CreateTaskInputField`), draft discard deletes persisted draft + swipe-back discard dialog. OPS02-D: `test:tasks` 38/38, ops Jest subset 111/111 PASS. Commit `e3eeb6d`.

## Locked

- **Master plan:** `docs/superpowers/plans/2026-08-22-master-plan-parallel.md` (**LOCKED**)
- **Spine:** OPS-01 v1 ✓ → **OPS-02 MVP** → **M-BILL-01 MVP** → AUTHZ-02 → AI-01 → Wave 2
- **Parallel now:** BILL-A draft, marketing GHPages, idle P1s only
- **Frozen:** KPI v2 apply, BILL live apply, Wave 2 web
- No service-role in mobile; no company switch

## Parked

- Owner KPI v2 (`owner_kpi_snapshot`)
- Owner tenant writes, feedback inbox, BYO storage

---

Updated: 2026-08-23
