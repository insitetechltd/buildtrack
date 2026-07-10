# Task Title Expansion And Photo-Centric Thread Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline task-title expansion in Task Detail and task-list rows, and redesign Task Detail work-thread entries into the approved open, right-heavy photo-centric layout.

**Architecture:** Reuse the existing `titleNode` path in `TaskDetailScreen` and the shared `ActivityStyleRowCard` for title expansion so the interaction remains local to each rendered surface. Rework `TaskActivityTimeline` structurally, not semantically: keep ordering and gallery behavior, but move the actor row outside the content area and shift photo-bearing entries into the approved right-heavy open layout with swipe affordances.

**Tech Stack:** Expo React Native, TypeScript, React Native Testing Library, Jest, NativeWind utility classes

---

## File Map

- Modify: `src/components/cards/ActivityStyleRowCard.tsx`
  - add local inline expansion state for task-list row titles
- Modify: `src/components/cards/__tests__/ActivityStyleRowCard.test.tsx`
  - cover title expansion without breaking row press
- Modify: `src/screens/TaskDetailScreen.tsx`
  - add local inline expansion state for the header title
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
  - cover inline header-title expansion
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
  - restructure work-thread entries into the approved open layout
- Modify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
  - cover outer actor row, open content area, and right-heavy photo layout
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
  - align screen-level assertions to the new timeline structure
- Modify: `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
  - keep overall bounded scroll behavior aligned with the new open thread layout

### Task 1: Lock inline title expansion in tests

**Files:**
- Modify: `src/components/cards/__tests__/ActivityStyleRowCard.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- Test: `src/components/cards/__tests__/ActivityStyleRowCard.test.tsx`
- Test: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

- [ ] **Step 1: Add the failing row-card title expansion test**

```tsx
it("expands the title inline without triggering row navigation when the title itself is pressed", () => {
  const onPress = jest.fn();
  const screen = render(
    <ActivityStyleRowCard
      testID="shared-card:task-expand"
      title="Very long task title that should expand inline when pressed"
      subtitle="North Tower"
      metaLabel="Jul 8 at 9:15 AM"
      badgeLabel="Review"
      imageUri={undefined}
      onPress={onPress}
    />,
  );

  const title = screen.getByTestId("shared-card:task-expand:title");

  expect(title.props.numberOfLines).toBe(2);

  fireEvent.press(title);

  expect(title.props.numberOfLines).toBeUndefined();
  expect(onPress).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Add the failing Task Detail header-title expansion test**

```tsx
it("expands the task detail header title inline when the title text is pressed", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  const headerTitle = screen.getByTestId("task-detail__header_title_text");

  expect(headerTitle.props.numberOfLines).toBe(1);

  fireEvent.press(headerTitle);

  expect(screen.getByTestId("task-detail__header_title_text").props.numberOfLines).toBeUndefined();
});
```

- [ ] **Step 3: Run the focused tests to verify they fail**

Run: `npm test -- --runInBand --runTestsByPath src/components/cards/__tests__/ActivityStyleRowCard.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx`

Expected: FAIL because neither title surface has inline expansion yet.

- [ ] **Step 4: Commit the red title-expansion tests**

```bash
git add src/components/cards/__tests__/ActivityStyleRowCard.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx
git commit -m "test(task-ui): capture inline title expansion"
```

### Task 2: Implement inline title expansion

**Files:**
- Modify: `src/components/cards/ActivityStyleRowCard.tsx`
- Modify: `src/screens/TaskDetailScreen.tsx`
- Test: `src/components/cards/__tests__/ActivityStyleRowCard.test.tsx`
- Test: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

- [ ] **Step 1: Add local expansion state to the shared row card**

```tsx
const [isTitleExpanded, setIsTitleExpanded] = useState(false);
```

Render the title as a title-only press target:

```tsx
<Pressable
  testID={`${testID}:title-pressable`}
  onPress={(event) => {
    event.stopPropagation();
    setIsTitleExpanded(true);
  }}
>
  <Text
    testID={`${testID}:title`}
    className={titleClassName ?? "text-base font-semibold text-slate-900"}
    numberOfLines={isTitleExpanded ? undefined : 2}
  >
    {title}
  </Text>
</Pressable>
```

- [ ] **Step 2: Add local expansion state to Task Detail header title**

```tsx
const [isHeaderTitleExpanded, setIsHeaderTitleExpanded] = React.useState(false);
```

Wrap the title text inside the existing `titleNode`:

```tsx
<Pressable
  testID="task-detail__header_title_pressable"
  onPress={() => setIsHeaderTitleExpanded(true)}
>
  <Text
    testID="task-detail__header_title_text"
    className="text-[28px] leading-8 font-semibold text-[#F8FCFF]"
    numberOfLines={isHeaderTitleExpanded ? undefined : 1}
    ellipsizeMode="tail"
    adjustsFontSizeToFit={!isHeaderTitleExpanded}
    minimumFontScale={isHeaderTitleExpanded ? undefined : 0.9}
  >
    {output.header.title || "Task Details"}
  </Text>
</Pressable>
```

- [ ] **Step 3: Run the focused title-expansion tests**

Run: `npm test -- --runInBand --runTestsByPath src/components/cards/__tests__/ActivityStyleRowCard.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx`

Expected: PASS

- [ ] **Step 4: Commit the title-expansion implementation**

```bash
git add src/components/cards/ActivityStyleRowCard.tsx src/screens/TaskDetailScreen.tsx src/components/cards/__tests__/ActivityStyleRowCard.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx
git commit -m "feat(task-ui): expand long task titles inline"
```

### Task 3: Lock the open photo-centric thread structure in tests

**Files:**
- Modify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- Modify: `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
- Test: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- Test: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Add the failing outer actor row test**

```tsx
it("renders actor identity outside the content area with timestamp on the right", () => {
  const screen = render(
    <TaskActivityTimeline
      thread={[
        {
          id: "activity-1",
          actorLabel: "Herman",
          eventLabel: "Ceiling grid installed",
          timestampLabel: "Jul 11, 2026 4:12 PM",
          progressLabel: "40%",
          statusLabel: "Doing",
          photoUrls: ["https://example.com/photo-1.jpg"],
          density: "standard",
          structuralState: "ready",
        },
      ]}
    />,
  );

  expect(screen.getByTestId("task-activity-timeline__outer-header-activity-1")).toBeTruthy();
  expect(screen.getByTestId("task-activity-timeline__actor-row-activity-1")).toBeTruthy();
  expect(screen.getByTestId("task-activity-timeline__timestamp-activity-1")).toBeTruthy();
});
```

- [ ] **Step 2: Add the failing right-heavy photo-layout test**

```tsx
it("uses a right-heavy open layout and swipeable gallery cues when photos exist", () => {
  const screen = render(
    <TaskActivityTimeline
      thread={[
        {
          id: "activity-1",
          actorLabel: "Herman",
          eventLabel: "Ceiling grid installed",
          timestampLabel: "Jul 11, 2026 4:12 PM",
          progressLabel: "40%",
          statusLabel: "Doing",
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

  expect(screen.getByTestId("task-activity-timeline__content_split-activity-1")).toBeTruthy();
  expect(screen.getByTestId("task-activity-timeline__photo_column-activity-1")).toBeTruthy();
  expect(screen.getByTestId("task-activity-timeline__gallery_pager-activity-1")).toBeTruthy();
  expect(screen.queryByTestId("task-activity-timeline__entry-card-activity-1")).toBeNull();
});
```

- [ ] **Step 3: Run the focused thread tests to verify they fail**

Run: `npm test -- --runInBand --runTestsByPath src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

Expected: FAIL because the current timeline still uses the older inner-card composition.

- [ ] **Step 4: Commit the red thread-layout tests**

```bash
git add src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx
git commit -m "test(task-detail): capture open photo-centric thread"
```

### Task 4: Implement the open photo-centric thread layout

**Files:**
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Test: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- Test: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Move actor identity into an outer row**

Replace the current inner-card header composition with:

```tsx
<View testID={`task-activity-timeline__outer-header-${activity.id}`} className="mb-3 flex-row items-start justify-between gap-3">
  <View testID={`task-activity-timeline__actor-row-${activity.id}`} className="min-w-0 flex-1 flex-row items-center">
    <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-slate-900">
      <Text className="text-sm font-semibold text-white">
        {activity.actorLabel.trim().slice(0, 1).toUpperCase() || "?"}
      </Text>
    </View>
    <View className="min-w-0 flex-1">
      <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
        {activity.actorLabel}
      </Text>
      <View className="mt-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
        <Text className="text-sm font-medium text-slate-500">{activity.progressLabel}</Text>
        {activity.statusLabel ? (
          <Text className="rounded-full bg-slate-200 px-2.5 py-1 text-sm font-semibold text-slate-700">
            {activity.statusLabel}
          </Text>
        ) : null}
      </View>
    </View>
  </View>
  <Text testID={`task-activity-timeline__timestamp-${activity.id}`} className="shrink text-sm font-medium text-slate-400">
    {activity.timestampLabel}
  </Text>
</View>
```

- [ ] **Step 2: Remove the shared inner wrapper and add the open content split**

Render photo-bearing entries like:

```tsx
<View testID={`task-activity-timeline__content_split-${activity.id}`} className="flex-row items-start gap-4">
  <View className="min-w-0 flex-[0.95] pt-1">
    <Text testID={`task-activity-timeline__description-${activity.id}`} className="text-base font-semibold text-slate-900">
      {activity.eventLabel}
    </Text>
    {activity.detailLabel ? (
      <Text className="mt-2 text-sm leading-6 text-slate-600">{activity.detailLabel}</Text>
    ) : null}
  </View>
  <View testID={`task-activity-timeline__photo_column-${activity.id}`} className="flex-[1.45]">
    {/* gallery image and pager */}
  </View>
</View>
```

- [ ] **Step 3: Replace static thumbnail treatment with swipeable gallery state**

Add local entry-level gallery index state:

```tsx
const [galleryIndices, setGalleryIndices] = React.useState<Record<string, number>>({});
```

Use it per entry:

```tsx
const currentPhotoIndex = galleryIndices[activity.id] ?? 0;
const currentPhotoUri = activity.photoUrls[currentPhotoIndex] ?? activity.photoUrls[0];
```

Render swipeable cues and navigation affordances:

```tsx
<Pressable
  testID={`task-activity-timeline__gallery_previous-${activity.id}`}
  onPress={() => setGalleryIndices((current) => ({
    ...current,
    [activity.id]: Math.max((current[activity.id] ?? 0) - 1, 0),
  }))}
>
  <Text>‹</Text>
</Pressable>
<View testID={`task-activity-timeline__gallery_pager-${activity.id}`} className="flex-row items-center gap-1.5">
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
<Pressable
  testID={`task-activity-timeline__gallery_next-${activity.id}`}
  onPress={() => setGalleryIndices((current) => ({
    ...current,
    [activity.id]: Math.min((current[activity.id] ?? 0) + 1, activity.photoUrls.length - 1),
  }))}
>
  <Text>›</Text>
</Pressable>
```

- [ ] **Step 4: Keep no-photo entries open and compact**

Render no-photo entries without the photo column and without an enclosing shared card:

```tsx
<View className="pt-1">
  <Text testID={`task-activity-timeline__description-${activity.id}`} className="text-base font-semibold text-slate-900">
    {activity.eventLabel}
  </Text>
  {activity.detailLabel ? (
    <Text className="mt-2 text-sm leading-6 text-slate-600">{activity.detailLabel}</Text>
  ) : null}
</View>
```

- [ ] **Step 5: Run the focused thread tests**

Run: `npm test -- --runInBand --runTestsByPath src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit the thread-layout implementation**

```bash
git add src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
git commit -m "feat(task-detail): add photo-centric open thread layout"
```

### Task 5: Validate the combined screen contract

**Files:**
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

Run: `git diff --stat -- src/components/cards/ActivityStyleRowCard.tsx src/components/cards/__tests__/ActivityStyleRowCard.test.tsx src/screens/TaskDetailScreen.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`

Expected: only the approved title-expansion and thread-layout files are touched.

- [ ] **Step 3: Commit any final validation alignment**

```bash
git add src/components/cards/__tests__/ActivityStyleRowCard.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx
git commit -m "test(task-ui): verify expanded titles and thread layout"
```
