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
| WS-SEC / M-SEC-02 | Credential rotation & secret-history remediation | Deferred | M-SEC-01 | - | ./BUG_INVENTORY.md |
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
| WS-UIA / M-UIA-01 | P0 contract safety, navigation hardening & adapter contract alignment | Closed | M-UI-07, M-DATA-02 | 8 | ../docs/superpowers/plans/2026-07-02-ws-uia-01-03-execution-plan.md |
| WS-UIA / M-UIA-02 | P1 portability, boundary cleanup & parallel-work separation | Closed | M-UIA-01 | 9 | ../docs/superpowers/plans/2026-07-02-ws-uia-01-03-execution-plan.md; ./UI_ARCHITECTURE.md |
| WS-UIA / M-UIA-03 | P2 render performance hotspots | Closed | M-UIA-02 | 10 | ../docs/superpowers/plans/2026-07-02-ws-uia-01-03-execution-plan.md |
| WS-QA / M-QA-01 | User testing rubric execution — 4 scenarios (A: rejection loop 4 shots, B: overdue crunch 3, C: isolation wall 3, D: iPhone 17 viewport 8) = 18 PNGs, suite rc=0, semantic PASS, driver attempt=1 each | Closed | M-UI-07 | 11 | ../docs/superpowers/plans/sprint7-user-testing-rubric.md; ../docs/superpowers/plans/2026-07-01-m-qa-01-user-testing-rubric-execution.md |
  - Closed evidence: 2026-08-06 live suite run via `scripts/maestro/run-qa01-suite.sh` against iPhone 17 Pro Max UDID B7B2640C-4738-4F8A-AEEE-5DF3D21D2533, com.buildtrack.app.local, Metro=http://127.0.0.1:8081
  - Artifacts (18 PNGs + run-summary.txt): `.cache/maestro-artifacts/qa01-20260806_214425/`  (A:4 / B:3 / C:3 / D:8)
  - Per-scenario PASS, attempts=1 (no driver reinstall/5999), A:157s B:75s C:105s D:85s, total ≈422s, SUITE ROLLUP rc=0, semantic shot-check found=needed 4/4 3/3 3/3 8/8
| WS-QA / M-QA-02 | UI automation foundation (root Maestro smoke + Sprint 7 bootstrap surface shipped) | Closed | M-UI-07 | 12 | ../docs/superpowers/plans/2026-07-01-ws-qa-02-ui-automation-maestro.md; ../docs/superpowers/specs/2026-07-01-maestro-local-setup-design.md; ./MAESTRO_LOCAL_SETUP.md |
  - Closed evidence: 2026-08-06 live re-verified suite run via `scripts/maestro/run-local.sh` against iPhone 17 Pro Max UDID B7B2640C-4738-4F8A-AEEE-5DF3D21D2533, com.buildtrack.app.local, Metro=http://127.0.0.1:8081, MAESTRO_LOCAL_HOME=project-local `.cache/maestro-home`
  - Foundation artifacts 3/3 flows rc=0 PASS (M-QA-02 deliverable): `launch-smoke.yaml` 13s, `sprint7-open-developer-settings.yaml` 30s, `sprint7-initialize-sandbox.yaml` 33s (includes bootstrap clearState:true + reseed)
  - Package scripts delivered: `test:e2e:maestro:install`, `test:e2e:maestro:final`, `validate:local:confidence`, `validate:local:maestro` (final = confidence + maestro:journeys, matches slow confidence table)
  - Wrapper conventions preserved: `run-local.sh` 10s ALIVE heartbeat lines, PHASE pre/post, no silent `|| true`, FINAL rc/elapsed lines
  - Artifacts root: `.cache/maestro-artifacts/d7-qa-20260806_234727/summary.txt` (M-QA-02 3 flows PASS); runbook: `documentation/MAESTRO_LOCAL_SETUP.md`
| WS-QA / M-QA-03 | Automated confidence & end-to-end UX coverage (active hybrid confidence expansion) — foundation shipped, close deferred pending S-UX-01I migration hardening (no testIDs in screens allowed) | Pipeline | M-QA-02, S-UX-01I | 12.5 | ../docs/superpowers/plans/2026-08-01-ws-qa-03-automated-confidence-and-e2e-coverage.md; ../TESTING_STRATEGY.md; ../maestro/TESTID_GAPS_TODO.md |
  - Foundation delivered 2026-08-06: L1 Jest journeys 5 suites (6 tests) PASS, L2 regression 35/151 PASS, L2 components 7/32 PASS, L2 tsc-noEmit rc=0, M-QA-02 foundation 3/3 rc=0 PASS (cross-requirement)
  - L3 Maestro: 2 long-journey YAMLs authored (project-switch-create-taskdetail-progress-update + login-switch-4-projects); 18 known selector gaps without S-UX-01I testIDs tracked in `maestro/TESTID_GAPS_TODO.md`; S-UX-01I Pipeline hard-gate prevents screen .tsx edits / testID implementation this milestone-slice
  - Artifacts D7 re-verification (M-QA-02 3/3 PASS, M-QA-03 journeys selectors gated): `.cache/maestro-artifacts/d7-qa-20260806_234727/summary.txt`; L1/L2 summary: `.cache/test-engineering/d6-20260806_232101/summary.txt`
| WS-SUPABASE / M-SUPABASE-01 | Full Supabase deep-dive inspection | Pipeline | M-DATA-02 | 13 | ../docs/superpowers/plans/2026-07-01-ws-supabase-01-deep-dive-inspection.md |
| WS-UX / M-UX-01 | Insite redesign implementation | Pipeline | M-UIA-03, M-DATA-02 | 14 | ../docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md |
| WS-UX / M-UX-01 / S-UX-01A | Redesign-safe task model foundation | Closed | M-DATA-02 | 14.1 | ../docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md |
| WS-UX / M-UX-01 / S-UX-01B | Active-project workspace bootstrap restore | Closed | S-UX-01A | 14.2 | ../docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md |
| WS-UX / M-UX-01 / S-UX-01C | Top-level shell and navigation IA alignment | Closed | S-UX-01B | 14.3 | ../docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md |
| WS-UX / M-UX-01 / S-UX-01D | Activity-first home rollout | Closed | S-UX-01C | 14.4 | ../docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md |
| WS-UX / M-UX-01 / S-UX-01E | Compact project task surface | Closed | S-UX-01D | 14.5 | ../docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md |
| WS-UX / M-UX-01 / S-UX-01E2 | Activity/tasks correction | Closed | S-UX-01E | 14.6 | ../docs/superpowers/plans/2026-07-04-activity-tasks-correction-implementation.md |
| WS-UX / M-UX-01 / S-UX-01F | Shell + camera redesign | Closed | S-UX-01E2 | 14.7 | ../docs/superpowers/plans/2026-07-04-shell-camera-redesign-implementation.md |
| WS-UX / M-UX-01 / S-UX-01G | Task detail redesign | Closed | S-UX-01F | 14.8 | ../docs/superpowers/plans/2026-07-05-task-detail-redesign-implementation.md |
| WS-UX / M-UX-01 / S-UX-01H | Batch-first capture review | Closed | S-UX-01G | 14.9 | ../docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md; ../../.trae/documents/S-UX-01H_batch-first-capture-review_planner_scope.md |
  - Closed evidence: 2026-08-07 SOLO 8-agent cycle (Planner → Builder TDD → Reviewer 2 rounds → 2 commits → Test Engineer → QA Validator). Commits on master: `f1eaca3 feat(ux): S-UX-01H batch-first capture review` (15 files, 1583 insertions, 236 deletions, 4 new files: unattachedPhotoBatchStore + 3 test suites) + `5fae961 fix(test): populate mockGetTasksByProject for selectedTaskId tests` (6 insertions, 1 test file).
  - D3 Builder TDD: 5 Jest suites (4 NEW: unattachedPhotoBatchStore 4/4, usePhotoSelectionViewAdapter 6/6, PhotoSelectionScreen integration 3/3, useDashboardViewAdapter 18/18 including 2 extended tests).
  - D4 Reviewer 2-round gate: Round 1 2 HIGH (KeyboardAvoidingView wrap, partial-alert reachability) + 5 MEDIUM (stack leak / origin teleport / disabled-prop / stale-task-race / interface drift) → Builder same-PR all 7 fixes → Round 2 unconditional PASS + 0 new testIDs (S-UX-01I boundary respected).
  - D6 Test Engineer L1/L2/L3: npx tsc --noEmit rc=0; L2 14/14 suites, 101/101 P1-scope tests green; L3 Jest journeys 5/5 suites (6/6 tests) green.
  - D7 QA Validator: iPhone 17 Pro Max UDID B7B2640C-4738-4F8A-AEEE-5DF3D21D2533 iOS 26.0, com.buildtrack.app.local, Metro port 8081. Maestro v2.8.0 launch-smoke rc=0 (PASS). Probe 2 unattached save ad-hoc: CONDITIONAL PASS due to selectors using text IDs that differ from actual UI (S-UX-01I testID-gated, full 5/5 Maestro proof deferred to P3). Artifacts + JSON screen hierarchy captured for P3 selector mapping: `.cache/maestro-artifacts/qa01h-probe-20260807-081435/`
  - 4 deliverables delivered: (a) multi-photo caption + arrow-reorder in PhotoSelection grid + enlarged viewer; (b) CreateTask post-capture Existing Task choice unlocked → project-scoped task mini-picker inline in PhotoSelection with last-second zombie-task guard; (c) Save to Project unattached (segmented control pill → entityType='project' upload → new persist store with 5-day filter); (d) Dashboard Recent Activity synthetic unattached-batch rows with project: taskId prefix + Pressable disabled guard.
| WS-UX / M-UX-01 / S-UX-01I | Migration hardening and regression closure | Pipeline | S-UX-01H | 14.9 | ../docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md; ../../maestro/TESTID_GAPS_TODO.md |

## Deferred Context

These are intentionally outside the WS/M/S milestone inventory and current execution queue.

- WS-SEC / M-SEC-02 remains intentionally deferred: rotate previously exposed credentials and decide later whether Git history rewriting is required beyond branch-tip cleanup.
- Pending follow-on under `WS-SUPABASE / M-SUPABASE-01`: apply the authored `tasks` redesign metadata migration for `primary_assignee_id`, `delegated_user_ids`, `container_id`, `sub_container_id`, and `tags`; until the live schema is updated, task create and redesign-metadata edit flows use compatibility fallbacks and those fields do not persist reliably.
- Deferred branch follow-on: `feature/ai-llm-integration` is intentionally paused for future roadmap grooming; its code is already contained in `master`, but the feature line remains under review before any new milestone or slice is opened for it.
- Deferred branch follow-on: `origin/feature/local-file-cache` remains a remote-only legacy branch on unrelated history; do not delete or promote it until its scope is reviewed and mapped into a future workstream or explicitly retired.
- WS-FUTURE: MCP Hub architecture, AI task automation, and construction platform integrations.

## Governance

- This file is the single source of truth for milestone inventory and execution order.
- Canonical approved product UI/UX logic belongs in `../docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`, not in this roadmap ledger.
- Planning documents under `docs/superpowers/` may describe slices or execution detail, but must not become competing roadmap inventories.
- Before changing any milestone or slice status to `Closed`, explicitly assess whether the app must be relaunched to validate the completed work.
- If relaunch is needed, relaunch the app, verify the relaunch succeeds, and treat that verification as part of slice wrap-up rather than an optional follow-up.
- Default implementation mode is **subagent-driven execution**. Use inline execution only when the user explicitly asks for it or a specific task cannot be reasonably decomposed into reviewed sub-tasks.
- When a milestone is closed, update its `Status` to `Closed` only after the required validation and any required relaunch verification are complete, and update its primary reference to the latest execution plan or canonical doc when relevant.
- `WS-QA / M-QA-02` **Closed (2026-08-06)**: UI automation foundation — 3-flow re-verify (launch-smoke + sprint7-open-developer-settings + sprint7-initialize-sandbox) all rc=0 on iPhone 17 Pro Max UDID B7B2640C-4738-4F8A-AEEE-5DF3D21D2533. 4 package scripts + MAESTRO_LOCAL_SETUP.md runbook. Run-local.sh wrapper conventions: 10s heartbeat ALIVE, PHASE pre/post, FINISHED rc/elapsed, MAESTRO_LOCAL_HOME project-local `.cache/maestro-home`. Evidence: `.cache/maestro-artifacts/d7-qa-20260806_234727/summary.txt` 3/3 PASS.
- `WS-QA / M-QA-03` foundation shipped 2026-08-06 but milestone stays `Pipeline`: L1 Jest journeys 5 suites 6 tests PASS, L2 regression 35/151 PASS, components 7/32 PASS, tsc-noEmit rc=0, M-QA-02 foundation 3/3 PASS (cross). 2 Maestro long-journey YAMLs authored + 18-selector gap catalog (`maestro/TESTID_GAPS_TODO.md`). Full close deferred pending `S-UX-01I` (Migration hardening & regression closure) Pipeline hard-gate — screens/* testIDs not allowed before that slice is complete (cannot prove 5/5 L3 Maestro PASS without them).
- Historically closed milestones may reference `AGENTS.md` as a summary record; milestone-level execution artifacts may not exist for all historical work.
- `WS-UIA / M-UIA-01` and `WS-UIA / M-UIA-02` govern contract stabilization, boundary cleanup, and parallel-work separation for presentation, adapter, and data-layer ownership; roadmap-aligned coordination rules must be reflected in the canonical UI architecture references rather than tracked only in ad hoc prompt notes.
