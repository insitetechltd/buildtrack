# M-AUTHZ-RC Close Report (2026-08-27)

## Summary

Closed **WS-AUTHZ / M-AUTHZ-RC** (host-company user / project / assignment contract) after headed smoke **H01–H08 all PASS** (user-confirmed 2026-08-27).

Construct locked 2026-08-24: CA / PM / Worker seats; **PA** crownable on CA|PM only; same field UI + CA management via avatar; drop trade title picker. **Not** multi-company liaison/invite/absorb (**M-AUTHZ-02**).

## Construct SoT

| Artefact | Path |
|---|---|
| Product construct | `docs/superpowers/plans/2026-08-24-company-user-project-model.md` |
| Implement plan | `docs/superpowers/plans/2026-08-24-m-authz-rc-implement.md` |
| Headed / matrix cases | `docs/superpowers/plans/2026-08-25-m-authz-rc-user-model-test-cases.md` |

## Shipped (app catch-up)

Phases A–C + follow-ons already on master before close, including:

- PA roster gate (CA|PM only)
- Member / PA labels (no trade title picker on place)
- Avatar → Company management (projects / users / KPI shell)
- CA Create Task on job (not admin-ban)
- Tasks peer visibility for admin/manager band on shared jobs (Team Queue)
- Worker visibility unchanged (assigned/created only)

## Headed smoke exit (H01–H08)

| ID | Result |
|---|---|
| H01 CA → Activity field tabs | **PASS** |
| H02 Avatar → Company management | **PASS** |
| H03 Place Bob on Project A | **PASS** |
| H04 Place Pat via User Management | **PASS** |
| H05 Name Sarah PA | **PASS** |
| H06 CA Create Task on job | **PASS** (2026-08-27) |
| H07 CA field list vs Project B | **PASS** (2026-08-27) |
| H08 Worker regression (Bob) | **PASS** (2026-08-27) |

## Explicit non-scope (do not treat as this close)

- Partner liaison / project invite / host-absorb → **M-AUTHZ-02**
- Owner Admin app → **M-OPS-03**
- Billing seat enforcement polish → **M-BILL-01**
- Single-device login → **M-SEC-03** (Deferred)

## Residual (non-blocking)

Optional L2 matrix gaps from the test-case doc (e.g. F05 PA-gated roster if product wants a harder gate; F06 auto-PA assert; A03/A05/E06 contract edges) remain improvement backlog — **not** reopen criteria for M-AUTHZ-RC after H01–H08 PASS.

## Sign-off

| Role | Sign | Date |
|---|---|---|
| Human headed H01–H08 | chat confirm (H06/H07/H08 + prior H01–H05) | 2026-08-27 |
| Milestone close | Closed | 2026-08-27 |
