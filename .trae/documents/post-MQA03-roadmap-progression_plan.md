# Post-M-QA-03 Roadmap Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task in the SOLO 8-agent handoff order. Steps use checkbox (`- [ ]`) syntax for tracking; each Phase is an Orchestrator-level dispatch with its own D1–D8 sub-gates.

**Goal:** Execute the canonical roadmap sequence from current master state (M-QA-02 Closed, M-QA-03 foundation shipped Pipeline, S-UX-01G Closed, S-UX-01H/S-UX-01I/WS-SUPABASE-01 all Pipeline) through S-UX-01H close → S-UX-01I close → M-QA-03 full close → WS-SUPABASE-01 inspection complete.

**Architecture:** Four independent roadmap-order phases with strict dependency ordering. Each Phase is executed as a full SOLO 8-agent cycle, with commit-gate and roadmap/AGENTS text edits at Phase end. NO cross-phase file edits before the prior Phase passes D7 QA.

**Dependency order enforced (exact roadmap `Depends` col from [ROADMAP.md](file:///Volumes/KooDrive/InsiteApp/documentation/ROADMAP.md)):**
```
Phase 1 — S-UX-01H (Batch-first capture review) ──┐
  Depends: S-UX-01G = Closed ✅                       ▼
                                                  Phase 2 — S-UX-01I (Migration hardening + testIDs)
  Depends: S-UX-01H = Closed                              │
                                                          ▼
                                                  Phase 3 — M-QA-03 full L3 Close
  Depends: M-QA-02 ✅ + S-UX-01I Closed                    │
                                                          ▼
                                                  Phase 4 — WS-SUPABASE-01 Full Inspection
  Depends: M-DATA-02 = Closed ✅
```

**Tech Stack:** Expo SDK 54, React Native, TypeScript, React Navigation, Zustand, Supabase, NativeWind, AsyncStorage, Maestro 2.8.0 (L3 only), Jest (L1/L2).

---

## Repo Research Conclusion

### Current concrete state confirmed by file-system inspection:

1. **S-UX-01H current code:** Photo capture-review entry surface currently is `PhotoSelectionScreen` ([PhotoSelectionScreen.tsx:1](file:///Volumes/KooDrive/InsiteApp/src/screens/PhotoSelectionScreen.tsx#L1-L35)) which supports:
   - `uploadImmediately` true (UpdateProgress legacy) vs false (CreateTask attach)
   - `entityType: 'task' | 'task-update' | 'project' | 'user'` file upload path
   - Single enlarged photo viewer with annotate + delete
   - Header counter `Select Photos (N)` but NO project-first / batch-save controls
   - Camera tab routes → `CreateTaskMain` post-capture routing sheet currently *explicitly disables* the "Add to Existing Task" choice with the copy `"Existing-task attach flow is not part of this slice yet"` at [CreateTaskScreen.tsx:730](file:///Volumes/KooDrive/InsiteApp/src/screens/CreateTaskScreen.tsx#L727-L731)
   - `postCaptureRoutingChoice` shell is already in-place at [CreateTaskScreen.tsx:663-733](file:///Volumes/KooDrive/InsiteApp/src/screens/CreateTaskScreen.tsx#L663-L733) (S-UX-01F/01G delivery), so this is the hook 01H fills in.

2. **S-UX-01I current testID coverage:** Full grep of screens `testID=` revealed:
   - **Good:** Dashboard, Tasks list (row wrapper + swipeable + archive/update/left-swipe actions per taskId, empty state, filters, chips, search count, header reset), Task Detail header/scroll/bottom bar, CreateTask full form, ProfileMenu `profile-menu-project_picker`, ProjectPicker `projectPicker-scroll` + `projectPicker-project-${projectId}`, Login, Register all have established testIDs.
   - **Pattern in use (from grep):** `<domain>-<screen|surface>__<element>[_<identifier>]` e.g. `tasks-screen__row_${taskId}`, `create-task__submit-success-confirm`, `profile-menu-project_picker`, `dashboard-screen__activity_${item.id}`.
   - **Exact 18 P0/P1 gaps still open:** catalogued in [TESTID_GAPS_TODO.md](file:///Volumes/KooDrive/InsiteApp/maestro/TESTID_GAPS_TODO.md#L9-L29). After S-UX-01H locks the batch-review save semantics, S-UX-01I applies these as the FINAL regression-hardening pass — before 01H closes, applying the `photo-picker__*` and `project-picker__row-*` and dashboard empty-state testIDs is premature because 01H will re-split those wrappers.

3. **Legacy task compatibility (S-UX-01I scope item):** Current fallback code paths — `taskStore.supabase.ts` already drops + retries with compatibility payload on schema-missing `primary_assignee_id`/`delegated_user_ids` errors at [taskStore.supabase.ts:1551](file:///Volumes/KooDrive/InsiteApp/src/state/taskStore.supabase.ts#L1549-L1553) (create) and [taskStore.supabase.ts:1947](file:///Volumes/KooDrive/InsiteApp/src/state/taskStore.supabase.ts#L1945-L1949) (update). Legacy statuses, accepted-flag clears, worker→member role aliases kept in [buildtrack.ts:74](file:///Volumes/KooDrive/InsiteApp/src/types/buildtrack.ts#L74), [buildtrack.ts:694](file:///Volumes/KooDrive/InsiteApp/src/types/buildtrack.ts#L694). S-UX-01I audits these paths + writes Jest parity tests so there is no 2-code-path render wrapper split.

4. **M-QA-03 current state (Phase 3 start state):**
   - L1/L2: D6 PASS L1 (tsc + journeys 5/5) + L2 (regression 35/151, components 7/32). Artifacts: [`.cache/test-engineering/d6-20260806_232101/summary.txt`](file:///Volumes/KooDrive/InsiteApp/.cache/test-engineering/d6-20260806_232101/summary.txt).
   - L3: 2 Maestro YAMLs authored. 3/5 PASS (M-QA-02 foundation cross). 2/5 flow FAIL at last D7 run due to text-regex/i18n/text-node-boundary selectors; exactly the 18 entries TESTID_GAPS_TODO. Final failing artifact from `.cache/maestro-artifacts/d7-qa-20260806_234727/summary.txt` was `PASS=3 FAIL=2`.
   - Phase 3 = 0 new code outside the Maestro YAMLs + roadmap/AGENTS docs. Because every Phase-1/Phase-2 added testID follows the EXACT same naming convention already written into the TODO catalog rows (proposal col), the swap is a mechanical regex→id rename (18 rows × 2 YAMLs, verify).

5. **WS-SUPABASE-01 (Phase 4):** Inspection-only milestone (no destructive schema changes). Source plan at [2026-07-01-ws-supabase-01-deep-dive-inspection.md](file:///Volumes/KooDrive/InsiteApp/docs/superpowers/plans/2026-07-01-ws-supabase-01-deep-dive-inspection.md#L1-L88) is already authorative; lists 4 domains (auth/users, core domain tables, app coupling at src/api + src/state/*Store.supabase.ts, runtime safety), deliverables = inspection report + system map + prioritized findings backlog, uses pooler psql via `SUPABASE_SQL_ACCESS.md` + `WS_SUPABASE_01_READONLY_AUDIT.sql` (if those files exist), 0 schema mutation. This Phase is strictly docs + findings output.

### Hard non-negotiable gates (from AGENTS.md/ROADMAP.md):
- **S-UX-01I = LAST allowed place for `src/screens/*.tsx` testID additions BEFORE M-UX-01 is declared Closed.** No testID insertions in Phase 3 (M-QA-03 close); only YAML selector swap.
- **WS-SUPABASE-01 = Inspection-only.** NEVER run `drop table`, `alter table`, `delete from`, `drop policy` as part of Phase 4. All remediation is captured as findings-backlog entries, then turned into follow-on WS/M items.
- **SOLO 8-agent order per Phase:** Orchestrator (D1/Dispatch) → Planner (D2) → Builder (D3) → Reviewer + TRAE-code-review parallel (D4) → git-commit COMMIT GATE (D5) → Test Engineer L1/L2 (D6) → QA Validator L3 where applicable (D7) → Delivery (ROADMAP/AGENTS edits, commit+push) (D8). The only phases where D7 runs L3 Maestro are 2 (to verify testID coverage actually works for 1 prototype flow) and 3 (full 5/5 PASS).

---

## Files and Modules to be Edited by Phase

### Phase 1 — S-UX-01H Batch-first capture review
**Modified:**
- [src/screens/PhotoSelectionScreen.tsx](file:///Volumes/KooDrive/InsiteApp/src/screens/PhotoSelectionScreen.tsx) — add project-first save header, task-attachment picker, save-first/organize-later button row.
- [src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts](file:///Volumes/KooDrive/InsiteApp/src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts) — new project-first save, optional task attachment params, batch log intent.
- [src/screens/CreateTaskScreen.tsx](file:///Volumes/KooDrive/InsiteApp/src/screens/CreateTaskScreen.tsx#L663-L733) — enable the "Add to Existing Task" routing choice, remove or replace the guard copy at line 730.
- [src/navigation/AppNavigator.tsx](file:///Volumes/KooDrive/InsiteApp/src/navigation/AppNavigator.tsx) — Camera stack params for project-first batch save (entityType:'project' branch).
- [src/navigation/navigationTypes.ts](file:///Volumes/KooDrive/InsiteApp/src/navigation/navigationTypes.ts) — add new param types for PhotoSelection project-first mode.
- [src/api/fileUploadService.ts](file:///Volumes/KooDrive/InsiteApp/src/api/fileUploadService.ts) — batch-upload for N-photos with activity log on project.
- [src/ui/viewAdapters/useDashboardViewAdapter.ts](file:///Volumes/KooDrive/InsiteApp/src/ui/viewAdapters/useDashboardViewAdapter.ts) — capture-related activity logging entry.
- **Jest tests added:**
  - `src/ui/viewAdapters/__tests__/usePhotoSelectionViewAdapter.test.ts` (new)
  - `src/__tests__/integration/PhotoSelectionScreen.batch-review.test.tsx` (new)
  - extend `src/screens/__tests__/CreateTaskScreen.test.tsx` to cover postCaptureRoutingChoice "Add to Existing Task" enabled.

### Phase 2 — S-UX-01I Migration hardening + testIDs
**Modified:**
- Audit + unified render wrappers + testID additions for the 18 TESTID_GAPS_TODO entries (P0 first, P1 second). Exact files per row of catalog:
  - Dashboard empty state: [DashboardScreen.tsx](file:///Volumes/KooDrive/InsiteApp/src/screens/DashboardScreen.tsx) (P1)
  - ProfileMenu Change Project Pressable: already at [ProfileMenu.tsx:112](file:///Volumes/KooDrive/InsiteApp/src/components/ProfileMenu.tsx#L110-L120) — verify + lock name in Jest const (P0)
  - ProjectPicker rows: [ProjectPickerScreen.tsx](file:///Volumes/KooDrive/InsiteApp/src/screens/ProjectPickerScreen.tsx#L72-L110) — wrap the 2-Text siblings into a single Pressable wrapper with the row testID (P0 × 3)
  - CreateTask form title preview: [CreateTaskScreen.tsx](file:///Volumes/KooDrive/InsiteApp/src/screens/CreateTaskScreen.tsx) title stack (P1)
  - TasksList row tap Pressable: [TasksScreen.tsx:336-378](file:///Volumes/KooDrive/InsiteApp/src/screens/TasksScreen.tsx#L336-L378) — verify Pressable carries `tasks-list__row-${taskId}` id directly, not wrapper-only (P0)
  - TaskDetail header title: [TaskDetailScreen.tsx:304-321](file:///Volumes/KooDrive/InsiteApp/src/screens/TaskDetailScreen.tsx#L304-L321) add title text testID (P1)
  - UpdateProgress screen title + preview + photo sheet + success toast + OK: locate + update UpdateProgress screen (P0 + P1 × 5)
  - CreateTask alternate success modal confirm (alias): [CreateTaskScreen.tsx:1076-1082](file:///Volumes/KooDrive/InsiteApp/src/screens/CreateTaskScreen.tsx#L1076-L1082) alias check id (P1)
- Legacy task paths hardened: [src/state/taskStore.supabase.ts](file:///Volumes/KooDrive/InsiteApp/src/state/taskStore.supabase.ts) (create/update compatibility paths), [src/types/buildtrack.ts](file:///Volumes/KooDrive/InsiteApp/src/types/buildtrack.ts) backward-compat section.
- **Jest tests added:**
  - `src/__tests__/parity/tasksLegacyCompat.test.ts` (new) — legacy statuses + missing redesign fields render through the same wrappers as modern tasks; verifies 1 code path = 1 testID set.
  - Extend: `src/screens/__tests__/TasksScreen.test.tsx`, `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`, `src/state/__tests__/taskStore.supabase.unit.test.ts` (already covers primary_assignee_id/delegated_user_ids fallback at lines 439-451, extend with a parity case).
- **After D7 QA passes, edits to:**
  - M-UX-01 overall status line in [ROADMAP.md](file:///Volumes/KooDrive/InsiteApp/documentation/ROADMAP.md) if S-UX-01I was the last open slice of M-UX-01 (verify S-UX-01H and S-UX-01I close status first — if 01I is last open, flip M-UX-01 to Closed).
  - [AGENTS.md Current Delivery Status](file:///Volumes/KooDrive/InsiteApp/AGENTS.md#L31-L38) update accordingly.

### Phase 3 — M-QA-03 L3 Full Close
**Modified:**
- [maestro/flows/journey-login-switch-projects.yaml](file:///Volumes/KooDrive/InsiteApp/maestro/flows/journey-login-switch-projects.yaml) — 18 row entries → convert all `text:` / `text regex:` selectors into their `id:` equivalents from the TESTID_GAPS_TODO proposal col. Remove `scrollUntilVisible` hacks where id-selector removes that need (keep where long ScrollView truly needs it, per D7).
- [maestro/flows/journey-projectswitch-create-taskdetail-update.yaml](file:///Volumes/KooDrive/InsiteApp/maestro/flows/journey-projectswitch-create-taskdetail-update.yaml) — identical treatment.
- Delete/archive: [maestro/TESTID_GAPS_TODO.md](file:///Volumes/KooDrive/InsiteApp/maestro/TESTID_GAPS_TODO.md) once applied (or convert entries into `DONE: applied in commit <sha>` audit trail, whichever matches existing style).
- **Jest (L1/L2):** No new tests — only L3 Maestro 5/5 PASS required. L6 TE re-runs L1/L2 to confirm no YAML-only regressions.
- **D8 delivery edits:**
  - Flip M-QA-03 row in [ROADMAP.md](file:///Volumes/KooDrive/InsiteApp/documentation/ROADMAP.md) → Closed with evidence.
  - Update [AGENTS.md](file:///Volumes/KooDrive/InsiteApp/AGENTS.md#L31-L38) delivery status lines accordingly.

### Phase 4 — WS-SUPABASE-01 Full Deep-dive Inspection
**All outputs are docs/read-only, NO schema mutations.** Files written:
- `documentation/SUPABASE_INSPECTION_REPORT_2026-08.md` (new): full 4-domain report per [ws-supabase-01-deep-dive-inspection.md §23-57](file:///Volumes/KooDrive/InsiteApp/docs/superpowers/plans/2026-07-01-ws-supabase-01-deep-dive-inspection.md#L23-L57).
- `documentation/SUPABASE_APP_SYSTEM_MAP.md` (new): coupling map app→Supabase for: authStore, userStore, projectStore, taskStore, uploads service, comments/review. Tabular mapping: method/function → supabase table + column + policy + optimistic vs realtime.
- `documentation/SUPABASE_FINDINGS_BACKLOG.md` (new): prioritized remediation backlog (P0/P1/P2), each with title, affected domain, recommended follow-on WS/M/S id placeholder, short rational.
- **Read-only (NOT committed):** If credentials allow, run `WS_SUPABASE_01_READONLY_AUDIT.sql` (referenced in §78) against pooler; capture output as `.cache/supabase-audit-<ts>/` directory. If no credentials or env vars missing → explicitly document that gate as "live db read skipped, findings from code-path surface only" instead of fabricating data.
- **D8 delivery edits:**
  - Flip WS-SUPABASE / M-SUPABASE-01 in [ROADMAP.md](file:///Volumes/KooDrive/InsiteApp/documentation/ROADMAP.md) → Closed with evidence (reports + backlog; note whether live-sql audit was possible).
  - Update [AGENTS.md](file:///Volumes/KooDrive/InsiteApp/AGENTS.md#L31-L38) Current Delivery Status accordingly.

---

## Steps for Modifications or New Features

Each Phase below IS a full SOLO 8-agent cycle. Implementation must not skip between phases or interleave them.

---

### Phase 1. S-UX-01H: Batch-first Capture Review (SOLO cycle #1)

**Boundary rule:** This phase touches ONLY the PhotoSelection + CreateTask routing surface. No testID additions in this phase (they belong to S-UX-01I AFTER wrappers stabilize). No Task Detail / Activity home / migration work here.

- [ ] **Step 1.1: SOLO D1 Milestone Gate + D2 Planner**
  Re-read [ROADMAP.md S-UX-01H](file:///Volumes/KooDrive/InsiteApp/documentation/ROADMAP.md#L67), [S-UX-01 slice list with 01H detail](file:///Volumes/KooDrive/InsiteApp/docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md#L429-L441), TESTING_STRATEGY.md L1-L4. Planner outputs: scope, 01H-specific file list, acceptance, open questions.

- [ ] **Step 1.2: SOLO D3 Builder — build the 4 in-scope deliverables from S-UX-01H plan**
  (a) multi-photo review: keep 3-col grid, add caption + reorder (no drag required; arrow controls OK) controls on enlarged-photo header OR add a new bottom batch-control bar (choose the minimal approach that preserves current enlarged layout).
  (b) optional task attachment: enable postCaptureRoutingChoice "Add to Existing Task" — remove the disabled copy at CreateTaskScreen.tsx:730, implement a project-scoped task mini-picker inside PhotoSelection before save.
  (c) save-first/organize-later: new `Save to project (unattached)` intent parallel to task attachment. Both call fileUploadService with the correct entityType + activity emission.
  (d) capture-related activity logging: ensure `Recent Activity` row type for unattached project-photo batch is rendered by Dashboard adapter.
  Match existing NativeWind styling; do NOT add new RN dependencies (only re-use expo-image, Ionicons already present).

- [ ] **Step 1.3: Write failing Jest tests first per TDD before code**
  Per skill writing-plans rule: test file content first, then run, then implement. See `test:L1/L2` at "Files edited" above.

- [ ] **Step 1.4: SOLO D4 Reviewer + TRAE-code-review parallel**
  Risk list: (1) Does new batch-upload properly resolve `uploadImmediately` semantics for the legacy UpdateProgress callers? (2) Is navigation state preserved correctly when camera tab enters → captures N → save project-only → returns to Activity home? (3) No testIDs added in this phase — check.

- [ ] **Step 1.5: D5 Commit Gate** — Use `git-commit` skill. Conventional type: `feat(ux-01h): …`.

- [ ] **Step 1.6: D6 Test Engineer** — L1 tsc-noEmit; L2: Jest new tests + regression 35/151 new run; components 7/32; journeys 5.

- [ ] **Step 1.7: D7 QA Validator L3 Maestro prototype 1 flow ONLY**
  Do NOT run all 5. Re-run `launch-smoke.yaml` to confirm new batch code does not break launch, then 1 ad-hoc probe: capture 2 photos from Camera tab → Save unattached to Project A → assert Dashboard Recent Activity row shows for Project A. No new YAML added in 01H; ad-hoc probe is OK.

- [ ] **Step 1.8: D8 Delivery**
  Flip S-UX-01H Pipeline → Closed in ROADMAP.md. Add closed-evidence lines under S-UX-01H row (D6 summary, D7 probe artifact paths). Update AGENTS.md §Current Delivery Status. Commit + push: docs only. Conventional type: `docs(ux-01h): close slice`.

---

### Phase 2. S-UX-01I: Migration hardening + TestID regression pass (SOLO cycle #2)

**Boundary rule:** This is the LAST phase allowed to edit `src/screens/*.tsx` before M-UX-01 is declared Closed. All 18 testIDs from TESTID_GAPS_TODO must be applied with the EXACT proposal-col names; if a name collides, update the TODO proposal col first to the new name THEN apply.

- [ ] **Step 2.1: D1 Gate + D2 Planner** Confirm 01H is Closed (check ROADMAP row). Re-read TESTING_STRATEGY, TESTID_GAPS_TODO.md 18 entries. Planner outputs: P0s first sequence, screen-by-screen minimal edits, legacy parity scope.

- [ ] **Step 2.2: D3 Builder — 3 sub-passes**
  Sub-pass A (P0s × 7): ProfileMenu entry → ProjectPicker row Pressable wrapper → TasksList row tap Pressable → UpdateProgress success-OK → (4) ProjectPicker P0 rows + 1 ProfileMenu P0. For each, first write a targeted Jest test that asserts `testID` is present on the rendered Pressable. Run to fail. Then add the minimal wrapper to carry the testID.
  Sub-pass B (P1s × 11): Dashboard empty state, CreateTask title preview, TaskDetail header title, UpdateProgress screen-title / description-preview / photo-picker sheet-title / photo-picker cancel / success-toast-text, CreateTask alt-success-confirm. Same test-first.
  Sub-pass C (legacy compat): Audit taskStore.supabase.ts compatibility path at create (line 1551) + update (line 1947); write 1 parity test that inserts a legacy-field-missing task row shape and asserts render uses the SAME wrapper id as a modern task. Write a second test for legacy statuses "not_started", "done" treated correctly (useDashboardViewAdapter already has these 2 tests at lines 529/590 — copy + confirm wrapper parity).

- [ ] **Step 2.3: D4 Reviewer + TRAE-code-review parallel**
  Risk list: (1) Did any testID insertions modify accessibility props / onPress handlers? MUST NOT — wrap in a neutral `View` or `<Pressable testID=...>` if needed to keep inner handlers untouched. (2) Name collisions: cross-check `<domain>-<screen>__<name>` format against existing 100+ testID greps (injected earlier research head) to avoid duplicate. (3) Legacy compat test must NOT require Supabase auth — use mocked Jest store, not live backend.

- [ ] **Step 2.4: D5 Commit Gate**
  Split commit if > 40 files changed: `test(ux-01i): add p0 testID jest assertions`, `feat(ux-01i): apply p0 testID wrappers`, `test(ux-01i): p1 tests + wrappers`, `test(ux-01i): legacy task render parity`. 4 commits max; each passing L2 on its own.

- [ ] **Step 2.5: D6 Test Engineer** L1 tsc-noEmit. L2 all 18 testID tests MUST PASS. Regression 35/151 PASS rerun. Components 7/32 PASS. Journeys 5 PASS.

- [ ] **Step 2.6: D7 QA Validator**
  L3: Run the full M-QA-02 3-flow suite (launch-smoke / sprint7-dev-settings / sprint7-init-sandbox) AND, critically, RUN 1 PROTOTYPE of M-QA-03 journey `journey-login-switch-projects.yaml` WITH current testIDs before Phase3 edits. We want at least 1 prototype 4-project-switch PASS to validate the 01I testIDs worked end-to-end. Do NOT yet modify the YAML (that is Phase3 work); instead D7 team may patch it in-sim in memory, or use a /tmp/probe copy — do NOT commit to master in Phase2. If prototype passes, proceed to D8 01I close.

- [ ] **Step 2.7: D8 Delivery**
  Flip S-UX-01I Pipeline → Closed in ROADMAP.md. S-UX-01I was last open slice? If yes: flip M-UX-01 overall → Closed + evidence. Update AGENTS.md §Current Delivery Status. Commit + push: docs(ux-01i): close slice.

---

### Phase 3. M-QA-03: Full L3 5/5 PASS Close (SOLO cycle #3)

**Boundary rule:** 0 new application code outside maestro YAMLs + docs. TESTID_GAPS_TODO.md fully applied then retired/audit-marked.

- [ ] **Step 3.1: D1 Gate + D2 Planner**
  Confirm S-UX-01I Closed. Verify 18 testIDs match exactly between TODO catalog proposal col AND screen greps. If any drift found, open a 1-line builder fix under S-UX-01I (document, do NOT silently rename flows). Planner outputs: exact rename plan for each row × each flow.

- [ ] **Step 3.2: D3 Builder — YAML selector swap**
  For EACH of the 2 journey flows:
  (a) for every P0/P1 entry in TESTID_GAPS_TODO.md, replace `text: "..."` or `text regex: "..."` with `id: <exact proposal col string>`
  (b) where a `scrollUntilVisible` block was added before project row tap — KEEP if row id is still inside ScrollView; REMOVE if now id sits at first-rendered viewport (decide based on first D7 run, not guessing)
  (c) verify the 4 ProfileMenu→picker flows use exactly `id: profile-menu-project_picker` already confirmed in research, and rows use `project-picker__row-${projectId}` not UUID-specific strings
  Do NOT change app nav params, do NOT add flows — only selectors.

- [ ] **Step 3.3: D4 Reviewer + TRAE-code-review parallel**
  Risk list: (1) Did any rename accidentally drop a preceding extendedWaitUntil visible? MUST NOT. (2) Did any tap change from tapOn a string (anywhere inside) to tapOn an id (exact element) — re-check that the id IS on the outer Pressable, not on inner Text. (3) No app code changes — grep the commit diff to confirm.

- [ ] **Step 3.4: D5 Commit Gate** `fix(qa-03): maestro journey selectors swap regex → testIDs` (single commit). Retire TESTID_GAPS_TODO.md (either delete if repo convention, or rewrite content to "All 18 entries applied. See commit <sha>. Audit log: <table with DONE + commit col>").

- [ ] **Step 3.5: D6 Test Engineer** L1 tsc-noEmit. L2 regression only (YAML changes don't affect compiled bundles but confirm 0 regressions; journeys re-run if journeys package script runs against them).

- [ ] **Step 3.6: D7 QA Validator — THE GOAL**
  Full D7 wrapper (same bash wrapper used at summary point `.cache/maestro-artifacts/d7-qa-20260806_234727/`) — 5 flows total:
  1. launch-smoke (expect rc=0)
  2. sprint7-open-developer-settings (rc=0)
  3. sprint7-initialize-sandbox (rc=0, clears state + reseeds FIRST)
  4. journey-projectswitch-create-taskdetail-update (EXPECT rc=0 NOW)
  5. journey-login-switch-projects (EXPECT rc=0 NOW)
  Require TOTALS: **PASS=5 FAIL=0** exactly. If 1/5 fails at a row id not found: stop — cycle back to D3 Builder for 1 mini-fix micro-commit → re-D7 until 5/5. Do NOT proceed to D8 before 5/5 PASS at least once.

- [ ] **Step 3.7: D8 Delivery**
  Flip M-QA-03 Pipeline → Closed in ROADMAP.md with closed-evidence (artifact path, commit). Update AGENTS.md §Current Delivery Status: remove "await S-UX-01I" line. Commit + push: `docs(qa): close WS-QA/M-QA-03 full L3 5/5 PASS`.

---

### Phase 4. WS-SUPABASE-01: Full Supabase Deep-Dive Inspection (SOLO cycle #4)

**Boundary rule:** Inspection-only per [ws-supabase-01 plan](file:///Volumes/KooDrive/InsiteApp/docs/superpowers/plans/2026-07-01-ws-supabase-01-deep-dive-inspection.md#L17-L22). NO destructive commands. NO commits with secrets, passwords, connection strings, anon/service keys pasted.

- [ ] **Step 4.1: D1 Gate + D2 Planner**
  Confirm M-DATA-02 = Closed (roadmap). Re-read 4 domains + expected deliverables. Planner outputs: file list for 3 docs, plan for optional live-sql read, gates to stop if no credentials exist.

- [ ] **Step 4.2: D3 Builder (docs builder)**
  Deliverable A) System Map (SUPABASE_APP_SYSTEM_MAP.md). Tabular:
  Row = 1 method in src/api + src/state/*Store.supabase.ts. Cols: method, supabase table, col access, RLS policy assumed, optimistic (cached first) vs realtime subscribed, errors handled.
  Deliverable B) Inspection report (SUPABASE_INSPECTION_REPORT_2026-08.md). 4 sections: §1 auth/users, §2 core domain tables, §3 app coupling, §4 runtime safety. Within each: surface review (code) → optional live-db read (if credentials present via ~/.pgpass / env vars only, NEVER paste into terminal, NEVER log) → findings.
  Deliverable C) Findings backlog (SUPABASE_FINDINGS_BACKLOG.md). P0 (blocker) / P1 (high) / P2 (advisory) with title, domain, proposed WS/M id.
  Note on live SQL: Use ONLY the pooler host + psql documented in §Audit Connection Path. If the SQL script `WS_SUPABASE_01_READONLY_AUDIT.sql` doesn't exist yet, build it here from a SELECT-only list (no writes). Save script at `scripts/supabase/WS_SUPABASE_01_READONLY_AUDIT.sql` — this ONE exception to docs-only deliverable rule; script itself is read-only, never destructive.

- [ ] **Step 4.3: D4 Reviewer + TRAE-code-review parallel (docs review, risk focus)**
  Critical checks: (1) NO password, key, full connection URL, jwt tokens in any of the 3 output docs, sql script, or logs — if found, DELETE line + redact before commit. (2) No ALTER/DROP/DROP POLICY/DELETE/TRUNCATE anywhere in new SQL file; only SELECT, SET search_path, SET statement_timeout = '2s' (protect pooler). (3) All mapping rows have source file links (AGENTS.md style file links allowed inside md).

- [ ] **Step 4.4: D5 Commit Gate** `docs(supabase-01): system map + inspection report + findings backlog` (+ one `chore(supabase-01): add readonly audit sql script` if created).

- [ ] **Step 4.5: D6 Test Engineer (lightweight)** — L1 only: if the new SQL script file was written, parse with pgsanity or basic `head -1` + `tail -3` confirm no write keywords; no schema connection needed. D6 is skipped if only pure docs.

- [ ] **Step 4.6: D7 QA Validator (product docs review)**
  Not L3 Maestro. QA Validator reads ROADMAP.md M-SUPABASE-01 closed-evidence draft, confirms: system map references all 5 stores (task, project, user, auth, upload); findings backlog has ≥ 8 entries (mix of P0/P1/P2); report has §1–§4 with non-empty subsections. If gap: back to D3 Builder to fill.

- [ ] **Step 4.7: D8 Delivery**
  Flip M-SUPABASE-01 Pipeline → Closed in ROADMAP.md with evidence (paths to the 3 new docs). Update AGENTS.md §Current Delivery Status: remove "WS-SUPABASE/M-SUPABASE-01" from current pipeline focus and add line: `WS-SUPABASE / M-SUPABASE-01 Closed (YYYY-MM-DD): full Supabase inspection — system map, 4-domain report, P0/P1/P2 findings backlog; live-sql gated by credentials.` Commit + push: `docs(supabase-01): close milestone`.

---

## Potential Dependencies or Considerations

1. **Concurrency rule:** Phases MUST run sequentially — never overlap. This is not a parallelization plan because each Phase's D7 QA depends on the prior one closing.
2. **Metro/iOS simulator availability:** Phases 1, 2, 3 require a live iPhone sim (UDID B7B2640C-...) for D7. If the sim shuts down between Phase boundaries, `xcrun simctl boot <UDID>` then re-verify Metro 8081 reachable BEFORE starting D7.
3. **Expo SDK version lock (project-context.md rule):** NEVER change `expo`, `react-native`, SDK versions, bundle identifiers, or EAS build numbers inside ANY Phase. If a dependency new-version seems "nice to have", skip. Add to SUPABASE findings backlog P2 if relevant.
4. **Supabase credentials (Phase 4):** SUPABASE_SQL_ACCESS.md + ~/.pgpass existence is NOT guaranteed. Treat live-SQL pass as optional; DO NOT block Phase 4 close on a missing credential. Document clearly: "Live DB audit: skipped; code-path only" in the report header.
5. **WS-SUPABASE follow-on milestones:** The remediation backlog (new WS/M/S IDs) MUST NOT be promoted during Phase4 to real roadmap rows — Phase4 is ONLY "propose placeholder ids, with severity + description". Orchestrator will route a future session to groom those backlog items into real WS/M/S slices ONLY if user explicitly asks.
6. **TESTING_STRATEGY.md L4 (periodic runs):** No Phase in this plan runs L4. L3 only when explicitly listed per Phase.
7. **SOLO Reviewer/QA/TE skill invocation:** Because current rules say before touching code, a planner writes scope — never run Builder inline inside Orchestrator; always hand off. Each Phase is 1 Orchestrator dispatch. If this plan is executed as 4 subagent-driven dispatches, each dispatch = 1 Phase.

## Risk Handling

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| S-UX-01H batch-upload breaks existing `uploadImmediately=true` UpdateProgress legacy callers | Medium | High (regresses in-task photo flow) | Step-1.2 Builder must write 2 Jest tests: one call stack with `uploadImmediately=true`; one with `false` + project-only mode. Both must hit fileUploadService but resolve to different paths — confirm with mocked upload calls in Jest. |
| S-UX-01I testID wrappers break inner Pressable `onPress` handlers | Medium | High (breaks tap for users, not just Maestro) | Step-2.4 Reviewer + TRAE-code-review: every added testID must be verified to sit on the Pressable IF its native handler WAS on that Pressable. If wrapping a Text in a View would lose onPress: refactor to `<Pressable testID=... onPress={old}>` instead. |
| M-QA-03 D7 before 5/5 PASS: premature roadmap close | Low | Critical | Hard rule: "Do NOT proceed to D8 before TOTALS shows 5/5 at least once". Gate in Step-3.6. If 3 cycles still fail (10% rate), close out with deferral back to D2 Planner for root-cause analysis instead of endless reruns. |
| Phase4 WS-SUPABASE-01 credentials leak via accidental `echo` | Low | Critical (security) | Step-4.3 Reviewer runs `grep -rE "(password|service_role|jwt|ANON_KEY|PGPASSWORD)=." documentation/ scripts/` as a pre-commit hook inside the review step — any match → fail review before commit gate. |
| Long-session Maestro clearState causes login-submit visibility fail (already observed in D7 5th run summary) | High | Medium | Step-3.6 D7: if after 3 sequential flows the session breaks, run the remaining 2 flows as INDEPENDENT maestro invocations (new process, new sim session). After rc=0 independently, combine summaries with a note. Do not require a single 5-flow contiguous session if the session state drift artifact is the only blocker. |
