# M-QA-03 Blocker Remediation And Confidence Closure Implementation Plan

> **Disposition (2026-08-27): CLOSED / ARCHIVED — do not execute.**
>
> Work represented here was completed on `master` under **WS-QA / M-QA-03 Closed (2026-08-07)**
> (L3 Maestro 5/5 rc=0; evidence in `documentation/ROADMAP.md` M-QA-03 Notes + AGENTS.md).
> Successor SoT on master: `docs/superpowers/plans/2026-08-01-ws-qa-03-automated-confidence-and-e2e-coverage.md`,
> `TESTING_STRATEGY.md`, `maestro/TESTID_GAPS_TODO.md`, `scripts/maestro/run-local.sh`.
> This file is retained as historical planning context from the `slice/m-qa-03-automation-loop` worktree.



> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear the existing TypeScript and integration blockers that currently prevent `test:confidence` and `validate:local:confidence` from reaching a green end-to-end run for the M-QA-03 automation slice.

**Architecture:** Fix only the concrete blocker surfaces already identified in the isolated `m-qa-03-automation-loop` worktree: navigation typing drift, view-adapter contract drift, overdue filter type narrowing, and the `TaskDetailScreen` nullability crash exposed by current integration coverage. Reuse the new confidence loop and rerun targeted plus canonical validation after each fix cluster.

**Tech Stack:** Expo-managed React Native, TypeScript, React Navigation, Jest, existing integration and journey suites, bash validation scripts.

---

## File Map

**Navigation typing blockers**
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/navigation/uiModeRoutes.tsx`
- Test: `src/navigation/__tests__/AppNavigator.back-behavior.test.tsx`

**View-adapter contract blockers**
- Modify: `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`

**Task detail crash blocker**
- Modify: `src/screens/TaskDetailScreen.tsx`
- Test: `src/__tests__/integration/ModernUiMarker.test.tsx`

**Confidence closure**
- Verify: `package.json`
- Verify: `scripts/validation/validate-local.sh`
- Verify: `src/__tests__/journeys/*.tsx`

## Task 1: Fix Navigation Typing Drift

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/navigation/uiModeRoutes.tsx`
- Test: `src/navigation/__tests__/AppNavigator.back-behavior.test.tsx`

- [ ] **Step 1: Write the failing typecheck expectation**

Run: `npx tsc --noEmit --pretty false`
Expected:

```text
AppNavigator.tsx reports missing CreateTaskRouteNavigation members and DashboardRoute onNavigateToCreateTask signature mismatch.
```

- [ ] **Step 2: Expand the `CreateTaskRouteNavigation` type to match the code already using it**

```ts
type CreateTaskRouteNavigation = {
  navigate:
    | NativeStackNavigationProp<DashboardStackParamList>["navigate"]
    | NativeStackNavigationProp<TasksStackParamList>["navigate"]
    | NativeStackNavigationProp<CreateTaskStackParamList>["navigate"];
  canGoBack?: () => boolean;
  dispatch?: NativeStackNavigationProp<CreateTaskStackParamList>["dispatch"];
  getParent?: () => ParentNavigationLike | undefined;
  getState?: () => RouteStateLike;
  goBack?: () => void;
  setParams?: (params: Partial<CreateTaskParams>) => void;
};
```

- [ ] **Step 3: Align `DashboardRouteProps` with the callback shape already passed from `AppNavigator`**

```ts
interface DashboardRouteProps {
  onNavigateToTasks: (params?: TasksListParams) => void;
  onNavigateToCreateTask: (params?: CreateTaskParams) => void;
  onNavigateToProfile: () => void;
  onNavigateToDeveloperSettings?: () => void;
  onNavigateToTaskDetail?: (taskId: string, subTaskId?: string) => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}
```

- [ ] **Step 4: Type the inline callback parameter in `AppNavigator`**

```ts
onNavigateToCreateTask={(params?: CreateTaskParams) => {
  navigateToRootTabScreen(navigation, "Camera", {
    screen: "CreateTaskMain",
    params: {
      parentTaskId: params?.parentTaskId,
      parentSubTaskId: params?.parentSubTaskId,
      editTaskId: params?.editTaskId,
      actionType: params?.actionType,
      updateTargetSubTaskId: params?.updateTargetSubTaskId,
      sourceTaskId: params?.sourceTaskId,
      sourceSubTaskId: params?.sourceSubTaskId,
    },
  });
}}
```

- [ ] **Step 5: Run the focused navigator regression**

Run: `npx jest src/navigation/__tests__/AppNavigator.back-behavior.test.tsx --runInBand`
Expected: PASS

- [ ] **Step 6: Commit the navigation blocker fix**

```bash
git add src/navigation/AppNavigator.tsx src/navigation/uiModeRoutes.tsx src/navigation/__tests__/AppNavigator.back-behavior.test.tsx
git commit -m "fix(navigation): resolve confidence-loop typing blockers"
```

## Task 2: Fix View-Adapter Contract Drift

**Files:**
- Modify: `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`

- [ ] **Step 1: Write the failing adapter type expectation**

Run: `npx tsc --noEmit --pretty false`
Expected:

```text
useCreateTaskViewAdapter.ts is missing required output methods.
useDashboardViewAdapter.ts cannot find Task and has implicit any parameters.
useTasksViewAdapter.ts compares "show_all" inside a narrowed switch.
```

- [ ] **Step 2: Move the required AI-assistant methods onto the typed `output` object**

```ts
const output: CreateTaskScreenViewAdapterOutput = {
  screenId: "CreateTaskScreen",
  readiness: { ... },
  continuity: { ... },
  context,
  activity: {
    isSubmitting,
    isLoadingUsers,
    isUploading,
  },
  formData,
  errors,
  pickers,
  assigneePicker: {
    availableUsers: allAssignableUsers,
    userSearchQuery,
    filteredUsers: filteredAssignableUsers,
    selectedUserIds: formData.assignedTo,
  },
  locationPicker: {
    projectId: activeProjectId,
    options: locationOptions,
  },
  projects: {
    availableProjects: userProjects,
  },
  modals: {
    showEditReasonModal,
    editReason,
  },
  aiAssistant: {
    textInput,
    showSuggestionPreview,
    acceptedFields,
    isProcessing,
    lastSuggestion,
    error: llmError,
  },
  generateSuggestionFromText,
  suggestTaskFromText,
  clearSuggestion,
};
```

- [ ] **Step 3: Import `Task` explicitly and type the flatMap parameters in the dashboard adapter**

```ts
import { isAdmin, type Project, type Task } from "@/types/buildtrack";
```

```ts
const activityPhotos =
  task.activities?.flatMap((activity: Task["activities"][number]) => {
    const photos = (activity.data as { photos?: string[] } | undefined)?.photos;
    return Array.isArray(photos) ? photos : [];
  }) ?? [];

const updatePhotos =
  task.updates?.flatMap((update: Task["updates"][number]) => update.photos ?? []) ?? [];
```

- [ ] **Step 4: Remove the unreachable narrowed `"show_all"` case in the overdue-window switch**

```ts
function shouldKeepOverdueTaskWithinWindow(
  dueDate: number,
  overdueWindow: Exclude<TasksOverdueWindowValue, "show_all">,
  now: number,
) {
  const daysOverdue = (now - dueDate) / (1000 * 60 * 60 * 24);
  switch (overdueWindow) {
    case "three_active":
      return daysOverdue <= 3;
    case "one_week":
      return daysOverdue <= 7;
    case "one_month":
      return daysOverdue <= 30;
    default:
      return true;
  }
}
```

- [ ] **Step 5: Run a focused typecheck**

Run: `npx tsc --noEmit --pretty false`
Expected:

```text
The CreateTask, Dashboard, and Tasks adapter errors are gone.
```

- [ ] **Step 6: Commit the adapter blocker fix**

```bash
git add src/ui/viewAdapters/useCreateTaskViewAdapter.ts src/ui/viewAdapters/useDashboardViewAdapter.ts src/ui/viewAdapters/useTasksViewAdapter.ts
git commit -m "fix(adapters): close confidence-loop contract blockers"
```

## Task 3: Fix The Task Detail Nullability Crash

**Files:**
- Modify: `src/screens/TaskDetailScreen.tsx`
- Test: `src/__tests__/integration/ModernUiMarker.test.tsx`

- [ ] **Step 1: Write the failing integration expectation**

Run: `npx jest src/__tests__/integration/ModernUiMarker.test.tsx --runInBand`
Expected:

```text
FAIL because TaskDetailScreen reads output.taskHero.* while the current mocked adapter returns taskHero: null.
```

- [ ] **Step 2: Add a defensive early return for incomplete task-detail adapter output**

```tsx
  if (
    !output.readiness.hasUsableData ||
    !output.taskHero
  ) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center">
          <Text>Loading task details...</Text>
        </View>
      </SafeAreaView>
    );
  }
```

- [ ] **Step 3: Keep the existing header-badge logic unchanged after the new guard**

```tsx
  const headerBadges = [
    output.taskHero.isCritical && output.taskHero.criticalLabel
      ? { id: "critical", label: output.taskHero.criticalLabel, critical: true }
      : null,
    output.taskHero.categoryLabel
      ? { id: "category", label: output.taskHero.categoryLabel }
      : null,
    { id: "status", label: output.taskHero.statusLabel },
    { id: "completion", label: output.taskHero.completionLabel },
    output.taskHero.dueDateLabel
      ? { id: "due", label: `Due ${output.taskHero.dueDateLabel}` }
      : null,
  ].filter((badge): badge is { id: string; label: string; critical?: boolean } => Boolean(badge));
```

- [ ] **Step 4: Run the focused integration regression**

Run: `npx jest src/__tests__/integration/ModernUiMarker.test.tsx --runInBand`
Expected: PASS

- [ ] **Step 5: Commit the task-detail blocker fix**

```bash
git add src/screens/TaskDetailScreen.tsx src/__tests__/integration/ModernUiMarker.test.tsx
git commit -m "fix(task-detail): guard incomplete adapter output"
```

## Task 4: Close The Confidence Loop

**Files:**
- Verify: `package.json`
- Verify: `scripts/validation/validate-local.sh`
- Verify: `src/__tests__/journeys/*.tsx`

- [ ] **Step 1: Run the targeted blocker stack**

Run:

```bash
npx tsc --noEmit --pretty false
npx jest src/__tests__/integration/ModernUiMarker.test.tsx --runInBand
npx jest src/__tests__/journeys --runInBand
```

Expected:

```text
All commands pass.
```

- [ ] **Step 2: Run the confidence bundle**

Run:

```bash
npm run test:confidence
```

Expected:

```text
Regression and journey suites pass together.
```

- [ ] **Step 3: Run the canonical low-touch confidence loop**

Run:

```bash
VALIDATE_LOCAL_RUN_JOURNEYS=1 bash ./scripts/validation/validate-local.sh
```

Expected:

```text
TypeScript, regression, and journey stages all pass.
```

- [ ] **Step 4: Run diagnostics on edited source files**

Run diagnostics for:

```text
src/navigation/AppNavigator.tsx
src/navigation/uiModeRoutes.tsx
src/ui/viewAdapters/useCreateTaskViewAdapter.ts
src/ui/viewAdapters/useDashboardViewAdapter.ts
src/ui/viewAdapters/useTasksViewAdapter.ts
src/screens/TaskDetailScreen.tsx
```

Expected: no newly introduced diagnostics

- [ ] **Step 5: Inspect the final diff**

Run:

```bash
git status --short
git diff -- src/navigation src/ui/viewAdapters src/screens/TaskDetailScreen.tsx scripts/validation/validate-local.sh
```

Expected:

```text
Only planned blocker-remediation and confidence-loop files changed.
```

- [ ] **Step 6: Create the final checkpoint commit**

```bash
git add src/navigation src/ui/viewAdapters src/screens/TaskDetailScreen.tsx scripts/validation/validate-local.sh
git commit -m "fix(testing): close confidence-loop baseline blockers"
```

## Self-Review

**Spec coverage**
- Navigation typing blockers are handled in Task 1.
- View-adapter contract blockers are handled in Task 2.
- The TaskDetail integration crash blocker is handled in Task 3.
- Confidence-loop closure and validation are handled in Task 4.

**Placeholder scan**
- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Every task includes exact files, commands, and concrete code.

**Type consistency**
- `CreateTaskParams` is used consistently across `AppNavigator` and `uiModeRoutes`.
- The adapter fixes align with the existing `CreateTaskScreenViewAdapterOutput`, `Task`, and `TasksOverdueWindowValue` contracts.
