# Shell + Camera Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved shell/navigation redesign with a 3-item bottom bar, compact inline weather on `Activity`, profile in the top-right header, and a context-aware camera flow that defaults differently inside and outside Task Detail.

**Architecture:** Keep the existing React Navigation stack structure, but change the tab shell so `Camera` becomes the dominant center action and `Profile` leaves the bottom bar. Reuse the existing `CreateTaskStack`, photo return params, and task-detail create/update routing, adding a small camera-intent contract so the post-capture destination is deterministic without inventing a separate workflow subsystem.

**Tech Stack:** Expo 54, React Native 0.81, React Navigation, TypeScript, Zustand, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/navigation/navigationTypes.ts`
  Add a typed camera launch intent contract for global capture vs task-detail capture.

- `src/navigation/AppNavigator.tsx`
  Rebuild the bottom tab order and styling, remove `Profile` from the worker bottom bar, and route the center camera action into the correct initial capture intent.

- `src/navigation/uiModeRoutes.tsx`
  Keep `DashboardRoute` / `TasksRoute` aligned with profile-in-header behavior after shell changes.

- `src/components/AppScreenHeader.tsx`
  Make the profile trigger the primary account affordance for worker surfaces.

- `src/screens/DashboardScreen.tsx`
  Replace the large weather tile with compact inline weather metadata and preserve the top-right profile affordance.

- `src/ui/contracts/viewAdapters.ts`
  Extend contracts for compact weather metadata and camera routing-sheet models if needed.

- `src/ui/viewAdapters/useDashboardViewAdapter.ts`
  Convert weather output into small inline metadata instead of a large dedicated tile.

- `src/screens/CreateTaskScreen.tsx`
  Add the post-capture routing sheet for the global camera path and support a clear “Create New Task vs Add to Existing Task” decision after photos arrive.

- `src/screens/TaskDetailScreen.tsx`
  Add a dedicated camera shortcut path that reuses the create-task update flow for the current task.

- `src/navigation/photoShortcutRoutes.ts`
  Extend helpers so task-detail camera launches default into the task’s photo-update path.

### Tests to add or modify

- `src/navigation/__tests__/uiModeRoutes.test.tsx`
- `src/navigation/__tests__/AppNavigator.back-behavior.test.tsx`
- `src/screens/__tests__/DashboardScreen.test.tsx`
- `src/__tests__/integration/DashboardScreenInteraction.test.tsx`
- `src/__tests__/integration/CreateTaskScreen.test.tsx`
- `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

### Docs to update after implementation

- `documentation/ROADMAP.md`
- `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`
- `docs/superpowers/specs/2026-07-04-tasks-queue-dashboard-correction-design.md`
- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`

## Task 1: Add camera launch intent contracts

**Files:**
- Modify: `src/navigation/navigationTypes.ts`
- Modify: `src/navigation/__tests__/uiModeRoutes.test.tsx`

- [ ] **Step 1: Write the failing typing tests for camera launch intent**

```ts
it("allows the camera tab to receive a global create-task capture intent", () => {
  const params: RootTabParamList["Camera"] = {
    screen: "CreateTaskMain",
    params: {
      actionType: "photos",
      cameraLaunchContext: "global",
      postCaptureDefault: "create_task",
    },
  };

  expect(params?.screen).toBe("CreateTaskMain");
});
```

```ts
it("allows task-detail camera launches to target the current task update flow", () => {
  const params: CreateTaskParams = {
    editTaskId: "task-1",
    actionType: "update",
    cameraLaunchContext: "task_detail",
    postCaptureDefault: "same_task_update",
    updateTargetSubTaskId: "subtask-1",
  };

  expect(params.cameraLaunchContext).toBe("task_detail");
  expect(params.postCaptureDefault).toBe("same_task_update");
});
```

- [ ] **Step 2: Run the focused navigation typing test and verify it fails**

Run: `npx jest src/navigation/__tests__/uiModeRoutes.test.tsx --runInBand`

Expected: FAIL because `CreateTaskParams` and the camera tab route do not yet support camera launch intent fields.

- [ ] **Step 3: Add the camera launch intent contract**

```ts
export type CameraLaunchContext = "global" | "task_detail";
export type CameraPostCaptureDefault =
  | "create_task"
  | "existing_task"
  | "same_task_update";

export type CreateTaskParams = {
  ...
  cameraLaunchContext?: CameraLaunchContext;
  postCaptureDefault?: CameraPostCaptureDefault;
};
```

- [ ] **Step 4: Re-run the focused navigation typing test**

Run: `npx jest src/navigation/__tests__/uiModeRoutes.test.tsx --runInBand`

Expected: PASS

## Task 2: Rebuild the worker shell into `Activity / Camera / Tasks`

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/navigation/__tests__/AppNavigator.back-behavior.test.tsx`
- Modify: `src/navigation/__tests__/uiModeRoutes.test.tsx`

- [ ] **Step 1: Write the failing shell test**

```tsx
it("shows Activity, Camera, and Tasks in the worker bottom bar and hides Profile from the tab bar", () => {
  const screen = render(<AppNavigator />);

  expect(screen.getByText("Activity")).toBeTruthy();
  expect(screen.getByText("Camera")).toBeTruthy();
  expect(screen.getByText("Tasks")).toBeTruthy();
  expect(screen.queryByText("Profile")).toBeNull();
});
```

- [ ] **Step 2: Run the focused navigator tests and verify they fail**

Run: `npx jest src/navigation/__tests__/AppNavigator.back-behavior.test.tsx src/navigation/__tests__/uiModeRoutes.test.tsx --runInBand`

Expected: FAIL because the worker shell still renders four tabs and the camera button is not a dominant center action.

- [ ] **Step 3: Reorder the tab shell and remove worker `Profile` from the bottom bar**

```tsx
<Tab.Screen
  name="Activity"
  component={DashboardStack}
  options={{ tabBarLabel: "Activity", ... }}
/>;

<Tab.Screen
  name="Camera"
  component={CreateTaskStack}
  options={{
    tabBarLabel: "Camera",
    tabBarIcon: () => <CenterCameraIcon />,
    tabBarButton: (props) => <CenterCameraTabButton {...props} />,
  }}
/>;

<Tab.Screen
  name="Tasks"
  component={TasksStack}
  options={{ tabBarLabel: "Tasks", ... }}
/>;
```

- [ ] **Step 4: Implement the dominant center camera tab button**

```tsx
function CenterCameraTabButton(props: BottomTabBarButtonProps) {
  return (
    <Pressable
      {...props}
      testID="root-tab__camera_button"
      style={{
        top: -10,
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#b91c1c",
        alignItems: "center",
        justifyContent: "center",
      }}
    />
  );
}
```

- [ ] **Step 5: Re-run the focused navigator tests**

Run: `npx jest src/navigation/__tests__/AppNavigator.back-behavior.test.tsx src/navigation/__tests__/uiModeRoutes.test.tsx --runInBand`

Expected: PASS

## Task 3: Move profile into the header and compact weather on `Activity`

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/components/AppScreenHeader.tsx`
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- Modify: `src/screens/__tests__/DashboardScreen.test.tsx`
- Modify: `src/__tests__/integration/DashboardScreenInteraction.test.tsx`

- [ ] **Step 1: Write the failing Activity tests**

```tsx
it("renders compact inline weather metadata instead of a large weather tile", () => {
  const screen = render(<DashboardScreen ... />);

  expect(screen.getByText(/Day 118/)).toBeTruthy();
  expect(screen.getByText(/29°/)).toBeTruthy();
  expect(screen.queryByTestId("dashboard-screen__weather_tile")).toBeNull();
});
```

```tsx
it("keeps the profile shortcut in the header", () => {
  const screen = render(<DashboardScreen ... />);

  expect(screen.getByTestId("dashboard-screen__header_profile")).toBeTruthy();
});
```

- [ ] **Step 2: Run the focused Activity tests and verify they fail**

Run: `npx jest src/screens/__tests__/DashboardScreen.test.tsx src/__tests__/integration/DashboardScreenInteraction.test.tsx --runInBand`

Expected: FAIL because `DashboardScreen` still renders the larger weather tile.

- [ ] **Step 3: Replace the weather tile with compact inline metadata**

```tsx
<Text className="mt-1 text-sm text-slate-500">
  {output.projectSummaryCard.todayLabel}
  {" · "}
  {output.projectSummaryCard.elapsedDayLabel}
  {" · "}
  {output.projectSummaryCard.weatherIconLabel}
  {" "}
  {output.projectSummaryCard.weatherTemperatureLabel}
</Text>
```

```ts
projectSummaryCard: {
  ...
  weatherIconLabel: "☁️",
  weatherTemperatureLabel: "29°",
}
```

- [ ] **Step 4: Keep the shared header profile affordance authoritative**

```tsx
{user ? (
  <Pressable
    testID="app-screen-header__profile-trigger"
    onPress={handleProfilePress}
    className="h-9 w-9 items-center justify-center rounded-full bg-blue-600"
  >
    <Text className="text-base font-bold text-white">{profileInitial}</Text>
  </Pressable>
) : null}
```

- [ ] **Step 5: Re-run the focused Activity tests**

Run: `npx jest src/screens/__tests__/DashboardScreen.test.tsx src/__tests__/integration/DashboardScreenInteraction.test.tsx --runInBand`

Expected: PASS

## Task 4: Implement the global post-capture routing sheet

**Files:**
- Modify: `src/screens/CreateTaskScreen.tsx`
- Modify: `src/__tests__/integration/CreateTaskScreen.test.tsx`

- [ ] **Step 1: Write the failing capture-routing tests**

```tsx
it("shows the post-capture routing sheet when global camera capture returns with photos", async () => {
  const screen = render(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={jest.fn()}
        actionType="photos"
        cameraLaunchContext="global"
        postCaptureDefault="create_task"
        selectedPhotos={[{ uri: "file:///photo.jpg", fileName: "photo.jpg", isAnnotated: false }]}
      />
    </NavigationContainer>
  );

  expect(screen.getByText("What should this photo become?")).toBeTruthy();
  expect(screen.getByText("Create New Task")).toBeTruthy();
  expect(screen.getByText("Add to Existing Task")).toBeTruthy();
});
```

- [ ] **Step 2: Run the focused Create Task tests and verify they fail**

Run: `npx jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand`

Expected: FAIL because there is no routing sheet for the global camera path.

- [ ] **Step 3: Add local post-capture routing-sheet state**

```ts
const shouldShowPostCaptureRoutingSheet =
  actionType === "photos" &&
  cameraLaunchContext === "global" &&
  Boolean(selectedPhotos?.length || uploadedPhotoUrls?.length);

const [captureRoutingChoice, setCaptureRoutingChoice] = useState<
  "create_task" | "existing_task" | null
>(postCaptureDefault === "existing_task" ? "existing_task" : "create_task");
```

- [ ] **Step 4: Render the side-by-side routing sheet**

```tsx
{shouldShowPostCaptureRoutingSheet ? (
  <View testID="create-task__post_capture_routing_sheet" className="rounded-3xl bg-white p-4">
    <Text className="text-lg font-semibold text-slate-900">What should this photo become?</Text>
    <View className="mt-3 flex-row gap-3">
      <Pressable testID="create-task__routing_choice_create" className="flex-1 rounded-2xl bg-slate-950 p-4">
        <Text className="text-base font-semibold text-white">Create New Task</Text>
      </Pressable>
      <Pressable testID="create-task__routing_choice_existing" className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-base font-semibold text-slate-900">Add to Existing Task</Text>
      </Pressable>
    </View>
  </View>
) : null}
```

- [ ] **Step 5: Re-run the focused Create Task tests**

Run: `npx jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand`

Expected: PASS

## Task 5: Implement task-detail camera-default-to-same-task-update behavior

**Files:**
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/navigation/photoShortcutRoutes.ts`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

- [ ] **Step 1: Write the failing task-detail camera test**

```tsx
it("routes task-detail camera capture into the same task update flow", () => {
  const onNavigateToCreateTask = jest.fn();
  const screen = render(
    <TaskDetailScreen
      taskId="task-1"
      subTaskId="subtask-1"
      onNavigateBack={jest.fn()}
      onNavigateToCreateTask={onNavigateToCreateTask}
    />
  );

  fireEvent.press(screen.getByTestId("task-detail__camera_shortcut"));
  expect(onNavigateToCreateTask).toHaveBeenCalledWith(
    undefined,
    undefined,
    "task-1",
    "update",
    "subtask-1",
  );
});
```

- [ ] **Step 2: Run the focused Task Detail tests and verify they fail**

Run: `npx jest src/__tests__/integration/TaskDetailScreen.header.test.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`

Expected: FAIL because there is no dedicated task-detail camera shortcut tied to the approved camera context.

- [ ] **Step 3: Add the dedicated task-detail camera shortcut**

```tsx
<Pressable
  testID="task-detail__camera_shortcut"
  onPress={() =>
    props.onNavigateToCreateTask?.(
      undefined,
      undefined,
      props.taskId,
      "update",
      props.subTaskId,
    )
  }
  className="h-11 w-11 items-center justify-center rounded-full bg-red-700"
>
  <AbstractCameraIcon color="#ffffff" />
</Pressable>
```

- [ ] **Step 4: Keep the photo shortcut helper aligned**

```ts
export function buildPhotoShortcutCreateTaskParams({
  taskId,
  subTaskId,
  selectedPhotos,
  uploadedPhotoUrls,
}: ...) {
  return {
    editTaskId: taskId,
    actionType: "update",
    cameraLaunchContext: "task_detail",
    postCaptureDefault: "same_task_update",
    updateTargetSubTaskId: subTaskId,
    selectedPhotos,
    uploadedPhotoUrls,
  };
}
```

- [ ] **Step 5: Re-run the focused Task Detail tests**

Run: `npx jest src/__tests__/integration/TaskDetailScreen.header.test.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`

Expected: PASS

## Task 6: Validate, relaunch, and close the slice

**Files:**
- Modify: `documentation/ROADMAP.md`
- Modify: `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`
- Modify: `docs/superpowers/specs/2026-07-04-tasks-queue-dashboard-correction-design.md`
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/navigation/__tests__/AppNavigator.back-behavior.test.tsx src/navigation/__tests__/uiModeRoutes.test.tsx src/screens/__tests__/DashboardScreen.test.tsx src/__tests__/integration/DashboardScreenInteraction.test.tsx src/__tests__/integration/CreateTaskScreen.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Update docs and roadmap for the shell/camera slice**

```md
| WS-UX / M-UX-01 / S-UX-01F | Shell + camera redesign | Closed | S-UX-01E2 | 14.7 | ../docs/superpowers/plans/2026-07-04-shell-camera-redesign-implementation.md |
```

```md
- worker shell now uses `Activity / Camera / Tasks`
- profile lives in the top-right header instead of the bottom bar
- camera defaults differ between global capture and task-detail capture
```

- [ ] **Step 3: Assess whether relaunch is required**

Run: `ps -ax | grep -E "expo start --dev-client|metro" | grep -v grep`

Expected: existing server/process state is visible so relaunch need can be assessed explicitly.

- [ ] **Step 4: Relaunch the app because this slice changes shell navigation and capture flow**

Run: `pkill -f "expo start --dev-client" || true && npx expo start --dev-client --clear`
Expected: Metro restarts and reports `Waiting on http://localhost:8081`

Run: `xcrun simctl launch booted com.buildtrack.app.local`
Expected: simulator launch returns a running process id

- [ ] **Step 5: Verify relaunch succeeded before marking the slice closed**

Run: `xcrun simctl list devices booted`
Expected: at least one simulator remains booted

Run: `xcrun simctl launch booted com.buildtrack.app.local`
Expected: app launch succeeds without a bundle-id error

- [ ] **Step 6: Create the checkpoint commit**

```bash
git add src/navigation/navigationTypes.ts src/navigation/AppNavigator.tsx src/navigation/uiModeRoutes.tsx src/components/AppScreenHeader.tsx src/screens/DashboardScreen.tsx src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useDashboardViewAdapter.ts src/screens/CreateTaskScreen.tsx src/screens/TaskDetailScreen.tsx src/navigation/photoShortcutRoutes.ts src/navigation/__tests__/AppNavigator.back-behavior.test.tsx src/navigation/__tests__/uiModeRoutes.test.tsx src/screens/__tests__/DashboardScreen.test.tsx src/__tests__/integration/DashboardScreenInteraction.test.tsx src/__tests__/integration/CreateTaskScreen.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx documentation/ROADMAP.md docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md docs/superpowers/specs/2026-07-04-tasks-queue-dashboard-correction-design.md docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-04-shell-camera-redesign-implementation.md
git commit -m "feat(ux): implement shell and camera redesign"
```

## Spec Coverage Check

- 3-item shell with `Activity / Camera / Tasks`: covered by Task 2
- dominant center camera button: covered by Task 2
- profile in header instead of bottom nav: covered by Task 2 and Task 3
- compact inline weather: covered by Task 3
- global post-capture routing sheet: covered by Task 4
- task-detail camera defaults to same-task photo update: covered by Task 5
- relaunch assessment and verification before close: covered by Task 6

## Placeholder Scan

- No `TBD` / `TODO`
- No unnamed files
- No “implement later” placeholders inside tasks
- Each task includes concrete files, commands, and expected outcomes

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-04-shell-camera-redesign-implementation.md`.

Default execution mode: **Subagent-Driven**.

- I dispatch a fresh subagent per task
- I review between tasks
- inline execution should be used only if the user explicitly requests it
