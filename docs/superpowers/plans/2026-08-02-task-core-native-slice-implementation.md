# Task Core Native Slice Implementation Plan

> **Disposition (2026-08-27): CLOSED / ARCHIVED — do not execute.**
>
> Work represented here was completed on `master` under **WS-QA / M-QA-03 Closed (2026-08-07)**
> (L3 Maestro 5/5 rc=0; evidence in `documentation/ROADMAP.md` M-QA-03 Notes + AGENTS.md).
> Successor SoT on master: `docs/superpowers/plans/2026-08-01-ws-qa-03-automated-confidence-and-e2e-coverage.md`,
> `TESTING_STRATEGY.md`, `maestro/TESTID_GAPS_TODO.md`, `scripts/maestro/run-local.sh`.
> This file is retained as historical planning context from the `slice/m-qa-03-automation-loop` worktree.



> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Slice 1 of the essential test matrix by adding native-heavy `Task Core + Photo Upload` coverage with manager, worker, and reviewer handoffs plus supporting seeded-state, selector, and regression coverage.

**Architecture:** Extend the existing Sprint 7 runtime sandbox so it can seed and switch three deterministic roles, then add stable automation entrypoints and task-flow selectors that Maestro can drive repeatedly without typed credentials. Keep Maestro as the primary proof layer for the new slice, and use Jest to lock down seed behavior, route contracts, and list/detail sync rules that are cheaper to validate off-simulator.

**Tech Stack:** Expo-managed React Native, TypeScript, Zustand, React Navigation, Jest, Maestro, AsyncStorage, existing Sprint 7 runtime sandbox helpers.

---

## File Map

**Seeded task-core role model**
- Modify: `src/test-utils/sprint7Seeds.ts`
- Modify: `src/test-utils/sprint7RuntimeSandbox.ts`
- Test: `src/test-utils/__tests__/sprint7Seeds.test.ts`
- Test: `src/test-utils/__tests__/sprint7RuntimeSandbox.test.ts`

**Automation entrypoints and role switching**
- Modify: `src/navigation/screenAutomation.ts`
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/ui/viewAdapters/useDeveloperSettingsViewAdapter.ts`
- Test: `src/navigation/__tests__/screenAutomation.test.ts`
- Test: `src/__tests__/integration/DeveloperSettingsScreen.test.tsx`

**Selector hardening for task-core flows**
- Modify: `src/screens/CreateTaskScreen.tsx`
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/screens/UpdateProgressScreen.tsx`
- Modify: `src/screens/PhotoSelectionScreen.tsx`
- Modify: `src/screens/TasksScreen.tsx`
- Test: `src/__tests__/integration/CreateTaskScreen.test.tsx`
- Test: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- Test: `src/__tests__/integration/UpdateProgressScreen.header.test.tsx`
- Create: `src/__tests__/integration/TaskCoreAutomationSelectors.test.tsx`

**Native task-core suite**
- Create: `maestro/flows/task-core-manager-create-assign.yaml`
- Create: `maestro/flows/task-core-worker-update-upload.yaml`
- Create: `maestro/flows/task-core-reviewer-close.yaml`
- Create: `maestro/flows/task-core-list-accuracy.yaml`
- Modify: `package.json`
- Modify: `maestro/README.md`

**Supporting Jest regression and status docs**
- Create: `src/__tests__/journeys/task-core-cross-screen-sync.journey.test.tsx`
- Create: `src/__tests__/integration/taskCoreSlice.state-sync.test.tsx`
- Modify: `TESTING_STRATEGY.md`

## Task 1: Expand Sprint 7 Seed Coverage To Three Roles

**Files:**
- Modify: `src/test-utils/sprint7Seeds.ts`
- Modify: `src/test-utils/sprint7RuntimeSandbox.ts`
- Test: `src/test-utils/__tests__/sprint7Seeds.test.ts`
- Test: `src/test-utils/__tests__/sprint7RuntimeSandbox.test.ts`

- [ ] **Step 1: Write the failing seed test for the reviewer actor**

```ts
it("creates a seeded reviewer actor with shared-project visibility", () => {
  const seed = createSprint7SeedDataset(new Date("2026-06-18T12:00:00.000Z"));

  expect(seed.actors.riley.role).toBe("manager");
  expect(seed.actors.riley.systemPermission).toBe("admin");
  expect(seed.assignments.some((assignment) => assignment.userId === seed.actors.riley.id)).toBe(true);
});
```

- [ ] **Step 2: Run the seed test and verify it fails**

Run: `npx jest src/test-utils/__tests__/sprint7Seeds.test.ts --runInBand`
Expected: FAIL because `riley` does not exist on `Sprint7SeedDataset`.

- [ ] **Step 3: Add the reviewer actor, IDs, and shared-project assignment**

```ts
export type Sprint7SandboxActor = "tristan" | "herman" | "riley";

export const SPRINT7_USER_IDS = {
  tristan: "sprint7-user-tristan",
  herman: "sprint7-user-herman",
  riley: "sprint7-user-riley",
} as const;

const riley = buildUser({
  id: SPRINT7_USER_IDS.riley,
  email: "riley@insite.test",
  name: "Riley",
  role: "manager",
  systemPermission: "admin",
  companyId: SPRINT7_COMPANY_IDS.tristan,
  company_id: SPRINT7_COMPANY_IDS.tristan,
  position: "Reviewer / Closeout Lead",
  phone: "555-5005",
  createdAt,
  updatedAt: createdAt,
  lastSelectedProjectId: SPRINT7_PROJECT_IDS.shared,
  isPending: false,
  approvedBy: SPRINT7_USER_IDS.tristan,
  approvedAt: createdAt,
});

const assignments: UserProjectAssignment[] = [
  // existing assignments...
  {
    id: "sprint7-assignment-riley-shared",
    userId: riley.id,
    projectId: sharedProject.id,
    category: "contractor",
    projectRole: "reviewer",
    assignedAt: createdAt,
    assignedBy: tristan.id,
    isActive: true,
  },
];
```

- [ ] **Step 4: Write the failing runtime-sandbox test for reviewer switching**

```ts
it("switches the active runtime sandbox actor to the reviewer", async () => {
  await initializeSprint7RuntimeSandbox({ activeActor: "tristan" });

  await switchSprint7RuntimeSandboxActor("riley");

  expect(useAuthStore.getState().user?.id).toBe("sprint7-user-riley");
  expect(useProjectFilterStore.getState().selectedProjectId).toBe(SPRINT7_PROJECT_IDS.shared);
});
```

- [ ] **Step 5: Run the runtime-sandbox test and verify it fails**

Run: `npx jest src/test-utils/__tests__/sprint7RuntimeSandbox.test.ts --runInBand`
Expected: FAIL because `"riley"` is not a valid `Sprint7SandboxActor`.

- [ ] **Step 6: Extend runtime sandbox role switching to support the reviewer**

```ts
const dataset: Sprint7SeedDataset = {
  actors: {
    tristan: useUserStore.getState().getUserById(SPRINT7_USER_IDS.tristan)!,
    herman: useUserStore.getState().getUserById(SPRINT7_USER_IDS.herman)!,
    riley: useUserStore.getState().getUserById(SPRINT7_USER_IDS.riley)!,
  },
  companies: useCompanyStore.getState().companies,
  users: useUserStore.getState().users,
  projects: useProjectStore.getState().projects,
  assignments: useProjectStore.getState().userAssignments,
  tasks: useTaskStore.getState().tasks,
  primaryProjectId: SPRINT7_PROJECT_IDS.shared,
  privateProjectId: SPRINT7_PROJECT_IDS.private,
  createdAt: useTaskStore.getState().tasks[0]?.createdAt ?? new Date().toISOString(),
};
```

- [ ] **Step 7: Run the seed and runtime tests and verify they pass**

Run: `npx jest src/test-utils/__tests__/sprint7Seeds.test.ts src/test-utils/__tests__/sprint7RuntimeSandbox.test.ts --runInBand`
Expected: PASS

- [ ] **Step 8: Commit the role-model expansion**

```bash
git add src/test-utils/sprint7Seeds.ts src/test-utils/sprint7RuntimeSandbox.ts src/test-utils/__tests__/sprint7Seeds.test.ts src/test-utils/__tests__/sprint7RuntimeSandbox.test.ts
git commit -m "test(seeds): add reviewer role to sprint7 sandbox"
```

## Task 2: Add Stable Automation Entry Points For Three-Role Handoffs

**Files:**
- Modify: `src/navigation/screenAutomation.ts`
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/ui/viewAdapters/useDeveloperSettingsViewAdapter.ts`
- Test: `src/navigation/__tests__/screenAutomation.test.ts`
- Test: `src/__tests__/integration/DeveloperSettingsScreen.test.tsx`

- [ ] **Step 1: Write the failing deep-link test for reviewer bootstrap**

```ts
it("parses a reviewer automation url", () => {
  expect(parseAutomationLaunchUrl("taskr://automation/sprint7/riley")).toEqual({
    type: "sprint7-sandbox",
    actor: "riley",
  });
});
```

- [ ] **Step 2: Run the automation-route test and verify it fails**

Run: `npx jest src/navigation/__tests__/screenAutomation.test.ts --runInBand`
Expected: FAIL because the route only accepts `tristan|herman`.

- [ ] **Step 3: Extend the automation route and builder to include the reviewer**

```ts
export type Sprint7AutomationActor = "tristan" | "herman" | "riley";

const SPRINT7_SANDBOX_AUTOMATION_URL_PATTERN =
  /^taskr:\/\/automation\/sprint7(?:\/(tristan|herman|riley))?\/?$/i;
```

- [ ] **Step 4: Write the failing developer-settings integration test for reviewer switching**

```ts
it("offers reviewer sandbox actions when sprint7 tools are available", async () => {
  render(<DeveloperSettingsScreen onNavigateBack={jest.fn()} onOpenTaskDetailVerification={jest.fn()} />);

  fireEvent.press(screen.getByTestId("developer-settings__action_initialize-sprint7-sandbox"));

  expect(Alert.alert).toHaveBeenCalledWith(
    "Initialize Sprint 7 Staging Sandbox",
    expect.any(String),
    expect.arrayContaining([
      expect.objectContaining({ text: "Reset as Riley" }),
      expect.objectContaining({ text: "Switch to Riley" }),
    ]),
  );
});
```

- [ ] **Step 5: Run the developer-settings test and verify it fails**

Run: `npx jest src/__tests__/integration/DeveloperSettingsScreen.test.tsx --runInBand`
Expected: FAIL because the alert options do not include reviewer actions.

- [ ] **Step 6: Add reviewer actions to the developer-settings sandbox switcher**

```ts
const runSprint7SandboxAction = useCallback(
  async (mode: "initialize" | "switch", actor: "tristan" | "herman" | "riley") => {
    setIsInitializingSprint7Sandbox(true);

    try {
      if (mode === "initialize") {
        await initializeSprint7RuntimeSandbox({ activeActor: actor });
      } else {
        await switchSprint7RuntimeSandboxActor(actor);
      }

      const actorLabel =
        actor === "tristan" ? "Tristan" : actor === "herman" ? "Herman" : "Riley";
      const actionLabel = mode === "initialize" ? "initialized" : "switched";

      Alert.alert("Sprint 7 Sandbox Ready", `Sprint 7 staging sandbox ${actionLabel} for ${actorLabel}.`);
    } finally {
      setIsInitializingSprint7Sandbox(false);
    }
  },
  [],
);
```

- [ ] **Step 7: Run the route and developer-settings tests and verify they pass**

Run: `npx jest src/navigation/__tests__/screenAutomation.test.ts src/__tests__/integration/DeveloperSettingsScreen.test.tsx --runInBand`
Expected: PASS

- [ ] **Step 8: Commit the automation-entrypoint changes**

```bash
git add src/navigation/screenAutomation.ts src/navigation/__tests__/screenAutomation.test.ts src/ui/viewAdapters/useDeveloperSettingsViewAdapter.ts src/__tests__/integration/DeveloperSettingsScreen.test.tsx
git commit -m "test(automation): add reviewer sandbox handoff routes"
```

## Task 3: Harden Selectors For Task Creation, Update, Upload, And List Assertions

**Files:**
- Modify: `src/screens/CreateTaskScreen.tsx`
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/screens/UpdateProgressScreen.tsx`
- Modify: `src/screens/PhotoSelectionScreen.tsx`
- Modify: `src/screens/TasksScreen.tsx`
- Test: `src/__tests__/integration/CreateTaskScreen.test.tsx`
- Test: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- Test: `src/__tests__/integration/UpdateProgressScreen.header.test.tsx`
- Create: `src/__tests__/integration/TaskCoreAutomationSelectors.test.tsx`

- [ ] **Step 1: Write the failing selector-contract test for new task-core anchors**

```ts
it("renders stable task-core automation anchors", () => {
  expect(screen.getByTestId("create-task__submit-inline")).toBeTruthy();
  expect(screen.getByTestId("task-detail__bottom_action_bar")).toBeTruthy();
  expect(screen.getByTestId("update-progress__submit")).toBeTruthy();
  expect(screen.getByTestId("photo-selection__confirm")).toBeTruthy();
});
```

- [ ] **Step 2: Run the selector-contract test and verify it fails**

Run: `npx jest src/__tests__/integration/TaskCoreAutomationSelectors.test.tsx --runInBand`
Expected: FAIL because the new update-progress and photo-selection anchors do not exist yet.

- [ ] **Step 3: Add stable testIDs to the update-progress and photo-selection screens**

```tsx
<Pressable
  testID="update-progress__submit"
  onPress={handleSubmit}
>
  <Text>Submit Update</Text>
</Pressable>

<Pressable
  testID="photo-selection__confirm"
  onPress={handleConfirmSelection}
>
  <Text>Use Selected Photos</Text>
</Pressable>
```

- [ ] **Step 4: Add explicit task-detail and tasks-list row selectors used by native list-accuracy checks**

```tsx
<View testID={`task-detail__status_${output.taskHero.status}`}>
  <Text>{output.taskHero.statusLabel}</Text>
</View>

<Pressable
  testID={`tasks-screen__row_open_${row.taskId}`}
  onPress={() => handleTaskPress(row.taskId)}
>
  <TaskRowContent row={row} />
</Pressable>
```

- [ ] **Step 5: Add explicit create-task success and attachment-state anchors**

```tsx
<View testID="create-task__attachments_section">
  <AttachmentComposer
    testID="create-task__attachments_composer"
    attachments={formData.attachments as any}
  />
</View>
```

- [ ] **Step 6: Run the targeted selector and screen tests and verify they pass**

Run: `npx jest src/__tests__/integration/TaskCoreAutomationSelectors.test.tsx src/__tests__/integration/CreateTaskScreen.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/UpdateProgressScreen.header.test.tsx --runInBand`
Expected: PASS

- [ ] **Step 7: Commit the selector hardening**

```bash
git add src/screens/CreateTaskScreen.tsx src/screens/TaskDetailScreen.tsx src/screens/UpdateProgressScreen.tsx src/screens/PhotoSelectionScreen.tsx src/screens/TasksScreen.tsx src/__tests__/integration/CreateTaskScreen.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/UpdateProgressScreen.header.test.tsx src/__tests__/integration/TaskCoreAutomationSelectors.test.tsx
git commit -m "test(selectors): harden task-core native flow anchors"
```

## Task 4: Add The Native Task Core + Photo Upload Maestro Suite

**Files:**
- Create: `maestro/flows/task-core-manager-create-assign.yaml`
- Create: `maestro/flows/task-core-worker-update-upload.yaml`
- Create: `maestro/flows/task-core-reviewer-close.yaml`
- Create: `maestro/flows/task-core-list-accuracy.yaml`
- Modify: `package.json`
- Modify: `maestro/README.md`

- [ ] **Step 1: Write the failing native suite command by adding the script first**

```json
"test:e2e:maestro:task-core": "bash ./scripts/maestro/run-local.sh test maestro/flows/task-core-*.yaml"
```

- [ ] **Step 2: Run the new script and verify it fails**

Run: `npm run test:e2e:maestro:task-core`
Expected: FAIL because the `task-core-*.yaml` files do not exist.

- [ ] **Step 3: Add the manager create-and-assign flow**

```yaml
appId: com.buildtrack.app.local
---
- openLink:
    link: "taskr://automation/sprint7/tristan"
- runFlow:
    when:
      visible: 'Open in “Taskr”?'
    commands:
      - tapOn: Open
- assertVisible:
    id: "dashboard-screen__root"
- tapOn:
    id: "create-task__submit-inline"
```

- [ ] **Step 4: Add the worker update-and-upload flow**

```yaml
appId: com.buildtrack.app.local
---
- openLink:
    link: "taskr://automation/sprint7/herman"
- runFlow:
    when:
      visible: 'Open in “Taskr”?'
    commands:
      - tapOn: Open
- assertVisible:
    id: "tasks-screen__task_list"
- tapOn:
    id: "update-progress__submit"
```

- [ ] **Step 5: Add the reviewer closeout flow and list-accuracy flow**

```yaml
appId: com.buildtrack.app.local
---
- openLink:
    link: "taskr://automation/sprint7/riley"
- runFlow:
    when:
      visible: 'Open in “Taskr”?'
    commands:
      - tapOn: Open
- assertVisible:
    id: "task-detail__bottom_action_bar"
```

- [ ] **Step 6: Re-run the native suite and verify it now boots the four new flows**

Run: `npm run test:e2e:maestro:task-core`
Expected: FAIL on functional assertions inside the flows, not on missing files.

- [ ] **Step 7: Fill in the real assertions for create, assign, upload, review, and cross-screen sync**

```yaml
- assertVisible:
    id: "tasks-screen__row_open_sprint7-task-new-request"
- tapOn:
    id: "tasks-screen__row_open_sprint7-task-new-request"
- assertVisible:
    id: "task-detail__status_submitted_for_review"
```

- [ ] **Step 8: Update Maestro docs and rerun the suite**

Run: `npm run test:e2e:maestro:task-core`
Expected: PASS

- [ ] **Step 9: Commit the native task-core suite**

```bash
git add maestro/flows/task-core-manager-create-assign.yaml maestro/flows/task-core-worker-update-upload.yaml maestro/flows/task-core-reviewer-close.yaml maestro/flows/task-core-list-accuracy.yaml package.json maestro/README.md
git commit -m "test(maestro): add native task-core slice suite"
```

## Task 5: Add Supporting Jest Coverage For Cross-Screen Sync

**Files:**
- Create: `src/__tests__/journeys/task-core-cross-screen-sync.journey.test.tsx`
- Create: `src/__tests__/integration/taskCoreSlice.state-sync.test.tsx`
- Modify: `src/test-utils/journeys/seedJourneyState.ts`
- Modify: `src/test-utils/journeys/renderAppShellJourney.tsx`

- [ ] **Step 1: Write the failing journey test for manager-to-worker-to-reviewer visibility**

```tsx
it("reflects seeded task-core state across roles without manual refresh", async () => {
  seedJourneyState({
    authUser: sprint7Seed.actors.tristan,
    selectedProjectId: sprint7Seed.primaryProjectId,
  });

  const screen = renderAppShellJourney();

  expect(await screen.findByTestId("root-tab__tasks")).toBeTruthy();
  expect(screen.getByTestId("tasks-screen__task_list")).toBeTruthy();
});
```

- [ ] **Step 2: Run the journey test and verify it fails**

Run: `npx jest src/__tests__/journeys/task-core-cross-screen-sync.journey.test.tsx --runInBand`
Expected: FAIL because the new task-core seeded state is not wired into the journey helpers yet.

- [ ] **Step 3: Add a dedicated task-core seeded helper for cross-screen sync assertions**

```ts
export function seedTaskCoreJourneyState(dataset: Sprint7SeedDataset, actor: Sprint7SandboxActor) {
  useAuthStore.setState({
    user: dataset.actors[actor],
    initialized: true,
    loading: false,
  } as never);

  useProjectStore.setState({
    projects: dataset.projects,
    userAssignments: dataset.assignments,
  });

  useTaskStore.setState({
    tasks: dataset.tasks,
    isLoading: false,
    error: null,
  });
}
```

- [ ] **Step 4: Write the failing integration test for list/detail state mapping after upload and review**

```ts
it("keeps task list and detail status aligned after photo upload and review transition", () => {
  const row = mapTaskRow(taskWithUploadedPhotoAndReviewState);
  const detail = mapTaskDetail(taskWithUploadedPhotoAndReviewState);

  expect(row.statusLabel).toBe(detail.taskHero.statusLabel);
  expect(detail.attachments.length).toBeGreaterThan(0);
});
```

- [ ] **Step 5: Run the integration test and verify it fails**

Run: `npx jest src/__tests__/integration/taskCoreSlice.state-sync.test.tsx --runInBand`
Expected: FAIL until the test fixture and mapper expectations are aligned with the new slice state.

- [ ] **Step 6: Add the minimal helper and fixture wiring to make both Jest tests pass**

```ts
const taskWithUploadedPhotoAndReviewState = buildTask({
  ...seed.tasks.find((task) => task.id === SPRINT7_SCENARIO_TASK_IDS.newRequest)!,
  attachments: ["https://example.com/progress-photo.jpg"],
  status: "submitted_for_review",
  completionPercentage: 100,
});
```

- [ ] **Step 7: Run the new journey and integration tests and verify they pass**

Run: `npx jest src/__tests__/journeys/task-core-cross-screen-sync.journey.test.tsx src/__tests__/integration/taskCoreSlice.state-sync.test.tsx --runInBand`
Expected: PASS

- [ ] **Step 8: Commit the supporting Jest coverage**

```bash
git add src/__tests__/journeys/task-core-cross-screen-sync.journey.test.tsx src/__tests__/integration/taskCoreSlice.state-sync.test.tsx src/test-utils/journeys/seedJourneyState.ts src/test-utils/journeys/renderAppShellJourney.tsx
git commit -m "test(jest): add task-core cross-screen sync coverage"
```

## Task 6: Promote The Slice Into The Documentation And Command Surface

**Files:**
- Modify: `TESTING_STRATEGY.md`
- Modify: `maestro/README.md`
- Modify: `package.json`

- [ ] **Step 1: Write the failing documentation assertion by checking for the new suite label**

Run: `grep -n "task-core-native" TESTING_STRATEGY.md maestro/README.md package.json`
Expected: no matches

- [ ] **Step 2: Add the new suite to the strategy doc and command surface**

```md
- `npm run test:e2e:maestro:task-core`
- `task-core-native` is the first native-heavy essential-function slice.
- It covers manager create/assign, worker update/upload, reviewer closeout, and immediate cross-screen sync.
```

- [ ] **Step 3: Add the new suite to the progressive loop description without auto-promoting it into `--confidence-full` yet**

```md
Promotion path:
1. direct runnable task-core native suite
2. promotion into native critical
3. optional promotion into `--confidence-full` after repeatability review
```

- [ ] **Step 4: Run the final validation stack for the slice**

Run: `npx tsc --noEmit --pretty false && npm run test:confidence && npm run test:e2e:maestro:task-core`
Expected: PASS

- [ ] **Step 5: Commit the docs and command-surface updates**

```bash
git add TESTING_STRATEGY.md maestro/README.md package.json
git commit -m "docs(testing): document task-core native slice"
```

## Final Verification

- [ ] **Step 1: Run the slice-native suite twice to confirm determinism**

Run: `npm run test:e2e:maestro:task-core && npm run test:e2e:maestro:task-core`
Expected: PASS twice

- [ ] **Step 2: Run the full local validation path plus the new suite**

Run: `./scripts/dev-loop.sh --confidence-full && npm run test:e2e:maestro:task-core`
Expected: PASS

- [ ] **Step 3: Capture final worktree status**

Run: `git status --short`
Expected: clean working tree
