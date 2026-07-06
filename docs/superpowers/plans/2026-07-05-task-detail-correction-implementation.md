# Task Detail Readability + Quick Actions Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine Task Detail so the hero is lighter, the content scroll region is properly bounded, small text is readable, quick actions become state-aware, the bottom nav is evenly spaced, and full-screen thread photos support swipe browsing.

**Architecture:** Reuse the existing sticky-hero, merged-info-card, and unified-thread foundations, then layer on a lighter hero model, a contextual quick-actions model, a true fixed-top plus bounded-scroll screen structure, larger mobile type, an equal-slot bottom navigation layout, and a swipeable per-entry photo gallery. The work is concentrated in the task-detail adapter, task-detail screen/components, and bottom navigation shell.

**Tech Stack:** Expo 54, React Native, React Navigation, TypeScript, Zustand, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/ui/contracts/viewAdapters.ts`
  Remove delegation from the hero-facing contract, add a contextual quick-actions model if needed, and support per-entry gallery state assumptions without changing data ownership.

- `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
  Build the state-aware quick actions row, remove delegation from the hero model, and keep lower-frequency actions separated for the lower actions area.

- `src/components/taskDetail/TaskDetailHero.tsx`
  Remove delegation rendering, bump small text sizing, and keep the hero status-only.

- `src/components/taskDetail/TaskDetailInfoCard.tsx`
  Increase label/body sizes for readability while keeping delegation inside the info card.

- `src/components/taskDetail/TaskDetailQuickActions.tsx`
  New component for the contextual quick-actions row below the info card.

- `src/components/taskDetail/TaskActivityTimeline.tsx`
  Increase small text sizes, keep in-thread full-photo visibility, and replace the single-image modal with swipeable gallery navigation across an entry’s photos.

- `src/screens/TaskDetailScreen.tsx`
  Change from sticky-over-scroll to fixed hero + bounded scroll content region, insert quick actions below the info card, and keep lower-frequency actions beneath the thread.

- `src/navigation/AppNavigator.tsx`
  Rebalance bottom nav spacing so Activity, Camera, and Tasks occupy equal visual slots while preserving camera emphasis.

### Tests to modify or add

- `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`
- `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- `src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx`
- `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
- `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- `src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx`

### Docs to update after implementation

- `docs/superpowers/specs/2026-07-05-task-detail-correction-design.md`
- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`

## Task 1: Build contextual quick-actions data and lighten the hero contract

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Modify: `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("omits delegation from the hero model and keeps delegation only in the info card", () => {
  const { result } = renderHook(() => useTaskDetailViewAdapter({ taskId: "task-parent" }));

  expect(result.current.output.taskHero).not.toHaveProperty("assignedByLabel");
  expect(result.current.output.infoCard?.assignedToLabel).toBe("User user-2, User user-3");
});
```

```ts
it("builds quick actions for pre-acceptance state", () => {
  const { result } = renderHook(() => useTaskDetailViewAdapter({ taskId: "task-awaiting-acceptance" }));

  expect(result.current.output.quickActions?.map((action) => action.actionId)).toEqual([
    "accept_task",
    "reject_task",
  ]);
});
```

```ts
it("builds quick actions for active work and review/approval states", () => {
  const active = renderHook(() => useTaskDetailViewAdapter({ taskId: "task-in-progress" })).result.current;
  const reviewer = renderHook(() => useTaskDetailViewAdapter({ taskId: "task-pending-review" })).result.current;

  expect(active.output.quickActions?.map((action) => action.actionId)).toEqual([
    "update_progress",
    "add_comment",
    "add_subtask",
  ]);

  expect(reviewer.output.quickActions?.map((action) => action.actionId)).toEqual([
    "approve_task",
    "reject_task",
    "add_comment",
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`

Expected: FAIL because the adapter does not yet expose state-aware quick actions and still couples some status context to the old action ordering assumptions.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/contracts/viewAdapters.ts
export interface TaskDetailQuickActionRowModel extends PrimitiveReadyItemBase {
  id: string;
  actions: TaskDetailActionItem[];
}
```

```ts
// src/ui/contracts/viewAdapters.ts
export interface TaskDetailScreenViewAdapterOutput {
  // ...
  quickActions?: TaskDetailQuickActionRowModel;
  actionItems: TaskDetailActionItem[];
  // ...
}
```

```ts
// src/ui/viewAdapters/useTaskDetailViewAdapter.ts
const quickActionIds = isAwaitingAcceptance
  ? ["accept_task", "reject_task"]
  : isReviewerApprovalState
    ? ["approve_task", "reject_task", "add_comment"]
    : isContributorReviewState
      ? ["submit_review", "add_comment", "update_progress"]
      : ["update_progress", "add_comment", "add_subtask"];

const quickActions: TaskDetailQuickActionRowModel = {
  id: "task-quick-actions",
  density: "standard",
  structuralState: "stale",
  actions: actionItems.filter((action) => quickActionIds.includes(action.actionId)),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts
git commit -m "fix(ux): add task detail contextual quick actions"
```

## Task 2: Add the Quick Actions row component and raise Task Detail typography

**Files:**
- Create: `src/components/taskDetail/TaskDetailQuickActions.tsx`
- Modify: `src/components/taskDetail/TaskDetailHero.tsx`
- Modify: `src/components/taskDetail/TaskDetailInfoCard.tsx`
- Modify: `src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("renders the contextual quick actions row below the info card", () => {
  const screen = render(
    <TaskDetailQuickActions
      model={{
        id: "task-quick-actions",
        density: "standard",
        structuralState: "ready",
        actions: [
          { id: "a1", actionId: "accept_task", label: "Accept", isDisabled: false },
          { id: "a2", actionId: "reject_task", label: "Reject", isDisabled: false },
        ],
      }}
      onPress={jest.fn()}
    />,
  );

  expect(screen.getByTestId("task-detail__quick-actions")).toBeTruthy();
  expect(screen.getByText("Accept")).toBeTruthy();
  expect(screen.getByText("Reject")).toBeTruthy();
});
```

```tsx
it("uses larger readable sizes for hero and info-card secondary text", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.getByText("Description").props.className).toContain("text-base");
  expect(screen.getByText("Details").props.className).toContain("text-base");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: FAIL because the quick-actions component does not exist and text sizing remains at the smaller scale.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/taskDetail/TaskDetailQuickActions.tsx
export default function TaskDetailQuickActions({ model, onPress }: Props) {
  return (
    <View testID="task-detail__quick-actions" className="mx-4 mt-4 rounded-2xl border border-gray-200 bg-white p-3">
      <Text className="mb-3 text-base font-semibold uppercase tracking-wide text-gray-500">
        Quick Actions
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {model.actions.map((action) => (
          <Pressable key={action.id} onPress={() => onPress(action.actionId)} className="rounded-full border border-gray-300 bg-white px-4 py-3">
            <Text className="text-lg font-medium text-gray-700">{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
```

```tsx
// src/components/taskDetail/TaskDetailHero.tsx
<Text className="text-lg font-medium text-slate-600">{chip.label}</Text>
```

```tsx
// src/components/taskDetail/TaskDetailInfoCard.tsx
<Text className="text-base font-semibold uppercase tracking-[0.08em] text-slate-500">Description</Text>
<Text className="mt-2 text-lg leading-7 text-slate-700">{model.descriptionLabel || "—"}</Text>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/taskDetail/TaskDetailQuickActions.tsx src/components/taskDetail/TaskDetailHero.tsx src/components/taskDetail/TaskDetailInfoCard.tsx src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
git commit -m "fix(ux): add task detail quick actions row"
```

## Task 3: Replace sticky overlay behavior with a bounded scroll region

**Files:**
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("renders the hero outside the bounded scroll region so thread content never scrolls behind it", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.queryByTestId("task-detail__workthread_scroll").props.stickyHeaderIndices).toBeUndefined();
  expect(screen.getByTestId("task-detail__hero_shell")).toBeTruthy();
  expect(screen.getByTestId("task-detail__scroll_region")).toBeTruthy();
});
```

```tsx
it("renders quick actions above the work thread and keeps other actions below the thread", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.getByTestId("task-detail__quick-actions")).toBeTruthy();
  expect(screen.getByTestId("task-detail__activity_thread")).toBeTruthy();
  expect(screen.getByTestId("task-detail__secondary-actions")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand`

Expected: FAIL because the screen still relies on scroll-stickiness rather than a fixed-top bounded layout.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/screens/TaskDetailScreen.tsx
<View testID="task-detail__hero_shell">
  <TaskDetailHero model={output.taskHero} />
</View>

<View testID="task-detail__scroll_region" className="flex-1">
  <ScrollView testID="task-detail__workthread_scroll" className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
    {output.infoCard ? <TaskDetailInfoCard model={output.infoCard} /> : null}
    {output.quickActions ? <TaskDetailQuickActions model={output.quickActions} onPress={handleActionPress} /> : null}
    <TaskActivityTimeline testID="task-detail__activity_thread" thread={output.activityThread} />
    <View testID="task-detail__secondary-actions">{/* lower-frequency actions */}</View>
  </ScrollView>
</View>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/TaskDetailScreen.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx
git commit -m "fix(ux): bound task detail scrolling below hero"
```

## Task 4: Add swipeable per-entry photo gallery behavior

**Files:**
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Modify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("opens the full-screen photo viewer on the selected image and supports next/previous photo navigation", () => {
  const screen = render(
    <TaskActivityTimeline
      thread={[
        {
          id: "activity-2",
          actorLabel: "Tristan",
          timestampLabel: "Jul 5, 09:30",
          progressLabel: "40%",
          detailLabel: "Ceiling grid installed.",
          photoUrls: ["https://example.com/photo-1.jpg", "https://example.com/photo-2.jpg"],
          density: "standard",
          structuralState: "ready",
          eventLabel: "Marked 40% complete",
        },
      ]}
    />,
  );

  fireEvent.press(screen.getByTestId("task-activity-timeline__thumb-photo-pressable-activity-2-1"));

  expect(screen.getByTestId("task-activity-timeline__photo_viewer_image").props.source).toEqual({
    uri: "https://example.com/photo-2.jpg",
  });

  fireEvent.press(screen.getByTestId("task-activity-timeline__photo_viewer_previous"));

  expect(screen.getByTestId("task-activity-timeline__photo_viewer_image").props.source).toEqual({
    uri: "https://example.com/photo-1.jpg",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand`

Expected: FAIL because the viewer only opens a single selected image and does not provide gallery navigation.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/taskDetail/TaskActivityTimeline.tsx
const [selectedGallery, setSelectedGallery] = React.useState<{ photos: string[]; index: number } | undefined>();

const openGallery = (photos: string[], index: number) => setSelectedGallery({ photos, index });
const showPrevious = () =>
  setSelectedGallery((current) =>
    current ? { ...current, index: Math.max(current.index - 1, 0) } : current,
  );
const showNext = () =>
  setSelectedGallery((current) =>
    current ? { ...current, index: Math.min(current.index + 1, current.photos.length - 1) } : current,
  );
```

```tsx
// src/components/taskDetail/TaskActivityTimeline.tsx
<Pressable testID={`task-activity-timeline__lead-photo-pressable-${activity.id}`} onPress={() => openGallery(activity.photoUrls, 0)}>
  <Image resizeMode="contain" className="w-full rounded-3xl bg-slate-100" source={{ uri: activity.photoUrls[0] }} />
</Pressable>
```

```tsx
// src/components/taskDetail/TaskActivityTimeline.tsx
<Pressable testID="task-activity-timeline__photo_viewer_previous" onPress={showPrevious}>
  <Ionicons name="chevron-back" size={28} color="#ffffff" />
</Pressable>
<Image testID="task-activity-timeline__photo_viewer_image" source={{ uri: selectedGallery.photos[selectedGallery.index] }} resizeMode="contain" className="h-full w-full" />
<Pressable testID="task-activity-timeline__photo_viewer_next" onPress={showNext}>
  <Ionicons name="chevron-forward" size={28} color="#ffffff" />
</Pressable>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx
git commit -m "fix(ux): add swipeable task detail photo gallery"
```

## Task 5: Rebalance bottom navigation spacing

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("uses equal visual slot sizing for Activity, Camera, and Tasks tabs", () => {
  const screen = render(<AppNavigator />);
  const activityTab = screen.getByTestId("root-tab__activity");
  const cameraTab = screen.getByTestId("root-tab__camera");
  const tasksTab = screen.getByTestId("root-tab__tasks");

  expect(activityTab.props.style.flex).toBe(1);
  expect(cameraTab.props.style.flex).toBe(1);
  expect(tasksTab.props.style.flex).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx --runInBand`

Expected: FAIL because the current bottom nav does not expose equal slot styling for the three tabs.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/navigation/AppNavigator.tsx
tabBarItemStyle: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
},
```

```tsx
// src/navigation/AppNavigator.tsx
options={{
  tabBarTestID: "root-tab__activity",
}}
```

```tsx
// src/navigation/AppNavigator.tsx
options={{
  tabBarButton: (props) => (
    <CenterCameraTabButton
      {...props}
      testID="root-tab__camera"
      style={[props.style, { flex: 1 }]}
      icon={/* existing icon */}
    />
  ),
}}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/navigation/AppNavigator.tsx src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx
git commit -m "fix(ux): rebalance bottom navigation spacing"
```

## Task 6: Validate, relaunch, and update execution notes

**Files:**
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-05-task-detail-correction-implementation.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Relaunch the app for visual verification**

Run: `pkill -f "expo start --dev-client" || true && env -u CI npx expo start --dev-client --clear`

Expected: Metro restarts on a fresh bundle.

Run: `xcrun simctl terminate booted com.buildtrack.app.local || true && xcrun simctl launch booted com.buildtrack.app.local`

Expected: app relaunch succeeds on the booted simulator.

- [ ] **Step 3: Update the execution ledger**

```md
- removed delegation from the fixed hero and kept it only inside the merged info card
- increased Task Detail micro and secondary text sizing for mobile readability
- replaced sticky overlay behavior with a bounded scroll region below the hero
- added a contextual Quick Actions row for acceptance, active work, and review/approval states
- rebalanced the bottom navigation so Activity, Camera, and Tasks occupy equal visual slots
- upgraded full-screen thread photos into a swipeable per-entry gallery
```

- [ ] **Step 4: Create the checkpoint commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/components/taskDetail/TaskDetailHero.tsx src/components/taskDetail/TaskDetailInfoCard.tsx src/components/taskDetail/TaskDetailQuickActions.tsx src/components/taskDetail/TaskActivityTimeline.tsx src/screens/TaskDetailScreen.tsx src/navigation/AppNavigator.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-05-task-detail-correction-implementation.md docs/superpowers/specs/2026-07-05-task-detail-correction-design.md
git commit -m "fix(ux): refine task detail readability and actions"
```

## Spec Coverage Check

- remove delegation from hero: Task 1 and Task 2
- keep merged info card as single delegation/details surface: Tasks 1 and 2
- increase small text sizes: Task 2
- bounded scroll region below hero: Task 3
- contextual quick actions by state: Tasks 1, 2, and 3
- lower-frequency actions separated below thread: Task 3
- unified thread preserved: Task 3 regression coverage
- swipeable full-screen photo gallery: Task 4
- equal bottom-nav spacing: Task 5
- preserve camera routing and photo-update reset behavior: Task 6 validation

## Placeholder Scan

- No `TBD` / `TODO`
- No “similar to Task N” shortcuts
- All file paths are explicit
- Each code-changing step includes concrete code
- Each verification step includes exact commands and expected outcomes

## Type Consistency Check

- `TaskDetailQuickActionRowModel` is defined in Task 1 and consumed by `TaskDetailQuickActions` in Task 2
- `quickActions` is produced by the adapter in Task 1 and rendered by `TaskDetailScreen` in Task 3
- `selectedGallery` is local to `TaskActivityTimeline` in Task 4 and does not change the adapter contract
