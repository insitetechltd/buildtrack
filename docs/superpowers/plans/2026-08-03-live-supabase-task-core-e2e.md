# Live Supabase Task Core E2E Implementation Plan

> **Disposition (2026-08-27): CLOSED / ARCHIVED — do not execute.**
>
> Work represented here was completed on `master` under **WS-QA / M-QA-03 Closed (2026-08-07)**
> (L3 Maestro 5/5 rc=0; evidence in `documentation/ROADMAP.md` M-QA-03 Notes + AGENTS.md).
> Successor SoT on master: `docs/superpowers/plans/2026-08-01-ws-qa-03-automated-confidence-and-e2e-coverage.md`,
> `TESTING_STRATEGY.md`, `maestro/TESTID_GAPS_TODO.md`, `scripts/maestro/run-local.sh`.
> This file is retained as historical planning context from the `slice/m-qa-03-automation-loop` worktree.



> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the task-core Maestro slice from Sprint 7 sandbox bootstraps to the working real Supabase-backed login foundation, then implement task creation, assignment, progress update, task completion, and photo upload in that order.

**Architecture:** Keep the shared live bootstrap minimal: login and land on the authenticated dashboard. Use deterministic Supabase fixture cleanup so each task-core flow operates on known live data, then create one small Maestro flow per task-core slice. Reuse existing screen selectors where they already exist, and only add code changes when the live path cannot be driven or asserted reliably.

**Tech Stack:** Expo-managed React Native, TypeScript, Supabase Auth, Supabase Postgres via admin seeding, Maestro, Jest, Zustand, React Navigation.

---

## File Map

- Modify: `scripts/comprehensive-test.ts`
- Create: `maestro/flows/bootstrap-live-worker-a1.yaml`
- Create: `maestro/flows/task-core-live-create.yaml`
- Create: `maestro/flows/task-core-live-assign.yaml`
- Create: `maestro/flows/task-core-live-progress.yaml`
- Create: `maestro/flows/task-core-live-complete.yaml`
- Create: `maestro/flows/task-core-live-photo-upload.yaml`
- Modify: `package.json`
- Modify: `maestro/README.md`

## Task 1: Make Live Task-Core Data Repeatable

**Files:**
- Modify: `scripts/comprehensive-test.ts`

- [ ] **Step 1: Add the failing live create flow title constants to the cleanup target set**

```ts
const LIVE_TASK_CORE_TITLES = [
  'Live E2E Task Core Create',
  'Live E2E Task Core Assigned',
  'Live E2E Task Core Progress',
  'Live E2E Task Core Completion',
  'Live E2E Task Core Photo Upload',
];
```

- [ ] **Step 2: Run the existing comprehensive seed and verify those titles are not yet cleaned**

Run: `npm run test:comprehensive`
Expected: PASS, but the script does not yet mention or clean the live task-core titles.

- [ ] **Step 3: Extend cleanup to delete live task-core tasks before reseeding**

```ts
const taskTitles = [...TEST_DATA.tasks.map((task) => task.title), ...LIVE_TASK_CORE_TITLES];

await supabaseAdmin.from('tasks').delete().in('title', taskTitles);
```

- [ ] **Step 4: Re-run the comprehensive seed to verify deterministic cleanup still passes**

Run: `npm run test:comprehensive`
Expected: PASS

## Task 2: Add Minimal Live Bootstraps

**Files:**
- Create: `maestro/flows/bootstrap-live-worker-a1.yaml`

- [ ] **Step 1: Write the failing worker bootstrap using the same shape as the manager bootstrap**

```yaml
appId: com.buildtrack.app.local
---
- launchApp:
    clearState: true
- openLink:
    link: "exp+buildtrack://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"
- assertVisible:
    id: "login-submit"
- tapOn:
    id: "login-emailOrPhone"
- inputText: "alice.workera1@test.com"
- tapOn:
    id: "login-password"
- inputText: "password123"
- tapOn:
    id: "login-submit"
- assertVisible:
    id: "dashboard-screen__root"
```

- [ ] **Step 2: Run the worker bootstrap directly and verify it reaches the authenticated shell**

Run: `bash ./scripts/maestro/run-local.sh test maestro/flows/bootstrap-live-worker-a1.yaml`
Expected: PASS

## Task 3: Implement Live Task Creation And Assignment

**Files:**
- Create: `maestro/flows/task-core-live-create.yaml`
- Create: `maestro/flows/task-core-live-assign.yaml`

- [ ] **Step 1: Write the failing live creation flow**

```yaml
appId: com.buildtrack.app.local
---
- runFlow: bootstrap-live-manager-a.yaml
- tapOn:
    id: "root-tab__camera_button"
- assertVisible:
    id: "create-task__continuous_form"
- tapOn:
    id: "createTask-title"
- inputText: "Live E2E Task Core Create"
- tapOn:
    id: "createTask-description"
- inputText: "Created from the real Supabase-backed task-core create slice."
- tapOn:
    id: "create-task__submit-button"
- assertVisible:
    id: "dashboard-screen__root"
```

- [ ] **Step 2: Run the live creation flow and verify where it fails**

Run: `bash ./scripts/maestro/run-local.sh test maestro/flows/task-core-live-create.yaml`
Expected: FAIL on the first live navigation or assertion that is not yet stable.

- [ ] **Step 3: Make the smallest flow-only adjustments needed to land the created task in a visible manager list**

```yaml
- tapOn:
    id: "root-tab__tasks_pressable"
- assertVisible:
    id: "tasks-screen__task_list"
- assertVisible: ".*Live E2E Task Core Create.*"
```

- [ ] **Step 4: Write the failing assignment flow against the created task**

```yaml
appId: com.buildtrack.app.local
---
- runFlow: bootstrap-live-manager-a.yaml
- tapOn:
    id: "root-tab__tasks_pressable"
- tapOn: ".*Live E2E Task Core Create.*"
- assertVisible:
    id: "task-detail__quick-actions"
- tapOn: "Edit Task Details"
```

- [ ] **Step 5: Run the assignment flow and verify where the edit/assignment path fails**

Run: `bash ./scripts/maestro/run-local.sh test maestro/flows/task-core-live-assign.yaml`
Expected: FAIL until the live edit path and assignee selection are mapped correctly.

- [ ] **Step 6: Finish the assignment flow by selecting one worker and asserting the updated task detail/list state**

```yaml
- tapOn: "Select users to assign"
- tapOn: "Alice Worker A1"
- tapOn: "Done (1 selected)"
- tapOn:
    id: "create-task__submit-button"
- assertVisible: ".*1 selected.*"
```

## Task 4: Implement Live Progress, Completion, And Photo Upload

**Files:**
- Create: `maestro/flows/task-core-live-progress.yaml`
- Create: `maestro/flows/task-core-live-complete.yaml`
- Create: `maestro/flows/task-core-live-photo-upload.yaml`

- [ ] **Step 1: Write the failing worker progress flow**

```yaml
appId: com.buildtrack.app.local
---
- runFlow: bootstrap-live-worker-a1.yaml
- tapOn:
    id: "dashboard-screen__queue_cell_my_queue_new"
- assertVisible:
    id: "tasks-screen__task_list"
- assertVisible: ".*Live E2E Task Core Create.*"
- tapOn: ".*Live E2E Task Core Create.*"
- tapOn:
    id: "task-detail__quick-action-accept_task"
```

- [ ] **Step 2: Run the worker progress flow and verify the failure point**

Run: `bash ./scripts/maestro/run-local.sh test maestro/flows/task-core-live-progress.yaml`
Expected: FAIL until the worker path and target task state are confirmed.

- [ ] **Step 3: Extend the worker progress flow through update submission**

```yaml
- tapOn:
    id: "task-detail__quick-action-update_progress"
- tapOn:
    id: "update-progress__submit"
- assertVisible:
    id: "task-detail__bottom_action_bar"
```

- [ ] **Step 4: Write the failing completion flow using the manager as reviewer**

```yaml
appId: com.buildtrack.app.local
---
- runFlow: bootstrap-live-manager-a.yaml
- tapOn:
    id: "root-tab__tasks_pressable"
- assertVisible: ".*Live E2E Task Core Create.*"
- tapOn: ".*Live E2E Task Core Create.*"
- assertVisible:
    id: "task-detail__quick-action-approve_task"
```

- [ ] **Step 5: Run the completion flow and verify whether the current live fixture/user model supports creator approval**

Run: `bash ./scripts/maestro/run-local.sh test maestro/flows/task-core-live-complete.yaml`
Expected: FAIL until the real review state is reached or the fixture model is extended.

- [ ] **Step 6: Write the failing photo-upload flow**

```yaml
appId: com.buildtrack.app.local
---
- runFlow: bootstrap-live-worker-a1.yaml
- addMedia:
    - "../../assets/icon.png"
- tapOn: ".*Live E2E Task Core Create.*"
- tapOn:
    id: "task-detail__quick-action-update_progress"
- tapOn:
    id: "update-progress__add-photos"
- runFlow: pick-first-image.yaml
- tapOn:
    id: "photo-selection__confirm"
```

- [ ] **Step 7: Run the photo-upload flow and verify the first real failure**

Run: `bash ./scripts/maestro/run-local.sh test maestro/flows/task-core-live-photo-upload.yaml`
Expected: FAIL until the live photo route and evidence assertions are stable.

## Task 5: Promote The Live Task-Core Command Surface

**Files:**
- Modify: `package.json`
- Modify: `maestro/README.md`

- [ ] **Step 1: Point the task-core script at the new live flow set**

```json
"test:e2e:maestro:task-core": "bash ./scripts/maestro/run-local.sh test maestro/flows/task-core-live-*.yaml"
```

- [ ] **Step 2: Update the Maestro readme to describe the live Supabase-backed slice and the minimal login bootstraps**

```md
- `bootstrap-live-manager-a.yaml`: logs the seeded manager into the authenticated dashboard.
- `bootstrap-live-worker-a1.yaml`: logs the seeded worker into the authenticated dashboard.
- `task-core-live-*.yaml`: covers live task creation, assignment, progress, completion, and photo upload.
```

- [ ] **Step 3: Run the final live task-core command surface**

Run: `npm run test:e2e:maestro:task-core`
Expected: PASS, or a single known failing slice that clearly identifies the next required app or fixture change.
