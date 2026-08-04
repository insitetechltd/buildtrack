# Task Detail Inline Square Photo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make inline work-thread photos on the Task Detail screen render in a square `cover` frame while preserving the full-screen modal viewer's original-aspect `contain` behavior.

**Architecture:** Keep the change local to `TaskActivityTimeline`. Replace the inline lead-photo shell's dynamic aspect-ratio sizing with a fixed square frame, update inline images to `cover`, and leave modal viewer logic untouched. Remove the unused inline aspect-ratio measurement path if it becomes dead code after the square-frame change.

**Tech Stack:** Expo React Native, TypeScript, React Native `Image`/`ScrollView`, Jest, React Native Testing Library

---

## File Structure

- **Modify:** `src/components/taskDetail/TaskActivityTimeline.tsx`
  - Owns the inline work-thread photo shell, swipeable gallery, and modal photo viewer.
- **Modify:** `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
  - Locks the inline square-shell contract and ensures the modal viewer remains original-aspect.
- **Verify only:** `src/components/taskDetail/TaskDetailEvidenceStrip.tsx`
  - Confirmed out of scope and should remain unchanged.

### Task 1: Lock The New Inline Photo Contract In Tests

**Files:**
- Modify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- Verify against: `src/components/taskDetail/TaskActivityTimeline.tsx`

- [ ] **Step 1: Replace the old aspect-ratio/contain expectation with a square-shell/cover expectation**

```tsx
it("shows the lead photo below the headline in a square shell with cover fit while keeping the modal viewer unchanged", async () => {
  const screen = render(
    <TaskActivityTimeline
      thread={[
        {
          id: "activity-2",
          actorLabel: "Tristan",
          eventLabel: "Marked 40% complete",
          timestampLabel: "Jul 5, 09:30",
          progressLabel: "40%",
          detailLabel: "Ceiling grid installed.",
          photoUrls: [
            "https://example.com/photo-1.jpg",
            "https://example.com/photo-2.jpg",
          ],
          photoAspectRatio: 0.75,
          subtaskBadgeLabel: "Subtask",
          subtaskTitleLabel: "Install ceiling grid",
          density: "standard",
          structuralState: "ready",
        },
      ]}
    />,
  );

  expect(screen.getByText("Subtask")).toBeTruthy();
  expect(screen.getByText("Install ceiling grid")).toBeTruthy();
  expect(screen.getByTestId("task-activity-timeline__lead-photo-activity-2").props.resizeMode).toBe(
    "cover",
  );
  expect(screen.getByTestId("task-activity-timeline__lead-photo-shell-activity-2").props.className).toContain(
    "rounded-3xl",
  );

  await waitFor(() => {
    expect(screen.getByTestId("task-activity-timeline__lead-photo-shell-activity-2").props.style).toMatchObject({
      aspectRatio: 1,
    });
  });
});
```

- [ ] **Step 2: Add an explicit modal-viewer assertion so the full-screen behavior stays `contain`**

```tsx
fireEvent.press(screen.getByTestId("task-activity-timeline__lead-photo-pressable-activity-2"));

expect(screen.getByTestId("task-activity-timeline__photo_viewer_image").props.resizeMode).toBe(
  "contain",
);
```

- [ ] **Step 3: Run the focused timeline test file to verify the new expectation fails for the right reason**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx
```

Expected:

```text
FAIL because the inline lead photo still uses resizeMode "contain" and/or the lead photo shell still resolves to a non-square aspect ratio
```

- [ ] **Step 4: Commit the red test state only if you are working in an isolated throwaway branch**

```bash
git add src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx
git commit -m "test(task-detail): lock square inline photo contract"
```

### Task 2: Implement The Square Inline Photo Shell

**Files:**
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Test: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`

- [ ] **Step 1: Remove the now-obsolete dynamic inline aspect-ratio helpers and state if they are no longer used**

Delete this code path if nothing references it after the square-frame change:

```tsx
const DEFAULT_LEAD_PHOTO_ASPECT_RATIO = 4 / 3;

function resolveLeadPhotoAspectRatio(
  activity: TaskDetailActivityThreadRow,
  photoAspectRatios: Record<string, number>,
): number {
  ...
}

const [leadPhotoAspectRatios, setLeadPhotoAspectRatios] = React.useState<Record<string, number>>({});

useEffect(() => {
  ...
  Image.getSize(...)
  ...
}, [normalizedActivities]);
```

- [ ] **Step 2: Keep container width tracking for horizontal paging, but make the inline photo shell square**

Replace the shell style with a fixed square:

```tsx
<View
  testID={`task-activity-timeline__lead-photo-shell-${activity.id}`}
  className="mt-3 overflow-hidden rounded-3xl bg-slate-200"
  style={{ aspectRatio: 1 }}
  onLayout={(event) => {
    const width = event.nativeEvent.layout.width;
    if (width && width !== containerWidths[activity.id]) {
      setContainerWidths((current) => ({
        ...current,
        [activity.id]: width,
      }));
    }
  }}
>
```

- [ ] **Step 3: Change the inline gallery image fit from `contain` to `cover`**

```tsx
<Image
  testID={
    photoIndex === currentPhotoIndex
      ? `task-activity-timeline__lead-photo-${activity.id}`
      : undefined
  }
  accessibilityLabel={`Lead photo for ${activity.eventLabel}`}
  source={{ uri: photoUri }}
  resizeMode="cover"
  className="h-full w-full bg-slate-200"
/>
```

- [ ] **Step 4: Leave the full-screen modal viewer untouched**

Do not change this code:

```tsx
<Image
  testID={
    index === selectedGallery.index
      ? "task-activity-timeline__photo_viewer_image"
      : undefined
  }
  source={{ uri: photoUri }}
  resizeMode="contain"
  className="h-full w-full"
/>
```

- [ ] **Step 5: Run the focused timeline test file again and verify it passes**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx
```

Expected:

```text
PASS src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx
```

- [ ] **Step 6: Commit the implementation**

```bash
git add src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx
git commit -m "fix(task-detail): square inline thread photo previews"
```

### Task 3: Verify Scope Boundaries And Regression Safety

**Files:**
- Verify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Verify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- Verify only: `src/components/taskDetail/TaskDetailEvidenceStrip.tsx`

- [ ] **Step 1: Confirm the evidence strip file remains untouched**

Run:

```bash
git diff -- src/components/taskDetail/TaskDetailEvidenceStrip.tsx
```

Expected:

```text
No output
```

- [ ] **Step 2: Run the focused task-detail acceptance suite that exercises the work-thread photo flow**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
```

Expected:

```text
PASS src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
```

- [ ] **Step 3: Check patch hygiene**

Run:

```bash
git diff --check
```

Expected:

```text
No output
```

- [ ] **Step 4: Create the final commit if Task 2 was not committed yet**

```bash
git add src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx
git commit -m "fix(task-detail): square inline thread photo previews"
```
