# Thread Refinement Caption Swipe Creation Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine Task Detail work-thread entries so photo-bearing updates use caption-above-photo, swipe-first browsing, the approved two-line metadata order, and creation-time photos appear on the first `Created by` event only.

**Architecture:** Keep title expansion work intact and limit this slice to the thread pipeline: map creation-photo provenance in `useTaskDetailViewAdapter.ts`, then render the approved layout in `TaskActivityTimeline.tsx`. Tests should lock both the data mapping and the visual contract before implementation so the renderer and adapter change together.

**Tech Stack:** Expo React Native, TypeScript, React Native Testing Library, Jest, NativeWind utility classes

---

## File Map

- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
  - attach creation-time photos to the first creation event only
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
  - implement two-line metadata, caption-above-photo, swipe-first gallery, and reduce arrow dependence
- Modify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
  - cover the refined layout and gallery interaction
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
  - align screen-level contract
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
  - align any stale event-detail assertions
- Modify: `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
  - keep bounded layout expectations aligned

### Task 1: Lock the refined thread contract in tests

**Files:**
- Modify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- Test: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- Test: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Add the failing two-line metadata assertions**

```tsx
expect(screen.getByTestId("task-activity-timeline__metadata_line_1-activity-1")).toBeTruthy();
expect(screen.getByTestId("task-activity-timeline__metadata_line_2-activity-1")).toBeTruthy();
expect(screen.getByText("Herman")).toBeTruthy();
expect(screen.getByText("In Progress")).toBeTruthy();
expect(screen.getByText("Jun 30, 2026 at 5:22 PM")).toBeTruthy();
expect(screen.getByText("0% complete")).toBeTruthy();
```

- [ ] **Step 2: Add the failing photo-caption and swipe assertions**

```tsx
expect(screen.getByTestId("task-activity-timeline__photo_caption-activity-1")).toBeTruthy();
expect(screen.getByText("Added 2 photos")).toBeTruthy();
expect(screen.getByTestId("task-activity-timeline__photo_swipe_surface-activity-1")).toBeTruthy();
expect(screen.queryByTestId("task-activity-timeline__gallery_previous-activity-1")).toBeNull();
expect(screen.queryByTestId("task-activity-timeline__gallery_next-activity-1")).toBeNull();
```

- [ ] **Step 3: Add the failing creation-photo mapping assertion**

```tsx
expect(screen.getByTestId("task-activity-timeline__entry-created-1")).toBeTruthy();
expect(screen.getByTestId("task-activity-timeline__photo_caption-created-1")).toBeTruthy();
expect(screen.getByText("Added 3 photos")).toBeTruthy();
expect(screen.queryByTestId("task-activity-timeline__photo_caption-progress-1")).toBeNull();
```

- [ ] **Step 4: Run the focused tests to verify they fail**

Run: `npm test -- --runInBand --runTestsByPath src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

Expected: FAIL because the current timeline still uses the older metadata grouping, arrow-led gallery controls, and no creation-photo remapping.

- [ ] **Step 5: Commit the red tests**

```bash
git add src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
git commit -m "test(task-detail): capture refined thread photo contract"
```

### Task 2: Map creation photos to the first creation event only

**Files:**
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Test: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Add a helper that identifies creation activities and task-level creation photos**

```ts
function collectCreationPhotoUrls(task: Task): string[] {
  return collectTaskPhotoAttachments(task);
}

function isCreationActivity(activity: TaskActivity): boolean {
  return activity.activityType === "creation";
}
```

- [ ] **Step 2: Inject creation photos into the first creation event only**

```ts
const creationPhotoUrls = collectCreationPhotoUrls(task);
let hasAssignedCreationPhotos = false;

const thread = orderedActivities.map((activity) => {
  const intrinsicPhotos = collectActivityPhotoUrls(activity);
  const photoUrls =
    !hasAssignedCreationPhotos && isCreationActivity(activity) && creationPhotoUrls.length > 0
      ? (() => {
          hasAssignedCreationPhotos = true;
          return creationPhotoUrls;
        })()
      : intrinsicPhotos;

  return {
    id: activity.id,
    photoUrls,
    // ...rest of row mapping
  };
});
```

- [ ] **Step 3: Run the focused acceptance test**

Run: `npm test -- --runInBand --runTestsByPath src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

Expected: creation-photo assertions now pass while later update entries retain only their own photos.

- [ ] **Step 4: Commit the adapter mapping**

```bash
git add src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
git commit -m "feat(task-detail): anchor creation photos to created event"
```

### Task 3: Implement the refined thread layout and swipe-first gallery

**Files:**
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Test: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- Test: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Reorganize metadata into two explicit lines**

```tsx
<View testID={`task-activity-timeline__metadata_line_1-${activity.id}`} className="flex-row items-center justify-between gap-3">
  <Text className="min-w-0 flex-1 text-base font-semibold text-slate-900" numberOfLines={1}>
    {activity.actorLabel}
  </Text>
  {activity.statusLabel ? (
    <View className="rounded-full bg-slate-200 px-2.5 py-1">
      <Text className="text-sm font-semibold text-slate-700">{activity.statusLabel}</Text>
    </View>
  ) : null}
</View>
<View testID={`task-activity-timeline__metadata_line_2-${activity.id}`} className="mt-1 flex-row items-center justify-between gap-3">
  <Text className="min-w-0 flex-1 text-sm font-medium text-slate-400">{activity.timestampLabel}</Text>
  <Text className="text-sm font-semibold text-slate-500">{activity.progressLabel} complete</Text>
</View>
```

- [ ] **Step 2: Move the photo count to a caption above the photo**

```tsx
<Text
  testID={`task-activity-timeline__photo_caption-${activity.id}`}
  className="mb-2 text-base font-semibold text-slate-900"
>
  {activity.photoUrls.length === 1 ? "Added 1 photo" : `Added ${activity.photoUrls.length} photos`}
</Text>
```

- [ ] **Step 3: Replace button-led navigation with a swipe-first photo surface**

```tsx
<ScrollView
  testID={`task-activity-timeline__photo_swipe_surface-${activity.id}`}
  horizontal
  pagingEnabled
  showsHorizontalScrollIndicator={false}
  onMomentumScrollEnd={(event) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / Math.max(event.nativeEvent.layoutMeasurement.width, 1),
    );
    setGalleryIndices((current) => ({ ...current, [activity.id]: nextIndex }));
  }}
>
  {activity.photoUrls.map((photoUri, photoIndex) => (
    <Pressable
      key={`${activity.id}:photo:${photoIndex}`}
      onPress={() => openGallery(activity.photoUrls, photoIndex)}
      className="w-full"
    >
      <Image source={{ uri: photoUri }} resizeMode="cover" className="h-full w-full rounded-3xl" />
    </Pressable>
  ))}
</ScrollView>
```

- [ ] **Step 4: Keep pager dots as feedback only**

```tsx
<View testID={`task-activity-timeline__gallery_pager-${activity.id}`} className="mt-3 flex-row items-center justify-center gap-1.5">
  {activity.photoUrls.map((_, photoIndex) => (
    <View
      key={`${activity.id}:dot:${photoIndex}`}
      className={cn(
        "h-2 rounded-full",
        photoIndex === currentPhotoIndex ? "w-5 bg-[#08576E]" : "w-2 bg-slate-300",
      )}
    />
  ))}
</View>
```

- [ ] **Step 5: Run the focused thread tests**

Run: `npm test -- --runInBand --runTestsByPath src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit the refined thread layout**

```bash
git add src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
git commit -m "feat(task-detail): refine swipeable photo thread layout"
```

### Task 4: Validate the combined screen contract

**Files:**
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- Modify: `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
- Test: `src/components/cards/__tests__/ActivityStyleRowCard.test.tsx`
- Test: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- Test: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- Test: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- Test: `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`

- [ ] **Step 1: Run the full focused regression set**

Run: `npm test -- --runInBand --runTestsByPath src/components/cards/__tests__/ActivityStyleRowCard.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`

Expected: PASS

- [ ] **Step 2: Review the scoped diff**

Run: `git diff --stat -- src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`

Expected: only the approved thread refinement files are touched.

- [ ] **Step 3: Commit any final validation alignment**

```bash
git add src/__tests__/integration/TaskDetailScreen.header.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
git commit -m "test(task-detail): verify refined thread presentation"
```
