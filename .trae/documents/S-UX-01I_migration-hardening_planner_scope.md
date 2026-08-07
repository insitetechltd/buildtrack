# S-UX-01I Migration Hardening & Regression Closure — Planner Scope

**Workstream:** WS-UX / M-UX-01
**Dependency Gate:** S-UX-01H Closed → S-UX-01I is the ONLY legal slice before M-QA-03 full close
**Screen Edit Moratorium:** This slice is the LAST allowed place to touch `src/screens/*.tsx` for M-UX-01. Any screen.tsx writes beyond this slice = NOT ALLOWED.
**Milestone References:** WS-QA/M-QA-03 (Pipeline: L1 6/6 PASS, L2 35/151 PASS, components 7/32 PASS, tsc-noEmit rc=0)

---

## 1. Scope In/Out

### In Scope (5 items)

1. **Sub-pass A — Wrapper Contract TDD Parity Tests for Deferred Schema Fallbacks (taskStore.supabase.ts)**
   - (a1) TDD RED→GREEN Jest coverage for create-task INSERT fallback + retry path (~lines 1549–1560): Supabase rejects payload carrying `primary_assignee_id`/`delegated_user_ids` → `getDeferredTaskSchemaField()` returns truthy → `stripDeferredTaskSchemaFields()` rebuilds payload → second insert succeeds.
   - (a2) TDD RED→GREEN Jest coverage for update-task UPDATE fallback + retry path (~lines 1943–1960): same deferred-field detection, `stripDeferredTaskSchemaFields()`, empty-update short-circuit guard, and Zustand optimistic-merge branch.
   - NO PROD CODE CHANGES unless tests reveal a real bug. Both fallback paths already exist — tests just exercise them.

2. **Sub-pass B — 18 testIDs Applied to Specified Surfaces (TESTID_GAPS_TODO.md)**
   - **P0 ×6 required pre-M-QA-03-close:**
     - ProjectPicker row ×3: `<Pressable testID="project-picker__row-${projectId}">` — apply to the outer Pressable on each row (currently at `ProjectPickerScreen.tsx:74` uses `projectPicker-project-${projectId}` → rename to match convention; ensure the single outer Pressable wraps both title + description `<Text>` children).
     - ProfileMenu "Change Project" entry: `testID="profile-menu__change_project"` on the trigger Pressable at `ProfileMenu.tsx:112` (currently `profile-menu-project_picker` — rename to match TESTID_GAPS convention).
     - TasksScreen list row: `testID="tasks-screen__row_${row.taskId}"` on the Pressable/root interactable wrapper that receives row-tap onPress — NOT the inner-only `tasks-screen__row_wrapper_${taskId}` View.
     - UpdateProgress success-confirm (Alert OK → or alternate success modal surface): `testID="update-progress__success_confirm"` on the Pressable that dismisses the success UX (native Alert OK has no testID; if a custom Toast/Modal alternate surface exists place it there; otherwise document the gap as native-Alert-unaddressable but align naming).
   - **P1 ×12 string-match selectors:**
     - Dashboard empty-project-copy: `dashboard-empty-state__no_project_selected` on root inert View holding the "Select a project to view…" copy (`DashboardScreen.tsx:57`).
     - CreateTask form result title-preview: `create-task__field_title--preview` on the Text/View holding the reactive title render in CreateTask form.
     - TaskDetail header title: `task-detail__header_title` on the header title Text (`TaskDetailScreen.tsx`).
     - UpdateProgress screen heading: `update-progress__screen_title` on the "Progress Update" heading Text.
     - UpdateProgress description-preview: `update-progress__description--preview` on inline rendered progress note Text.
     - UpdateProgress photo-picker sheet title: `photo-picker__sheet_title` on "Choose how you want to add photos" sheet heading.
     - UpdateProgress photo-picker cancel: `photo-picker__cancel` on the cancel Pressable.
     - UpdateProgress success toast message: `update-progress__success_message` on the toast Text copy.
     - CreateTask alternate success-confirm: `create-task__submit-success_confirm_alt` alias (if a second OK surface exists beyond the current `create-task__submit-success-confirm` at `CreateTaskScreen.tsx:1092`).
     - TasksScreen: confirm `tasks-screen__row_${taskId}` is also reachable at Maestro-level (Swipable inner card matches this pattern already per TasksScreen.tsx:378).
     - Dashboard empty activity state + Projects empty state: any remaining P1 string-based selects in journey YAMLs that appear in the 18-count.
   - RULE for ALL Sub-pass B testIDs: place `testID` on the `Pressable` (or root interactable `View` for inert surfaces) that ACTUALLY receives `onPress`, never an inner decorative View.

3. **Sub-pass C — Legacy Status Alias + Worker→Member Parity Tests (buildtrack.ts)**
   - TDD Jest: map every legacy status string (not_started, completed, received, reviewing, wip, done, assigned per `buildtrack.ts:75–81`) to its modern TaskStatus counterpart and back.
   - Worker→member alias parity: `getUserSystemPermission()` at `buildtrack.ts:696–708` maps `user.role === "worker"` → returns `"member"`.
   - Task/subtask unified aliases near `buildtrack.ts:556` confirm unified `Task` interface carries `parentTaskId`/`nestingLevel`/`rootTaskId`; ensure no drift between types/taskStore fallback status names and buildtrack.ts aliases.
   - RED if any alias mismatch exists; GREEN confirm parity across all three loci (status map line 74, member alias line 694, unified task shape line 556).

4. **Sub-pass D — Dashboard `project:*` Synthetic Row Activity Logging Parity Tests**
   - Jest test confirms: taskIds prefixed with `project:` (synthetic unattached batches per `useDashboardViewAdapter.ts:660` `taskId: \`project:${batch.projectId}\``) →
     - Pass `disabled={true}` to `ActivityStyleRowCard` Pressable (per `DashboardScreen.tsx:153`).
     - Do NOT invoke `navigation.push` / `onNavigateToTaskDetail` when tapped (disabled Pressable eats the event).
     - Render `badgeLabel === "Saved to project"` correctly (per `useDashboardViewAdapter.ts:669`) and the badge-plain/badge-pill branch is reached as expected.
   - Uses existing rendering branches — test confirms the branch is reached, no prod logic changes.

5. **Sub-pass E — Regression Sanity Checks on D6 Baseline Numbers (Zero New Failures)**
   - Re-run: L1 journeys 5 suites 6 tests, L2 regression 35/151, components 7/32, `tsc --noEmit`, M-QA-02 foundation 3/3 cross.
   - Explicit fail-gate: any of these regress → return to Sub-pass A/B/C/D builder before moving forward. No new features allowed to paper over regressions.

### Out of Scope (EXPLICITLY FORBIDDEN)

- **Schema mutations.** No Supabase DDL, no migration files, no `CREATE TABLE`/`ALTER TABLE`.
- **New features beyond parity tests and testIDs.** No UI features, no new user journeys, no new behavior past the test-only assertions above.
- **New components.** No new `.tsx` files under `src/components/`.
- **New stores.** No new Zustand stores, no new state slices beyond existing.
- **New API surface.** No new Supabase queries, no new REST endpoints, no new file upload paths.
- **Any screen.tsx writes beyond this slice.** Per dependency chain rules, post-S-UX-01I all screen edits are blocked for M-UX-01.
- **Prod code changes in Sub-pass A / C / D unless tests find a real bug.** These are parity test additions only; red/green on existing behavior.

---

## 2. 7-Step Execution Plan (Exact Files per Step)

### Step 1 — Sub-pass A (TDD): Jest tests for create+update deferred schema fallbacks
**Files touched (NEW only):**
- `NEW: src/__tests__/unit/taskStore.deferred-fallback.contract.test.ts` (~180 lines)

**Bite-sized code blocks (predictable structure):**
```ts
// (1) Arrange: mock supabase client with FIRST insert() call returning
//     { error: { code: '42703', message: 'column primary_assignee_id...' } }
//     and SECOND insert() call (after stripDeferred) returning { data: task }
// (2) Act:   createTask(...)
// (3) Assert:
//   - supabase.from('tasks').insert called TWICE
//   - 1st call payload contains primary_assignee_id / delegated_user_ids
//   - 2nd call payload omits them (stripDeferred worked)
//   - returned task normalized correctly
//
// Repeat pattern for updateTask around lines 1943–1960:
//   - 1st update() rejects with deferred-field error
//   - 2nd update() (stripDeferred) succeeds
//   - empty-update → skippedCompatibilityOnlyUpdate branch hit
//   - Zustand optimistic map reached (tasks array re-normalized)
```
Run: `npm test -- src/__tests__/unit/taskStore.deferred-fallback.contract.test.ts`
Expect: RED on first run (tests reach the fallback branch assertions — if they don't pass first run, only then inspect prod).

### Step 2 — Sub-pass B P0 (6 testIDs): ProjectPicker ×3 + ProfileMenu + TasksScreen row + UpdateProgress OK
**Files touched (EDIT only):**
- `EDIT: src/screens/ProjectPickerScreen.tsx` (~lines 72–90: Rename existing `testID="projectPicker-project-${project.projectId}"` → `testID="project-picker__row-${project.projectId}"` on the outer `<Pressable>` that wraps both title + description Text children. Pressable is already the single outer wrapper → rename only.)
- `EDIT: src/components/ProfileMenu.tsx` (~line 112: Rename `testID="profile-menu-project_picker"` → `testID="profile-menu__change_project"` on the Pressable that carries onChangeProject.)
- `EDIT: src/screens/TasksScreen.tsx` (~lines 336–378: Move `tasks-screen__row_${row.taskId}` from inner card (line 378) UP to the root onPress-carrying Pressable/View of the row. The current `tasks-screen__row_wrapper_${row.taskId}` at line 336 is a non-interactive View; replace that View's testID with `tasks-screen__row_${row.taskId}` OR if the Swipeable's inner ActivityStyleRowCard is the tap target, keep it there and confirm this is the Pressable Maestro will tap.)
- `EDIT: src/screens/UpdateProgressScreen.tsx` OR alternate success surface (~lines 266–269: `Alert.alert()` native OK has no testID. If there is a custom Toast/Modal component used anywhere else for this success, place `testID="update-progress__success_confirm"` on its OK Pressable. If only Alert.alert exists, add a comment `// P0 testID gap: native Alert.alert carries no testID — "OK" text match retained in Maestro.` and continue; the gap remains logged.)

### Step 3 — Sub-pass B P1 (12 testIDs): Remaining string-match surfaces across screens
**Files touched (EDIT only — each edit is 1 line, adding a testID prop):**
- `EDIT: src/screens/DashboardScreen.tsx` (~line 57: add `testID="dashboard-empty-state__no_project_selected"` on the root View carrying "Select a project to view the active project summary…")
- `EDIT: src/screens/DashboardScreen.tsx` (~line 160: add testID for activity-empty state if referenced in gaps)
- `EDIT: src/screens/CreateTaskScreen.tsx` (~form reactive title preview block: add `testID="create-task__field_title--preview"`; ~line 1092 confirm `create-task__submit-success-confirm` already exists, add `create-task__submit-success_confirm_alt` alias on same or alternate surface)
- `EDIT: src/screens/TaskDetailScreen.tsx` (~header title: add `testID="task-detail__header_title"`)
- `EDIT: src/screens/UpdateProgressScreen.tsx` (~heading: `testID="update-progress__screen_title"` on "Progress Update"; ~progress note preview: `testID="update-progress__description--preview"`; ~photo sheet title: `testID="photo-picker__sheet_title"` on "Choose how…"; ~photo sheet cancel: `testID="photo-picker__cancel"`; ~success toast message Text: `testID="update-progress__success_message"`)

### Step 4 — Sub-pass C (TDD): Jest tests for legacy status alias parity
**Files touched (NEW only):**
- `NEW: src/__tests__/unit/buildtrack.legacy-aliases.parity.test.ts` (~160 lines)

**Bite-sized code blocks:**
```ts
// Suite 1 — legacy TaskStatus aliases → modern canonical round-trip
//   for each of [not_started, completed, received, reviewing, wip, done, assigned]:
//     assert mapLegacyToModern() output matches the canonical modern
//     assert roundTrip through normalizeTaskActivityCompatibility() preserves
//
// Suite 2 — getUserSystemPermission worker→member alias:
//   { role: "worker" } → returns "member"
//   { role: "admin"|"manager"|"member" } → passes through unchanged
//   { systemPermission: "member", role: "worker" } → prefers new field (returns "member")
//
// Suite 3 — Task unified shape:
//   Buildtrack.Task { parentTaskId, nestingLevel, rootTaskId } fields present
//   taskStore types.ts Task (if any) matches buildtrack.Task shape
```
Run: `npm test -- src/__tests__/unit/buildtrack.legacy-aliases.parity.test.ts`
Expect: RED if any alias mismatch → GREEN confirm parity.

### Step 5 — Sub-pass D (TDD): Jest tests for Dashboard project:* synthetic rows
**Files touched (NEW only):**
- `NEW: src/__tests__/unit/dashboard.project-synthetic-row.parity.test.ts` (~120 lines)

**Bite-sized code blocks:**
```ts
// (1) Render <ActivityStyleRowCard testID="X" disabled={true} onPress={mockOnPress} badgeLabel="Saved to project" …/>
// (2) fireEvent.press(getByTestId('X')) → expect(mockOnPress).not.toHaveBeenCalled()
// (3) render variant with disabled={false} → expect(mockOnPress).toHaveBeenCalledTimes(1)
// (4) assert badgeText: getByText("Saved to project") rendered in badge-plain branch
// (5) integrate with useDashboardViewAdapter output:
//     build output.activityItems with batch rows →
//     for each item where taskId.startsWith('project:'):
//       assert item.statusLabel === "Saved to project"
```
Run: `npm test -- src/__tests__/unit/dashboard.project-synthetic-row.parity.test.ts`

### Step 6 — Sub-pass E: Regression sanity run against D6 baseline numbers
**Commands (no file writes unless tsc reveals type errors):**
```bash
# Compile
npx tsc --noEmit

# L1 journeys 5 suites 6 tests (should remain 6/6 PASS)
npm run test:e2e:journeys

# L2 regression 35/151 (components 7/32) — target: no regressions from baseline
npm run test:regression
#   = test:tasks (Jest) + test:uploads + test:components + test:integration

# M-QA-02 foundation cross-verify (3/3 baseline)
npm run validate:local:maestro
#   (iff simulator/device available; otherwise mark as manual-gate)
```

### Step 7 — Close-out: TESTID_GAPS_TODO.md check-off + plan handoff
**Files touched (EDIT only — update the TODO rows to DONE):**
- `EDIT: maestro/TESTID_GAPS_TODO.md` (for each of 18 rows: mark with a `[x]` / column `Status: Done`, or if native-Alert gap remains → `Status: Native Alert (unaddressable)`).
- `EDIT (comment only if prod gaps unreachable):` inline code comments on unaddressable testID surfaces explaining why (native Alert.alert etc.).

---

## 3. Likely Files List — NEW vs EDIT with Expected Line Counts

| File | Action | Expected Δ lines | Notes |
|---|---|---|---|
| `src/__tests__/unit/taskStore.deferred-fallback.contract.test.ts` | **NEW** | +180 | Sub-pass A. create + update fallback tests. Uses existing mock patterns from `taskStore.supabase.unit.test.ts`. |
| `src/__tests__/unit/buildtrack.legacy-aliases.parity.test.ts` | **NEW** | +160 | Sub-pass C. 3 suites: status round-trip, worker→member, unified Task shape. |
| `src/__tests__/unit/dashboard.project-synthetic-row.parity.test.ts` | **NEW** | +120 | Sub-pass D. ActivityStyleRowCard disabled=true + badge text + adapter output contract. |
| `src/screens/ProjectPickerScreen.tsx` | **EDIT** | ~±3 | Line 75 rename `projectPicker-project-${id}` → `project-picker__row-${id}` (1-line edit). No structural changes — Pressable is already the single outer wrapper containing both Text children. |
| `src/components/ProfileMenu.tsx` | **EDIT** | ±1 | Line 112 rename `profile-menu-project_picker` → `profile-menu__change_project` (1-line testID rename). |
| `src/screens/TasksScreen.tsx` | **EDIT** | ±3 | Lines 336/378: elevate `tasks-screen__row_${taskId}` from inner card (line 378) to root row wrapper that carries onPress; confirm Swipeable does not mask taps. |
| `src/screens/UpdateProgressScreen.tsx` | **EDIT** | ~+6 / ±3 | Add testIDs: screen_title, description--preview, photo-picker sheet title+cancel, success_message. If Alert.alert has no alternate surface — add 1-line comment (no testID). update-progress__success_confirm may be unaddressable on native Alert; document. |
| `src/screens/DashboardScreen.tsx` | **EDIT** | ±2 | Add `dashboard-empty-state__no_project_selected` testID on line 57 View. If referenced empty activity state at line 160 also needs testID → +1 more. |
| `src/screens/CreateTaskScreen.tsx` | **EDIT** | ±2 | Add `create-task__field_title--preview` on reactive form title preview. Confirm `create-task__submit-success-confirm` (line 1092) is correct; if alternate OK surface exists, add `create-task__submit-success_confirm_alt`. |
| `src/screens/TaskDetailScreen.tsx` | **EDIT** | ±1 | Add `task-detail__header_title` testID on header title Text. |
| `maestro/TESTID_GAPS_TODO.md` | **EDIT** | ~±20 | Check off all 18 gaps (column or column-side notes); mark native-Alert unaddressable with rationale. |
| **TOTAL NEW files:** 3 |  | **+460 lines (all test code)** | |
| **TOTAL EDIT files:** 8 |  | **~±23 lines (1-line testID adds / renames + comments)** | |
| **TOTAL PROD CODE ADDS:** Zero new components, zero new stores, zero schema |  |  | |

---

## 4. Full L1/L2/L3 Validation Plan

### L1 — Jest Unit Journeys (target: 6/6 + new suites PASS)
Package script: **`npm run test:e2e:journeys`**
Test file paths (existing baseline + new):
- `src/__tests__/journeys/authenticated-shell.journey.test.tsx`
- `src/__tests__/journeys/dashboard-project-switch-dashboard.journey.test.tsx`
- `src/__tests__/journeys/project-switching.journey.test.tsx`
- `src/__tests__/journeys/task-detail-verification.journey.test.tsx`
- `src/__tests__/journeys/tasks-createentry-back.journey.test.tsx`

**NEW L1-adjacent suites run individually:**
```bash
npm test -- src/__tests__/unit/taskStore.deferred-fallback.contract.test.ts   # Sub-pass A
npm test -- src/__tests__/unit/buildtrack.legacy-aliases.parity.test.ts       # Sub-pass C
npm test -- src/__tests__/unit/dashboard.project-synthetic-row.parity.test.ts # Sub-pass D
```

### L2 — Regression Suite (target: 35/151 baseline MINIMUM; 7/32 components MINIMUM — NO REGRESSIONS)
Package script: **`npm run test:regression`**
Expands to:
- `npm run test:tasks`
  - `src/state/__tests__/taskStore.supabase.unit.test.ts`
  - `src/state/__tests__/taskStore.supabase.workflow.test.ts`
- `npm run test:uploads`
  - `src/api/__tests__/fileUploadService/**`
- `npm run test:components`
  - `src/components/__tests__/**` (7/32 PASS baseline — new components NOT in scope so 7/32 holds)
- `npm run test:integration`
  - `src/__tests__/integration/**`

**Compile gate:**
```bash
npx tsc --noEmit   # baseline rc=0 — MUST hold at rc=0
```

### L3 — Maestro End-to-End (target: 3/3 M-QA-02 + 2/2 M-QA-03 critical journeys PASS)
Package script: **`npm run validate:local:maestro`**
Runs:
1. `npm run validate:local:confidence` → wraps `validate-local.sh` with `VALIDATE_LOCAL_RUN_JOURNEYS=1` (L1+L2)
2. `npm run test:e2e:maestro:journeys`
   - `maestro/flows/journey-projectswitch-create-taskdetail-update.yaml` (exercises: ProjectPicker rows A/B/C now by `project-picker__row-${id}`; ProfileMenu "Change Project" now by `profile-menu__change_project`; TasksScreen row now by `tasks-screen__row_${taskId}`; UpdateProgress success confirm now tries `update-progress__success_confirm` before text fallback)
   - `maestro/flows/journey-login-switch-projects.yaml` (same ProjectPicker + ProfileMenu selector swap)

**Optional M-QA-02 3/3 re-verify (if UDID reachable):**
```bash
bash scripts/maestro/run-local.sh test maestro/flows/launch-smoke.yaml
bash scripts/maestro/run-local.sh test maestro/flows/sprint7-open-developer-settings.yaml
bash scripts/maestro/run-local.sh test maestro/flows/sprint7-initialize-sandbox.yaml
```

### L3 Fail Gate Matrix
| If | Then |
|---|---|
| L1 new suites FAIL RED (and it's not a code bug — tests mis-target the branch) | Edit tests only. Do NOT touch prod to green a bad test. |
| L1 new suites FAIL RED → investigation shows REAL prod bug | Exception allowed: minimal surgical prod fix in taskStore.supabase.ts or buildtrack.ts. Require Reviewer sign-off on the prod change. |
| L2 35/151 → 34/151 or worse | Halt. Bisect to offending file change in Step 2/3. Do not proceed to Step 7 until regression reverted. |
| tsc --noEmit rc≠0 | Fix type errors. Almost certainly a wrong `testID` value type (literal strings only) or missed `key` prop in a map. |
| L3 Maestro journey-projectswitch-*.yaml fails selector tap on a renamed testID | Check Maestro YAML — flow selector still uses text match; confirm the new id: selector in-flight swap is working. If not → push a testID rename correction back to the Step that introduced it. |

---

## 5. Repo-Aligned Assumptions

1. **Milestone status assumption.** S-UX-01H is Closed per AGENTS.md Current Delivery Status. M-QA-03 is currently "Pipeline" waiting on this slice. S-UX-01I completion gates M-QA-03 full close. No other WS-UX/M-UX-01 slices may start before this slice is fully Closed.
2. **Both deferred-schema fallback paths already exist.** `taskStore.supabase.ts` lines ~1549–1560 (create insert+retry) and ~1943–1960 (update update+retry) — Sub-pass A is test-only: exercises existing behavior. RED means tests don't hit the branch, not that code is missing. Only if investigation reveals code bug do we touch prod.
3. **ProjectPicker rows already use a single outer Pressable carrying the id.** ProjectPickerScreen.tsx:73–90 shows one `<Pressable>` wrapping `<View><Text>{title}</Text><Text>{description}</Text>…`. No structural nesting refactor required; only a rename of the testID string. If this assumption is wrong (e.g., split Pressables per Text child), Builder reports back immediately and Planner amends scope — no improvisation.
4. **ProfileMenu testID at ProfileMenu.tsx:112 is correct surface.** Currently `profile-menu-project_picker` on the Pressable carrying onChangeProject. Rename to `profile-menu__change_project` to match TESTID_GAPS_TODO convention. This is the exact same Pressable Maestro currently taps via text "Change Project".
5. **TasksScreen.tsx row-wrapping semantics.** Current TasksScreen structure at lines 336–378: outer `View testID=tasks-screen__row_wrapper_${id}` → inside Swipeable → inside ActivityStyleRowCard `testID=tasks-screen__row_${id}`. The Maestro P0 gap `tasks-list__row-${taskId}` (TODO) maps to Builder convention `tasks-screen__row_${row.taskId}`. Assumption: the inner ActivityStyleRowCard Pressable IS what Maestro taps when it taps a row — if so, keep testID on the ActivityStyleRowCard (already correct at line 378). If the outer wrapper needs to carry the id for Maestro visibility, move it up. Builder validates by running the Maestro selector once; no silent structural edits.
6. **UpdateProgress success UX = `Alert.alert()` carries no testID.** UpdateProgressScreen.tsx lines 266–269 call `Alert.alert(t.errors.success, t.taskDetail.progressUpdateAdded)`. React Native native Alert buttons carry no testID prop. Assumption: TESTID_GAPS P0 gap `update-progress__success_confirm` for the "OK" confirm either (a) has a custom alternate success Toast/Modal surface elsewhere in app that we can tag, or (b) remains a native-Alert text-match gap logged as such in TESTID_GAPS_TODO.md with a comment inline. Builder verifies alternate surface first. If truly no alternate exists, we DO NOT introduce a new custom Toast component (out of scope — "no new components"); we document the gap as platform limitation and accept Maestro text-match for this one P0.
7. **buildtrack.ts lines 74 legacy status map / line 694 worker→member / line 556 unified Task shape are the sole sources of truth.** No parallel alias definitions in other files. If Builder finds parallel definitions, they are drift; add to the Sub-pass C RED test cases.
8. **Dashboard project:* synthetic row implementation matches test intent.** useDashboardViewAdapter.ts line 660 sets `taskId: \`project:${batch.projectId}\``, line 669 sets `statusLabel: "Saved to project"`, and DashboardScreen.tsx line 153 reads `taskId.startsWith("project:")` to set `disabled={true}` on ActivityStyleRowCard. Sub-pass D tests confirm these three lines cohere end-to-end. Assumption: the disabled Pressable correctly absorbs onPress events in the @testing-library/react-native fireEvent semantics (ActivityStyleRowCard.tsx line 49 already passes `disabled` through to `<Pressable disabled={disabled}>`).
9. **D6 baseline numbers are the floor.** L1 6/6, L2 35/151, components 7/32, tsc rc=0, M-QA-02 3/3. These are minimums — any improvement is a bonus but strictly not required; any regression is a hard stop.
10. **No schema, no new components, no new stores.** Scope forbids these. If a test surfaces a bug that seems to require one of those, escalate — do not implement. Autonomy policy §0: scope expansion > one bounded extension requires user clarification.
