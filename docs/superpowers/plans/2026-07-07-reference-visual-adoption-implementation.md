# Reference Visual Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the stronger visual hierarchy from the new reference designs to `Recent Activity`, `Tasks` cards, and `Task Detail` event cards while preserving the more mature workflow logic already implemented in the app.

**Architecture:** Keep the current project-scoped behavior, queue rules, overdue logic, and meaningful action-label system intact, but restructure the presentation layer on three surfaces. Use the existing view-adapter contracts as the source of truth, extend them only where the new visual hierarchy needs explicit row-level fields, and keep gallery behavior plus task navigation unchanged.

**Tech Stack:** Expo 54, React Native, TypeScript, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/ui/contracts/viewAdapters.ts`
  Extend dashboard activity rows and task-detail thread rows with the fields needed for the approved visual hierarchy.

- `src/ui/viewAdapters/useDashboardViewAdapter.ts`
  Shape `Recent Activity` items into thumbnail + actor/action + task title + date rows.

- `src/screens/DashboardScreen.tsx`
  Render the new three-line activity row structure with a left thumbnail.

- `src/ui/viewAdapters/useTasksViewAdapter.ts`
  Rebalance task-card support text so status/urgency and location become the main supporting information.

- `src/ui/mappers/tasksMappers.ts`
  Map task rows into a larger-thumbnail card contract while preserving the current Tasks-only card presentation path.

- `src/components/primitives/container/ContainerCard.tsx`
  Refine the thumbnail card shell to match the approved larger-thumbnail, clearer text hierarchy.

- `src/components/taskDetail/TaskActivityTimeline.tsx`
  Convert thread entries into actor/time-first event cards with a large dominant photo and description below.

### Tests to modify

- `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`
- `src/screens/__tests__/DashboardScreen.test.tsx`
- `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
- `src/screens/__tests__/TasksScreen.test.tsx`
- `src/components/primitives/container/__tests__/ContainerCard.test.tsx`
- `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`

### Docs to update after implementation

- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- `docs/superpowers/plans/2026-07-07-reference-visual-adoption-implementation.md`

## Task 1: Redesign Recent Activity rows around thumbnail + actor/action + title + date

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`
- Modify: `src/screens/__tests__/DashboardScreen.test.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
it("builds recent activity rows with actor/action, task title, date, and preview photo", () => {
  const { result } = renderHook(() => useDashboardViewAdapter());

  expect(result.current.output.activityItems[0]).toMatchObject({
    actorLabel: "Jake M.",
    actionLabel: "Added 3 photos",
    title: "Structural steel inspection — Level 12",
    timestampLabel: "2h ago",
    previewPhotoUri: "https://example.com/steel-inspection-photo.jpg",
  });
});
```

```tsx
it("renders recent activity as thumbnail plus a three-line text stack", () => {
  const screen = render(
    <DashboardScreen
      onNavigateToTasks={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
      onNavigateToProfile={jest.fn()}
      onNavigateToTaskDetail={jest.fn()}
    />,
  );

  expect(screen.getByTestId("dashboard-screen__activity_activity-1_thumbnail")).toBeTruthy();
  expect(screen.getByText("Jake M. Added 3 photos")).toBeTruthy();
  expect(screen.getByText("Structural steel inspection — Level 12")).toBeTruthy();
  expect(screen.getByText("2h ago")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/screens/__tests__/DashboardScreen.test.tsx --runInBand`

Expected: FAIL because the adapter and screen still expose and render the older compact title-plus-subtitle row.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/contracts/viewAdapters.ts
export interface DashboardActivityItem extends PrimitiveReadyItemBase {
  id: string;
  taskId: string;
  title: string;
  subtitle: string;
  timestampLabel: string;
  actorLabel?: string;
  actionLabel?: string;
  statusLabel?: string;
  previewPhotoUri?: string;
}
```

```ts
// src/ui/viewAdapters/useDashboardViewAdapter.ts
return {
  ...item,
  actorLabel: resolveActivityActorLabel(activity),
  actionLabel,
  title: task.title,
  subtitle: `${resolveActivityActorLabel(activity)} ${actionLabel}`,
  timestampLabel,
  previewPhotoUri: resolveActivityPreviewPhoto(activity, task),
};
```

```tsx
// src/screens/DashboardScreen.tsx
<Pressable
  key={item.id}
  testID={`dashboard-screen__activity_${item.id}`}
  onPress={() => props.onNavigateToTaskDetail?.(item.taskId)}
  className="rounded-2xl bg-white px-4 py-3"
>
  <View className="flex-row items-start">
    <View
      testID={`dashboard-screen__activity_${item.id}_thumbnail`}
      className="mr-3 h-14 w-14 overflow-hidden rounded-2xl bg-slate-100"
    >
      {item.previewPhotoUri ? (
        <Image source={{ uri: item.previewPhotoUri }} className="h-full w-full" resizeMode="cover" />
      ) : (
        <View className="h-full w-full items-center justify-center bg-slate-100" />
      )}
    </View>

    <View className="min-w-0 flex-1">
      <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>
        {item.actorLabel} {item.actionLabel}
      </Text>
      <Text className="mt-1 text-base font-medium text-slate-700" numberOfLines={1}>
        {item.title}
      </Text>
      <Text className="mt-1 text-sm text-slate-400" numberOfLines={1}>
        {item.timestampLabel}
      </Text>
    </View>
  </View>
</Pressable>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/screens/__tests__/DashboardScreen.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useDashboardViewAdapter.ts src/screens/DashboardScreen.tsx src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/screens/__tests__/DashboardScreen.test.tsx
git commit -m "feat(activity): adopt actor-led recent activity rows"
```

## Task 2: Upgrade Tasks cards to the larger-thumbnail, status/location-focused layout

**Files:**
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
- Modify: `src/ui/mappers/tasksMappers.ts`
- Modify: `src/components/primitives/container/ContainerCard.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`
- Modify: `src/components/primitives/container/__tests__/ContainerCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
it("builds task cards with status-or-urgency and location as the main supporting information", () => {
  const { result } = renderHook(() =>
    useTasksViewAdapter({
      onNavigateToTaskDetail: jest.fn(),
    }),
  );

  expect(result.current.output.taskRowItems[0]).toMatchObject({
    primaryPhotoUri: "https://example.com/task-photo.jpg",
    supportingLine: "REVIEW",
    contextLine: "Level 12, Grid B–C",
    photoDisplayMode: "photo_centric",
  });
});
```

```tsx
it("renders the Tasks list card with a larger thumbnail and clear status/location emphasis", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.getByTestId("container-card:task-1:thumbnail")).toBeTruthy();
  expect(screen.getByText("Structural steel inspection — Level 12")).toBeTruthy();
  expect(screen.getByText("REVIEW")).toBeTruthy();
  expect(screen.getByText("Level 12, Grid B–C")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx src/components/primitives/container/__tests__/ContainerCard.test.tsx --runInBand`

Expected: FAIL because the current card still uses the smaller-thumbnail, urgency-heavy version rather than the approved photo-forward status/location hierarchy.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/viewAdapters/useTasksViewAdapter.ts
function buildSupportingLine(task: Task): string {
  if (isTaskOverdue(task)) {
    return "OVERDUE";
  }

  if (matchesReviewingStatusFilter(task.status)) {
    return "REVIEW";
  }

  if (matchesWipStatusFilter(task.status)) {
    return "DOING";
  }

  return "NEW";
}

function buildContextLine(task: Task): string | undefined {
  return [task.locationLabel, task.zoneLabel].filter(Boolean).join(", ") || undefined;
}
```

```ts
// src/ui/mappers/tasksMappers.ts
if (data.cardPresentation === "thumbnail") {
  return {
    chrome: {
      title: data.title,
      subtitle: data.supportingLine,
      metadataRows: [
        { rowId: "task-card-supporting", label: "Supporting", value: data.supportingLine ?? "" },
        ...(data.contextLine
          ? [{ rowId: "task-card-context", label: "Context", value: data.contextLine }]
          : []),
      ],
      actionSlots: [],
    },
    body: {
      shouldRenderBody: false,
      media: {
        mode: "hidden",
        items: data.primaryPhotoUri ? [{ id: "thumbnail", uri: data.primaryPhotoUri }] : [],
      },
    },
  };
}
```

```tsx
// src/components/primitives/container/ContainerCard.tsx
<View testID={`${resolvedTestId}:thumbnail`} className="mr-3 h-20 w-24 overflow-hidden rounded-2xl bg-slate-100">
  {thumbnailItem ? (
    <Image testID={`${resolvedTestId}:thumbnail-image`} source={{ uri: thumbnailItem.uri }} className="h-full w-full" resizeMode="cover" />
  ) : (
    <View testID={`${resolvedTestId}:thumbnail-placeholder`} className="h-full w-full items-center justify-center bg-slate-100" />
  )}
</View>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx src/components/primitives/container/__tests__/ContainerCard.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/viewAdapters/useTasksViewAdapter.ts src/ui/mappers/tasksMappers.ts src/components/primitives/container/ContainerCard.tsx src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx src/components/primitives/container/__tests__/ContainerCard.test.tsx
git commit -m "feat(tasks): adopt photo-forward task card hierarchy"
```

## Task 3: Redesign Task Detail entries into actor/time-first event cards with dominant photos

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Modify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("renders the actor and timestamp in a top metadata row above the dominant event photo", () => {
  const screen = render(
    <TaskActivityTimeline
      thread={[
        {
          id: "activity-1",
          actorLabel: "Jake M.",
          eventLabel: "Initial site condition — grid B marked off, awaiting structural sign-off.",
          timestampLabel: "Jul 1, 10:24 AM",
          progressLabel: "0%",
          photoUrls: [
            "https://example.com/photo-1.jpg",
            "https://example.com/photo-2.jpg",
          ],
          structuralState: "ready",
          density: "standard",
        },
      ]}
    />,
  );

  expect(screen.getByTestId("task-activity-timeline__entry-header-activity-1")).toBeTruthy();
  expect(screen.getByText("Jake M.")).toBeTruthy();
  expect(screen.getByText("Jul 1, 10:24 AM")).toBeTruthy();
  expect(screen.getByTestId("task-activity-timeline__lead-photo-shell-activity-1")).toBeTruthy();
});
```

```tsx
it("places the event description below the dominant photo area", () => {
  const screen = render(
    <TaskActivityTimeline
      thread={[
        {
          id: "activity-1",
          actorLabel: "Jake M.",
          eventLabel: "Initial site condition — grid B marked off, awaiting structural sign-off.",
          timestampLabel: "Jul 1, 10:24 AM",
          progressLabel: "0%",
          photoUrls: ["https://example.com/photo-1.jpg"],
          structuralState: "ready",
          density: "standard",
        },
      ]}
    />,
  );

  expect(screen.getByTestId("task-activity-timeline__description-activity-1")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand`

Expected: FAIL because the current thread card still uses a rail-metadata + event-title-first composition instead of the approved actor/time-first event card.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/taskDetail/TaskActivityTimeline.tsx
<View
  testID={`task-activity-timeline__entry-header-${activity.id}`}
  className="mb-3 flex-row items-center justify-between"
>
  <View className="flex-row items-center">
    <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-slate-900">
      <Text className="text-sm font-semibold text-white">
        {activity.actorLabel.slice(0, 1)}
      </Text>
    </View>
    <Text className="text-base font-semibold text-slate-900">{activity.actorLabel}</Text>
  </View>
  <Text className="text-sm font-medium text-slate-400">{activity.timestampLabel}</Text>
</View>
```

```tsx
<Text
  testID={`task-activity-timeline__description-${activity.id}`}
  className="mt-4 text-base leading-7 text-slate-700"
>
  {activity.eventLabel}
</Text>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx
git commit -m "feat(task-detail): adopt event-card visual hierarchy"
```

## Task 4: Validate and record the reference visual adoption pass

**Files:**
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-07-reference-visual-adoption-implementation.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/screens/__tests__/DashboardScreen.test.tsx src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx src/components/primitives/container/__tests__/ContainerCard.test.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Update the execution ledger**

```md
- redesigned Recent Activity rows into thumbnail + actor/action + task title + date
- upgraded Tasks cards to a larger-thumbnail, status/location-focused composition
- reworked Task Detail entries into actor/time-first event cards with dominant photos
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-07-reference-visual-adoption-implementation.md
git commit -m "docs(design): record reference visual adoption"
```

## Spec Coverage Check

- Recent Activity adopts thumbnail + actor/action + title + date layout: Task 1
- Tasks list uses larger-thumbnail, photo-forward task cards: Task 2
- Task Detail uses actor/time-first event cards with large dominant photos: Task 3
- stronger existing workflow logic is preserved while only the visual hierarchy changes: Tasks 1-3

## Placeholder Scan

- No `TBD` / `TODO`
- No “similar to Task N” shortcuts
- All file paths are explicit
- Each code-changing step includes concrete code
- Each verification step includes exact commands and expected outcomes

## Type Consistency Check

- `DashboardActivityItem` continues to support shared action-label logic while gaining explicit actor/photo presentation fields
- `TasksScreenRowItem` keeps the Tasks-only thumbnail-card path and reuses it for the photo-forward card refinement
- `TaskDetailActivityThreadRow` keeps the same underlying event data while `TaskActivityTimeline` changes the visual composition only
