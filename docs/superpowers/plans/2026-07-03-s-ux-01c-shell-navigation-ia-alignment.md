# S-UX-01C Top-Level Shell And Navigation IA Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the worker shell to the approved `Activity / Tasks / Camera / Profile` navigation model without breaking the active-project workspace behavior completed in `WS-UX / M-UX-01 / S-UX-01B`.

**Architecture:** Keep the existing stack boundaries intact and treat this slice as a shell-rename and route-alignment pass, not a content redesign. Repoint the current dashboard stack to the `Activity` tab, repurpose the current create-task tab as the temporary `Camera` entry shell, surface `Profile` as a visible top-level tab, and preserve all existing child stacks until later slices replace their internals.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript, React Navigation, Zustand, Jest

---

## File Structure

### Core files to modify

- `src/navigation/navigationTypes.ts`
  Rename the worker-facing root tab contract from `Dashboard / CreateTask / Reports` to the approved shell names while preserving admin-only routes.

- `src/navigation/AppNavigator.tsx`
  Update top-level tab names, tab labels, navigation helpers, and parent-tab redirects so the live shell uses `Activity / Tasks / Camera / Profile`.

- `src/navigation/__tests__/AppNavigator.back-behavior.test.tsx`
  Lock the renamed parent-tab fallback behavior and preserve task-detail back navigation.

- `src/navigation/__tests__/WorkspaceBootstrapGate.test.tsx`
  Preserve `S-UX-01B` bootstrap guarantees while the shell names change.

### Existing files to inspect during execution

- `src/navigation/uiModeRoutes.tsx`
  Confirms the current `DashboardRoute` and `TasksRoute` wrappers that will stay in place for this slice.

- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
  Canonical milestone execution record for `WS-UX / M-UX-01`.

- `documentation/ROADMAP.md`
  Canonical `WS / M / S` inventory; update status only when `S-UX-01C` is actually complete.

## Task 1: Rename the worker root tab contract to the approved shell language

**Files:**
- Modify: `src/navigation/navigationTypes.ts`
- Test: `src/navigation/__tests__/AppNavigator.back-behavior.test.tsx`

- [ ] **Step 1: Write the failing navigation assertions for the renamed parent shell**

```ts
it("redirects to the Activity tab when the current activity stack has no history", () => {
  const pop = jest.fn();
  const goBack = jest.fn();
  const navigate = jest.fn();

  handleDashboardTaskDetailBack({
    canGoBack: () => false,
    getState: () => ({ index: 0, routes: [{ key: "TaskDetailFromDashboard" }] }),
    goBack,
    pop,
    getParent: () => ({ navigate }),
  } as any);

  expect(navigate).toHaveBeenCalledWith("Activity");
});
```

- [ ] **Step 2: Run the navigation test to verify it fails on the current legacy tab names**

Run: `npx jest src/navigation/__tests__/AppNavigator.back-behavior.test.tsx --runInBand`

Expected: FAIL because the current fallback still targets `Dashboard`.

- [ ] **Step 3: Rename the worker-facing root tab contract in `navigationTypes.ts`**

```ts
export type RootTabParamList = {
  Activity: NavigatorScreenParams<DashboardStackParamList> | undefined;
  Tasks: NavigatorScreenParams<TasksStackParamList> | undefined;
  Camera: NavigatorScreenParams<CreateTaskStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
  AdminDashboard: NavigatorScreenParams<AdminDashboardStackParamList> | undefined;
};
```

- [ ] **Step 4: Keep admin-only navigation untouched**

```ts
export type RootTabParamList = {
  Activity: NavigatorScreenParams<DashboardStackParamList> | undefined;
  Tasks: NavigatorScreenParams<TasksStackParamList> | undefined;
  Camera: NavigatorScreenParams<CreateTaskStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
  AdminDashboard: NavigatorScreenParams<AdminDashboardStackParamList> | undefined;
};
```

Expected: no `Reports` worker tab remains in the worker shell contract; the approved `Profile` shell entry remains present; admin routing remains present.

- [ ] **Step 5: Re-run the navigation test to keep the contract change red until `AppNavigator.tsx` is updated**

Run: `npx jest src/navigation/__tests__/AppNavigator.back-behavior.test.tsx --runInBand`

Expected: FAIL because the runtime navigation code still points to legacy tab names.

## Task 2: Align `AppNavigator` to `Activity / Tasks / Camera / Profile`

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`
- Test: `src/navigation/__tests__/AppNavigator.back-behavior.test.tsx`

- [ ] **Step 1: Update parent-tab redirects to the approved shell names**

```ts
export function handleDashboardTaskDetailBack(
  navigation: DashboardTaskDetailBackNavigation,
) {
  if (popCurrentStack(navigation)) {
    return;
  }

  const parentNav = navigation.getParent?.() as RootTabLikeNavigation | undefined;
  parentNav?.navigate("Activity");
}
```

- [ ] **Step 2: Rename the worker tab registration while preserving existing stacks**

```tsx
{!isAdmin(user) && (
  <Tab.Screen
    name="Activity"
    component={DashboardStack}
    options={{
      tabBarLabel: "Activity",
      tabBarIcon: ({ color, size }) => (
        <Ionicons name="sparkles-outline" size={size} color={color} />
      ),
      tabBarBadge: badgeCount,
      tabBarBadgeStyle: { backgroundColor: "#ef4444", color: "white", fontSize: 10 },
    }}
  />
)}
```

- [ ] **Step 3: Repoint the create-task entry shell to the temporary `Camera` tab**

```tsx
{!isAdmin(user) && (
  <Tab.Screen
    name="Camera"
    component={CreateTaskStack}
    options={{
      tabBarLabel: "Camera",
      tabBarIcon: ({ color, size }) => (
        <Ionicons name="camera-outline" size={size} color={color} />
      ),
    }}
  />
)}
```

- [ ] **Step 4: Replace the worker `Reports` tab with a visible `Profile` shell entry**

```tsx
<Tab.Screen
  name="Profile"
  component={ProfileStack}
  options={{
    tabBarLabel: "Profile",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="person-outline" size={size} color={color} />
    ),
  }}
/>
```

Expected: worker users see `Activity`, `Tasks`, `Camera`, and `Profile` in the visible shell.

- [ ] **Step 5: Update all worker parent-tab navigations to the renamed tabs**

```ts
parentNav.navigate("Camera", {
  screen: "CreateTaskMain",
  params: {
    parentTaskId: undefined,
    parentSubTaskId: undefined,
    editTaskId: undefined,
    actionType: undefined,
    clearForm: true,
    _timestamp: Date.now(),
  },
});
```

```ts
(navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
  "Activity",
);
```

- [ ] **Step 6: Run the renamed-shell navigation test**

Run: `npx jest src/navigation/__tests__/AppNavigator.back-behavior.test.tsx --runInBand`

Expected: PASS

## Task 3: Preserve workspace bootstrap behavior while the shell names change

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/navigation/__tests__/WorkspaceBootstrapGate.test.tsx`

- [ ] **Step 1: Write the failing shell-level test that proves bootstrap still gates the renamed worker shell**

```tsx
it("keeps the Activity shell blocked until readiness belongs to the authenticated user", () => {
  mockProjectFilterState.workspaceReady = false;
  mockProjectFilterState.workspaceReadyUserId = null;

  const screen = render(
    <WorkspaceBootstrapGate>
      <Text>activity shell</Text>
    </WorkspaceBootstrapGate>,
  );

  expect(screen.getByText("Loading...")).toBeTruthy();
  expect(screen.queryByText("activity shell")).toBeNull();
});
```

- [ ] **Step 2: Run the workspace gate test**

Run: `npx jest src/navigation/__tests__/WorkspaceBootstrapGate.test.tsx --runInBand`

Expected: PASS or targeted FAIL only if the shell rename introduced a regression in test assumptions. Adjust the wording to explicitly cover the renamed shell without weakening the gate contract.

- [ ] **Step 3: Keep the bootstrap gate current-user based**

```ts
const hasWorkspaceReadyForCurrentUser =
  !isAuthenticated ||
  (Boolean(currentUserId) &&
    workspaceReady &&
    workspaceReadyUserId === currentUserId);
```

Expected: no fallback to a generic persisted ready flag.

- [ ] **Step 4: Re-run the gate test to confirm the shell rename did not break `S-UX-01B`**

Run: `npx jest src/navigation/__tests__/WorkspaceBootstrapGate.test.tsx --runInBand`

Expected: PASS

## Task 4: Slice validation, roadmap update, and checkpoint commit

**Files:**
- Modify: `documentation/ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`

- [ ] **Step 1: Review the roadmap/execution-doc status before closure**

```md
| WS-UX / M-UX-01 / S-UX-01C | Top-level shell and navigation IA alignment | Pipeline | S-UX-01B | 14.3 | ../docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md |
```

Expected: status stays `Pipeline` until code and validation are complete.

- [ ] **Step 2: Run the focused slice validation**

Run: `npx jest src/navigation/__tests__/AppNavigator.back-behavior.test.tsx src/navigation/__tests__/WorkspaceBootstrapGate.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 3: Mark `S-UX-01C` closed in the canonical docs only after validation passes**

```md
| WS-UX / M-UX-01 / S-UX-01C | Top-level shell and navigation IA alignment | Closed | S-UX-01B | 14.3 | ../docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md |
```

```md
| WS-UX / M-UX-01 / S-UX-01C | Top-level shell and navigation IA alignment | Closed | Align the live shell to the approved `Activity / Tasks / Camera / Profile` model while preserving active-project behavior established by `S-UX-01B`. |
```

- [ ] **Step 4: Create the slice checkpoint commit**

```bash
git add src/navigation/navigationTypes.ts src/navigation/AppNavigator.tsx src/navigation/__tests__/AppNavigator.back-behavior.test.tsx src/navigation/__tests__/WorkspaceBootstrapGate.test.tsx documentation/ROADMAP.md docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md
git commit -m "feat(ux): align worker shell to activity camera profile"
```

## Spec Coverage Check

- Approved top-level shell direction: covered by Tasks 1 and 2
- Bootstrap preservation from `S-UX-01B`: covered by Task 3
- Roadmap-first documentation and slice closure: covered by Task 4

## Placeholder Scan

- No `TBD` / `TODO`
- No implicit “update docs later” step
- Each task includes explicit files, commands, and closure behavior

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-03-s-ux-01c-shell-navigation-ia-alignment.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
