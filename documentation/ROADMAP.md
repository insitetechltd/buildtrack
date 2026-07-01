# Roadmap (WS / M / S)

This document is the single canonical milestone inventory for the repository's WS/M/S execution queue.

## Taxonomy

- `WS` = Workstream
- `M` = Milestone
- `S` = Slice (milestone subdivision when needed)

## Status Rules

- `Closed`: milestone is complete and should be skipped unless a real regression forces reopening.
- `Pipeline`: milestone is pending execution.
- `Deferred`: explicitly out of the near-term queue; do not execute unless promoted back into `Pipeline`.

## Milestone Inventory

| ID | Name | Status | Dependencies | Suggested Order | Primary References |
| --- | --- | --- | --- | --- | --- |
| WS-FND / M-FND-01 | Reliability & Data Integrity | Closed | None | - | ../AGENTS.md |
| WS-FND / M-FND-02 | Store Performance & Request Deduplication | Closed | M-FND-01 | - | ../AGENTS.md |
| WS-FND / M-FND-03 | Workspace Automation & Script Cleanup | Closed | M-FND-02 | - | ../AGENTS.md |
| WS-FND / M-FND-04 | UI Migration Foundations | Closed | M-FND-02 | - | ./m-fnd-04-ui-migration-wave-matrix.md |
| WS-DATA / M-DATA-01 | Cache authority & sync hardening | Closed | M-FND-02 | - | ../docs/superpowers/plans/2026-06-30-m-data-01-cache-authority-sync-hardening.md |
| WS-SEC / M-SEC-01 | Security & worktree sanitization | Closed | None | - | ../docs/superpowers/plans/2026-07-01-m-sec-01-security-worktree-sanitization.md |
| WS-DATA / M-DATA-02 | Core model unification | Closed | M-DATA-01 | - | ../docs/superpowers/plans/2026-07-01-m-data-02-core-model-unification.md |
| WS-UI / M-UI-02 | Wave 2 UI migration & selector adoption | Closed | M-FND-04 | - | ../docs/superpowers/plans/2026-06-28-ws-roadmap-near-term-execution.md |
| WS-UI / M-UI-02 / S-UI-02A | ProjectsScreen migration | Closed | M-UI-02 | - | ../docs/superpowers/specs/2026-06-29-s-ui-02a-projects-screen-design.md |
| WS-UI / M-UI-02 / S-UI-02B | Group B header convergence | Closed | S-UI-02A | - | ../docs/superpowers/specs/2026-06-30-s-ui-02b-group-b-header-convergence-design.md |
| WS-UI / M-UI-02 / S-UI-02C | Photo update shortcut | Closed | S-UI-02B | - | ../docs/superpowers/specs/2026-06-30-s-ui-02c-photo-update-shortcut-design.md |
| WS-DEVEX / M-DEVEX-01 | Workspace loop & simulation tests | Closed | None | - | ../docs/superpowers/plans/2026-06-17-workspace-loop-and-simulation-tests.md |
| WS-AUTHZ / M-AUTHZ-01 | Role model normalization | Closed | None | - | ../docs/superpowers/plans/2026-06-20-role-model-normalization-plan.md; ./role-permission-matrix.md |
| WS-UI / M-UI-03 | Batch A | Closed | M-DATA-02, M-AUTHZ-01 | - | ../docs/superpowers/plans/2026-06-20-batch-a-auth-and-admin-screens.md |
| WS-UI / M-UI-04 | Batch B | Closed | M-DATA-02, M-AUTHZ-01 | - | ../docs/superpowers/plans/2026-06-20-batch-b-project-ops-screens.md |
| WS-UI / M-UI-05 | Batch C | Closed | M-DATA-02, M-AUTHZ-01 | - | ../docs/superpowers/plans/2026-06-20-batch-c-utility-and-admin-tail-screens.md |
| WS-UI / M-UI-06 | Photo screens modernization remainder | Closed | M-UI-05 | - | ../docs/superpowers/plans/2026-06-19-photo-screens-modernization.md |
| WS-UI / M-UI-07 | CreateTaskScreen full modernization completion | Closed | M-UI-06 | - | ../docs/superpowers/plans/2026-06-20-create-task-modernization.md |
| WS-QA / M-QA-01 | User testing rubric execution | Pipeline | M-UI-07 | 8 | ../docs/superpowers/plans/sprint7-user-testing-rubric.md |

## Deferred Context

These are intentionally outside the WS/M/S milestone inventory and current execution queue.

- WS-FUTURE: MCP Hub architecture, AI task automation, and construction platform integrations.

## Governance

- This file is the single source of truth for milestone inventory and execution order.
- Planning documents under `docs/superpowers/` may describe slices or execution detail, but must not become competing roadmap inventories.
- When a milestone is closed, update its `Status` to `Closed` and, if relevant, update its primary reference to the latest execution plan or canonical doc.
- Historically closed milestones may reference `AGENTS.md` as a summary record; milestone-level execution artifacts may not exist for all historical work.
