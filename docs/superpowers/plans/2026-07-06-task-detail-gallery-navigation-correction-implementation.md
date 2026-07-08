# Task Detail Gallery Navigation Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore reliable multi-photo behavior in Task Detail work-thread entries by moving thumbnails outside the clipped lead-photo shell, preserving per-entry gallery navigation, and exposing the current photo index in full-screen mode.

**Architecture:** Keep the current Task Detail thread card and full-screen gallery model, but separate the primary-image shell from the thumbnail strip so clipping only affects the lead photo. Reuse the existing `selectedGallery` state for navigation, add a visible index indicator, and cover both thumbnail visibility and next/previous navigation with focused tests.

**Tech Stack:** Expo 54, React Native, TypeScript, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/components/taskDetail/TaskActivityTimeline.tsx`
  Move the thumbnail strip outside the lead-photo shell, keep the lead-photo shell responsible only for the primary image, and add a visible gallery index to the full-screen viewer.

### Tests to modify

- `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

### Docs to update after implementation

- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- `docs/superpowers/plans/2026-07-06-task-detail-gallery-navigation-correction-implementation.md`

## Task 1: Keep thumbnails visible outside the lead-photo shell

**Files:**
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Modify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("renders the thumbnail strip outside the clipped lead-photo shell", () => {
  const screen = render(
    <TaskActivityTimeline
      thread={[
        {
          id: "activity-2",
          actorLabel: "Tristan",
          eventLabel: "Added 2 photos",
          timestampLabel: "Jul 5, 09:30",
          progressLabel: "40%",
          photoUrls: [
            "https://example.com/photo-1.jpg",
            "https://example.com/photo-2.jpg",
          ],
          photoAspectRatio: 0.75,
          density: "standard",
          structuralState: "ready",
        },
      ]}
    />,
  );

  const leadPhotoShell = screen.getByTestId("task-activity-timeline__lead-photo-shell-activity-2");
  const thumbnailStrip = screen.getByTestId("task-activity-timeline__thumbnail-strip-activity-2");

  expect(leadPhotoShell.props.className).toContain("overflow-hidden");
  expect(thumbnailStrip.parent?.props.testID).not.toBe("task-activity-timeline__lead-photo-shell-activity-2");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand`

Expected: FAIL because the thumbnail strip is still rendered inside the lead-photo shell.

- [ ] **Step 3: Write minimal implementation**

```tsx
<View
  testID={`task-activity-timeline__lead-photo-shell-${activity.id}`}
  className="-mx-4 overflow-hidden bg-slate-200"
  style={{
    aspectRatio: resolveLeadPhotoAspectRatio(activity, leadPhotoAspectRatios),
  }}
>
  <Pressable
    testID={`task-activity-timeline__lead-photo-pressable-${activity.id}`}
    accessibilityRole="button"
    className="h-full w-full"
    onPress={() => openGallery(activity.photoUrls, 0)}
  >
    <Image
      testID={`task-activity-timeline__lead-photo-${activity.id}`}
      accessibilityLabel={`Lead photo for ${activity.eventLabel}`}
      source={{ uri: activity.photoUrls[0] }}
      resizeMode="contain"
      className="h-full w-full bg-slate-200"
    />
  </Pressable>
</View>

{activity.photoUrls.length > 1 ? (
  <View
    testID={`task-activity-timeline__thumbnail-strip-${activity.id}`}
    className="mt-2 flex-row flex-wrap gap-2"
  >
    {activity.photoUrls.slice(1).map((photoUri, photoIndex) => (
      <Pressable
        key={`${activity.id}-thumb-${photoIndex + 1}`}
        testID={`task-activity-timeline__thumb-photo-pressable-${activity.id}-${photoIndex + 1}`}
        accessibilityRole="button"
        onPress={() => openGallery(activity.photoUrls, photoIndex + 1)}
      >
        <Image
          testID={`task-activity-timeline__thumb-photo-${activity.id}-${photoIndex + 1}`}
          accessibilityLabel={`Thumbnail photo ${photoIndex + 2} for ${activity.eventLabel}`}
          source={{ uri: photoUri }}
          resizeMode="cover"
          className="h-14 w-14 rounded-2xl bg-slate-200"
        />
      </Pressable>
    ))}
  </View>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx
git commit -m "fix(task-detail): restore visible thread thumbnails"
```

## Task 2: Make multi-photo full-screen navigation explicit and testable

**Files:**
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Modify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("shows the current gallery index in full-screen mode and advances to the next photo", () => {
  const screen = render(
    <TaskActivityTimeline
      thread={[
        {
          id: "activity-2",
          actorLabel: "Tristan",
          eventLabel: "Added 2 photos",
          timestampLabel: "Jul 5, 09:30",
          progressLabel: "40%",
          photoUrls: [
            "https://example.com/photo-1.jpg",
            "https://example.com/photo-2.jpg",
          ],
          density: "standard",
          structuralState: "ready",
        },
      ]}
    />,
  );

  fireEvent.press(screen.getByTestId("task-activity-timeline__lead-photo-pressable-activity-2"));

  expect(screen.getByTestId("task-activity-timeline__photo_viewer_index")).toHaveTextContent("1 / 2");

  fireEvent.press(screen.getByTestId("task-activity-timeline__photo_viewer_next"));

  expect(screen.getByTestId("task-activity-timeline__photo_viewer_image").props.source).toEqual({
    uri: "https://example.com/photo-2.jpg",
  });
  expect(screen.getByTestId("task-activity-timeline__photo_viewer_index")).toHaveTextContent("2 / 2");
});
```

```tsx
it("keeps thumbnail access visible on the accepted Task Detail surface when multiple photos exist", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.getByTestId("task-activity-timeline__thumbnail-strip-activity-1")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: FAIL because the full-screen viewer does not yet expose the gallery index and the acceptance test does not yet guarantee thumbnail visibility for multi-photo entries.

- [ ] **Step 3: Write minimal implementation**

```tsx
{selectedGallery && selectedGallery.photos.length > 1 ? (
  <View
    testID="task-activity-timeline__photo_viewer_index"
    className="absolute top-12 left-6 z-10 rounded-full bg-white/10 px-3 py-2"
  >
    <Text className="text-sm font-semibold text-white">
      {selectedGallery.index + 1} / {selectedGallery.photos.length}
    </Text>
  </View>
) : null}
```

```tsx
{selectedGallery.index < selectedGallery.photos.length - 1 ? (
  <Pressable
    testID="task-activity-timeline__photo_viewer_next"
    accessibilityRole="button"
    className="absolute right-4 z-10 rounded-full bg-white/15 px-4 py-3"
    onPress={showNextPhoto}
  >
    <Text className="text-sm font-semibold text-white">Next</Text>
  </Pressable>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
git commit -m "fix(task-detail): restore gallery navigation cues"
```

## Task 3: Validate and record the correction

**Files:**
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-06-task-detail-gallery-navigation-correction-implementation.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Update the execution ledger**

```md
- moved the thumbnail strip outside the clipped lead-photo shell so multi-photo entries remain visible
- kept full-screen gallery navigation within the same thread entry and added a visible gallery index
- revalidated thumbnail visibility and next/previous navigation in focused Task Detail tests
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-06-task-detail-gallery-navigation-correction-implementation.md
git commit -m "docs(task-detail): record gallery navigation correction"
```

## Spec Coverage Check

- thumbnail strip stays visible outside the clipped lead-photo shell: Task 1
- multi-photo next/previous behavior remains within the same thread entry: Task 2
- full-screen gallery index is visible for multi-photo entries: Task 2
- execution notes reflect the correction: Task 3

## Placeholder Scan

- No `TBD` / `TODO`
- No “similar to Task N” shortcuts
- All file paths are explicit
- Each code-changing step includes concrete code
- Each verification step includes exact commands and expected outcomes

## Type Consistency Check

- `selectedGallery.photos` remains the single source of truth for modal navigation
- thumbnail presses still open the same per-entry photo array with the correct index offset
- the thumbnail strip is now a sibling of the lead-photo shell rather than a child of it
