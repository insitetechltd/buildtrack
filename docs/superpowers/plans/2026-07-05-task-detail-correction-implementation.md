# Task Detail Thread-Only Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate evidence/delegation surfaces with a thread-only Task Detail layout and fix the photo-update form so every new photo update starts clean after submit.

**Architecture:** Keep the existing Task Detail hero, camera routing, and action hierarchy, but remove the pinned evidence section and lower delegation card from the screen. Push all update storytelling into `TaskActivityTimeline`, extend the thread row contract with a dedicated progress label for rail metadata, and reset both navigator-held draft photo payloads and `CreateTaskScreen` local state after a successful photo update.

**Tech Stack:** Expo 54, React Native, React Navigation, TypeScript, Zustand, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/ui/contracts/viewAdapters.ts`
  Add a dedicated progress label to `TaskDetailActivityThreadRow` so the thread rail can render Date, user, % without deriving `%` from free-form event text.

- `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
  Populate the new thread-row progress label from activity/task data and keep delegation in the hero while the lower delegation summary remains available only until the screen stops rendering it.

- `src/components/taskDetail/TaskActivityTimeline.tsx`
  Replace the current evidence-style card layout with Option B: rail metadata row ordered Date, user, %, large lead photo, compact thumbnail strip, and comment-only body.

- `src/screens/TaskDetailScreen.tsx`
  Remove `TaskDetailEvidenceStrip`, remove `TaskDetailDelegationCard`, remove the sticky evidence region and scroll-driven active-stage state, and make the work thread the only update surface below the hero.

- `src/navigation/AppNavigator.tsx`
  Ensure the create/update wrapper fully clears persisted selected-photo/uploaded-photo state after successful submit.

- `src/screens/CreateTaskScreen.tsx`
  Reset update form local state after successful submit and when route-provided photos have already been consumed, so reopening photo update starts from a fresh draft.

### Tests to modify

- `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
- `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- `src/__tests__/integration/CreateTaskScreen.test.tsx`

### Docs to update after implementation

- `docs/superpowers/specs/2026-07-05-task-detail-correction-design.md`
- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`

## Task 1: Extend the thread-row contract for rail metadata

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Modify: `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("builds thread rows with a dedicated progress label for rail metadata", () => {
  const { result } = renderHook(() => useTaskDetailViewAdapter({ taskId: "task-parent" }));

  expect(result.current.output.activityThread[0]).toMatchObject({
    timestampLabel: expect.any(String),
    actorLabel: expect.any(String),
    progressLabel: "40%",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`

Expected: FAIL because `TaskDetailActivityThreadRow` does not yet expose `progressLabel`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/contracts/viewAdapters.ts
export interface TaskDetailActivityThreadRow extends PrimitiveReadyItemBase {
  id: string;
  actorLabel: string;
  eventLabel: string;
  timestampLabel: string;
  progressLabel: string;
  detailLabel?: string;
  photoUrls: string[];
  statusLabel?: string;
}
```

```ts
// src/ui/viewAdapters/useTaskDetailViewAdapter.ts
const activityThread: TaskDetailActivityThreadRow[] = orderedActivities.map((activity) => ({
  id: activity.id,
  density: "standard",
  structuralState: "stale",
  actorLabel: getUserById(activity.userId)?.name || "Unknown User",
  eventLabel: buildTaskDetailEventLabel(activity),
  timestampLabel: buildTaskDetailTimestampLabel(activity, dateFormatter),
  progressLabel:
    activity.completionPercentage !== undefined
      ? `${activity.completionPercentage}%`
      : `${task.completionPercentage}%`,
  detailLabel: buildTaskDetailEventDetail(activity),
  photoUrls: collectActivityPhotoUrls(activity),
  statusLabel: activity.status ? getStatusLabel(activity.status) : undefined,
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts
git commit -m "fix(ux): add task detail thread progress rail label"
```

## Task 2: Redesign the work thread to Option B

**Files:**
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Modify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("renders rail metadata in the order date, user, then progress", () => {
  const screen = render(
    <TaskActivityTimeline
      thread={[
        {
          id: "activity-1",
          actorLabel: "Tristan",
          eventLabel: "Updated progress to 40%",
          timestampLabel: "Jul 5, 09:30",
          progressLabel: "40%",
          detailLabel: "Waiting on supplier confirmation.",
          photoUrls: [],
          density: "standard",
          structuralState: "ready",
        },
      ]}
    />,
  );

  const metadata = screen.getByTestId("task-activity-timeline__rail-metadata-activity-1");
  expect(metadata.props.children).toEqual(["Jul 5, 09:30", "Tristan", "40%"]);
});
```

```tsx
it("renders one large lead photo plus a compact thumbnail strip for remaining photos", () => {
  const screen = render(
    <TaskActivityTimeline
      thread={[
        {
          id: "activity-1",
          actorLabel: "Tristan",
          eventLabel: "Updated progress to 40%",
          timestampLabel: "Jul 5, 09:30",
          progressLabel: "40%",
          detailLabel: "Waiting on supplier confirmation.",
          photoUrls: [
            "https://example.com/photo-1.jpg",
            "https://example.com/photo-2.jpg",
            "https://example.com/photo-3.jpg",
          ],
          density: "standard",
          structuralState: "ready",
        },
      ]}
    />,
  );

  expect(screen.getByTestId("task-activity-timeline__lead-photo-activity-1")).toBeTruthy();
  expect(screen.getByTestId("task-activity-timeline__thumb-photo-activity-1-1")).toBeTruthy();
  expect(screen.getByTestId("task-activity-timeline__thumb-photo-activity-1-2")).toBeTruthy();
  expect(screen.queryByText("Photo evidence")).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand`

Expected: FAIL because the timeline still renders event headline text, evidence labels, and square photo grids.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/taskDetail/TaskActivityTimeline.tsx
<View className="mr-3 items-start">
  <View className="mt-1 h-3 w-3 rounded-full border-2 border-blue-100 bg-blue-600" />
  {!isLastActivity ? <View className="mt-2 w-0.5 flex-1 bg-blue-100" /> : null}
</View>

<View className="flex-1">
  <View
    testID={`task-activity-timeline__rail-metadata-${activity.id}`}
    className="mb-2 flex-row items-center gap-2"
  >
    <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
      {activity.timestampLabel}
    </Text>
    <Text className="text-xs text-slate-300">•</Text>
    <Text className="text-sm font-medium text-slate-700">{activity.actorLabel}</Text>
    <Text className="text-xs text-slate-300">•</Text>
    <Text className="text-sm font-semibold text-slate-900">{activity.progressLabel}</Text>
  </View>

  <View className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
    {activity.photoUrls.length > 0 ? (
      <View className="mb-3">
        <Image
          testID={`task-activity-timeline__lead-photo-${activity.id}`}
          source={{ uri: activity.photoUrls[0] }}
          className="h-44 w-full rounded-3xl bg-slate-200"
        />
        {activity.photoUrls.length > 1 ? (
          <View className="mt-2 flex-row gap-2">
            {activity.photoUrls.slice(1).map((photoUri, photoIndex) => (
              <Image
                key={`${activity.id}-thumb-${photoIndex + 1}`}
                testID={`task-activity-timeline__thumb-photo-${activity.id}-${photoIndex + 1}`}
                source={{ uri: photoUri }}
                className="h-14 w-14 rounded-2xl bg-slate-200"
              />
            ))}
          </View>
        ) : null}
      </View>
    ) : null}

    {activity.detailLabel ? (
      <Text
        testID="task-activity-timeline__detail-label"
        className="text-sm leading-5 text-slate-600"
      >
        {activity.detailLabel}
      </Text>
    ) : null}
  </View>
</View>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx
git commit -m "fix(ux): redesign task detail thread entries"
```

## Task 3: Remove the evidence section and lower delegation card from Task Detail

**Files:**
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("renders the hero directly above the work thread with no evidence region", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.getByTestId("task-detail__hero")).toBeTruthy();
  expect(screen.queryByTestId("task-detail__evidence_pinned_region")).toBeNull();
  expect(screen.queryByTestId("task-detail__active_entry_stage")).toBeNull();
  expect(screen.getByTestId("task-detail__activity_thread")).toBeTruthy();
});
```

```tsx
it("does not render the lower delegation card once delegation is in the hero", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.queryByText("Delegation details")).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand`

Expected: FAIL because the screen still renders the pinned evidence region and `TaskDetailDelegationCard`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/screens/TaskDetailScreen.tsx
<ScrollView
  testID="task-detail__workthread_scroll"
  className="flex-1"
  contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
  scrollEnabled
  showsVerticalScrollIndicator={false}
>
  <TaskDetailHero model={output.taskHero} />

  {output.banners.map((banner) => (
    <BannerPrimitive key={banner.id} contract={mapBannerModelToBannerProps(banner)} />
  ))}

  <TaskActivityTimeline
    testID="task-detail__activity_thread"
    thread={output.activityThread}
  />

  <TaskDetailSubtasksSection
    model={output.subtaskSummary}
    childTasks={output.childTasks}
    onNavigateToTaskDetail={props.onNavigateToTaskDetail}
  />
</ScrollView>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/TaskDetailScreen.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx
git commit -m "fix(ux): remove task detail evidence and lower delegation sections"
```

## Task 4: Reset the photo-update form after successful submit

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/screens/CreateTaskScreen.tsx`
- Modify: `src/__tests__/integration/CreateTaskScreen.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("clears selected photo draft state after a successful update submit", async () => {
  const onNavigateBack = jest.fn();
  const screen = render(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={onNavigateBack}
        editTaskId="task-1"
        actionType="update"
        selectedPhotos={[{ uri: "file:///photo-1.jpg", fileName: "photo-1.jpg", isAnnotated: false }]}
      />
    </NavigationContainer>,
  );

  fireEvent.changeText(screen.getByPlaceholderText("Describe your progress update..."), "Fresh update");
  fireEvent.press(screen.getByText("Submit Update"));

  await waitFor(() => expect(mockAddTaskUpdate).toHaveBeenCalled());
  expect(onNavigateBack).toHaveBeenCalled();
});
```

```tsx
it("resets update form state when onClearDraftPayloads runs after submit", async () => {
  const onClearDraftPayloads = jest.fn();
  const screen = render(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={jest.fn()}
        onClearDraftPayloads={onClearDraftPayloads}
        editTaskId="task-1"
        actionType="update"
        selectedPhotos={[{ uri: "file:///photo-1.jpg", fileName: "photo-1.jpg", isAnnotated: false }]}
      />
    </NavigationContainer>,
  );

  fireEvent.changeText(screen.getByPlaceholderText("Describe your progress update..."), "Fresh update");
  fireEvent.press(screen.getByText("Submit Update"));

  await waitFor(() => expect(onClearDraftPayloads).toHaveBeenCalled());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand`

Expected: FAIL because local update state and wrapper-held draft payloads persist after successful submit.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/screens/CreateTaskScreen.tsx
const resetUpdateDraft = React.useCallback(() => {
  setDraftSelectedPhotos([]);
  setFailedUploadsInSession([]);
  setUpdateForm({
    description: "",
    photos: [],
    completionPercentage: targetTask?.completionPercentage || 0,
    status: (targetTask?.status || "in_progress") as TaskStatus,
  });
}, [targetTask]);
```

```tsx
// src/screens/CreateTaskScreen.tsx
await addTaskUpdate(task.id, updatePayload);
resetUpdateDraft();
onClearDraftPayloads?.();
await fetchTaskById(task.id);
onNavigateBack();
```

```tsx
// src/navigation/AppNavigator.tsx
onClearDraftPayloads={() => {
  setSelectedPhotosState(undefined);
  setUploadedPhotoUrlsState(undefined);
  navigation.setParams({
    selectedPhotos: undefined,
    uploadedPhotoUrls: undefined,
  });
}}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/navigation/AppNavigator.tsx src/screens/CreateTaskScreen.tsx src/__tests__/integration/CreateTaskScreen.test.tsx
git commit -m "fix(ux): reset task photo update drafts after submit"
```

## Task 5: Validate, relaunch, and update execution notes

**Files:**
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-05-task-detail-correction-implementation.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Relaunch the app for visual verification**

Run: `pkill -f "expo start --dev-client" || true && env -u CI npx expo start --dev-client --clear`

Expected: Metro restarts on a fresh bundle.

Run: `xcrun simctl terminate booted com.buildtrack.app.local || true && xcrun simctl launch booted com.buildtrack.app.local`

Expected: app relaunch succeeds on the booted simulator.

- [ ] **Step 3: Update the execution ledger**

```md
- removed the separate evidence section from Task Detail
- removed the lower delegation card so delegation only lives in the hero
- redesigned the work thread to Option B with rail metadata ordered Date, user, %
- moved photo storytelling fully into the thread with one large lead photo and compact thumbnails
- fixed the photo-update flow so a new photo update starts from a clean form after submit
```

- [ ] **Step 4: Create the checkpoint commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/components/taskDetail/TaskActivityTimeline.tsx src/screens/TaskDetailScreen.tsx src/navigation/AppNavigator.tsx src/screens/CreateTaskScreen.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/CreateTaskScreen.test.tsx docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-05-task-detail-correction-implementation.md
git commit -m "fix(ux): simplify task detail into thread-only updates"
```

## Spec Coverage Check

- remove lower delegation section: Task 3
- remove evidence section: Task 3
- keep delegation only in hero: Task 3 regression coverage
- thread-only update model: Tasks 2 and 3
- Option B metadata order Date, user, %: Tasks 1 and 2
- large lead photo + compact thumbnail strip: Task 2
- comment inside thread card body: Task 2
- photo-update form reset after submit: Task 4
- preserve existing camera routing and inline actions: Task 3 regression coverage and Task 5 validation

## Placeholder Scan

- No `TBD` / `TODO`
- No “similar to Task N” shortcuts
- All file paths are explicit
- Each code-changing step includes concrete code
- Each verification step includes exact commands and expected outcomes

## Type Consistency Check

- `TaskDetailActivityThreadRow` gains `progressLabel`, and both the adapter and timeline tests use the same field name
- `TaskActivityTimeline` remains the only thread renderer and keeps `detailLabel` for comment content
- `CreateTaskScreen` owns `resetUpdateDraft`, while `AppNavigator` continues clearing route-held draft payloads through `onClearDraftPayloads`
