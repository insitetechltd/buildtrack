# Task Detail Thread Photo Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the Task Detail work-thread so photo-only updates describe the actual action performed, the thread card drops the secondary detail line, and lead photos size by aspect ratio instead of a fixed short frame.

**Architecture:** Keep the current Task Detail shell and metadata rail, but tighten the thread-row content contract. The adapter should distinguish between progress changes, photo-only updates, and generic fallback activities, while the timeline renderer should stop showing `detailLabel` and compute a photo container that preserves full-width presentation without the boxed fixed-height look.

**Tech Stack:** Expo 54, React Native, TypeScript, Zustand, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/ui/contracts/viewAdapters.ts`
  Remove the thread-card dependency on `detailLabel` and add any minimal field needed for aspect-ratio-aware lead-photo rendering.

- `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
  Build photo-update-aware headlines and suppress unchanged-progress fallback copy for photo-only updates.

- `src/components/taskDetail/TaskActivityTimeline.tsx`
  Stop rendering the secondary detail line and replace fixed-height lead photos with aspect-ratio-driven sizing.

### Tests to modify

- `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`
- `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

### Docs to update after implementation

- `docs/superpowers/specs/2026-07-05-task-detail-correction-design.md`
- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- `docs/superpowers/plans/2026-07-06-task-detail-thread-photo-correction-implementation.md`

## Task 1: Correct thread headlines for photo-only updates

**Files:**
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Modify: `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("uses a photo-update headline instead of unchanged progress copy for legacy photo updates", () => {
  const { result } = renderHook(() =>
    useTaskDetailViewAdapter({ taskId: "task-parent" }),
  );

  expect(result.current.output.activityThread[0]?.eventLabel).toBe("Added photo update");
});
```

```ts
it("keeps progress headlines only when the update actually represents a progress change", () => {
  const { result } = renderHook(() =>
    useTaskDetailViewAdapter({ taskId: "task-parent-progress-change" }),
  );

  expect(result.current.output.activityThread[0]?.eventLabel).toBe("Updated progress to 40%");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`

Expected: FAIL because the current fallback still renders `Updated progress to 0%` for legacy photo updates.

- [ ] **Step 3: Write minimal implementation**

```ts
function isMeaningfulProgressChange(activity: TaskActivity): boolean {
  const nextProgress = activity.completionPercentage;
  const previousProgress = (activity.data as { previousPercentage?: number } | undefined)?.previousPercentage;

  if (typeof nextProgress !== "number") {
    return false;
  }

  if (typeof previousProgress === "number") {
    return previousProgress !== nextProgress;
  }

  return nextProgress > 0;
}

function buildTaskDetailEventLabel(activity: TaskActivity): string {
  const photoCount = collectActivityPhotoUrls(activity).length;

  if (photoCount > 0 && activity.activityType === "progress_update" && !isMeaningfulProgressChange(activity)) {
    return photoCount > 1 ? `Added ${photoCount} photos` : "Added photo update";
  }

  switch (activity.activityType) {
    case "progress_update":
      return activity.completionPercentage !== undefined
        ? `Updated progress to ${activity.completionPercentage}%`
        : "Updated progress";
    // keep the remaining existing cases unchanged
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts
git commit -m "fix(task-detail): correct photo update headlines"
```

## Task 2: Remove the thread detail line and render lead photos by aspect ratio

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Modify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("does not render a detail subline beneath the thread headline", () => {
  const screen = render(
    <TaskActivityTimeline
      thread={[
        {
          id: "activity-1",
          actorLabel: "Tristan",
          eventLabel: "Added photo update",
          timestampLabel: "Jul 6, 09:57 PM",
          progressLabel: "0%",
          detailLabel: "Reason: this should not render",
          photoUrls: [],
          density: "standard",
          structuralState: "ready",
        },
      ]}
    />,
  );

  expect(screen.queryByTestId("task-activity-timeline__detail-label")).toBeNull();
});
```

```tsx
it("renders portrait lead photos with an aspect-ratio shell instead of a fixed height class", () => {
  const screen = render(
    <TaskActivityTimeline
      thread={[
        {
          id: "activity-2",
          actorLabel: "Tristan",
          eventLabel: "Added photo update",
          timestampLabel: "Jul 6, 09:57 PM",
          progressLabel: "0%",
          photoUrls: ["https://example.com/portrait.jpg"],
          photoAspectRatio: 0.75,
          density: "standard",
          structuralState: "ready",
        },
      ]}
    />,
  );

  expect(screen.getByTestId("task-activity-timeline__lead-photo-shell-activity-2").props.style).toMatchObject({
    aspectRatio: 0.75,
  });
  expect(screen.getByTestId("task-activity-timeline__lead-photo-activity-2").props.className).not.toContain("h-44");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand`

Expected: FAIL because the timeline still renders `detailLabel` and the lead photo still uses a fixed-height frame.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/contracts/viewAdapters.ts
export interface TaskDetailActivityThreadRow extends PrimitiveReadyItemBase {
  id: string;
  actorLabel: string;
  eventLabel: string;
  timestampLabel: string;
  progressLabel: string;
  photoUrls: string[];
  photoAspectRatio?: number;
  statusLabel?: string;
  subtaskBadgeLabel?: string;
  subtaskTitleLabel?: string;
}
```

```tsx
// src/components/taskDetail/TaskActivityTimeline.tsx
function resolvePhotoAspectRatio(activity: TaskDetailActivityThreadRow) {
  if (typeof activity.photoAspectRatio === "number" && activity.photoAspectRatio > 0) {
    return activity.photoAspectRatio;
  }

  return 1;
}

<View
  testID={`task-activity-timeline__lead-photo-shell-${activity.id}`}
  className="-mx-4 mb-3 overflow-hidden bg-slate-200"
  style={{ aspectRatio: resolvePhotoAspectRatio(activity) }}
>
  <Pressable
    testID={`task-activity-timeline__lead-photo-pressable-${activity.id}`}
    accessibilityRole="button"
    onPress={() => openGallery(activity.photoUrls, 0)}
    className="h-full w-full"
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
```

```tsx
// remove the detail-label block entirely
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx
git commit -m "fix(task-detail): remove thread subcopy and fix photo sizing"
```

## Task 3: Validate the correction and document the new verification rule

**Files:**
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-06-task-detail-thread-photo-correction-implementation.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Update the execution ledger**

```md
- removed the thread detail subline entirely
- corrected legacy photo-only updates so they no longer render unchanged progress copy
- replaced fixed-height lead photo rendering with aspect-ratio-driven layout for full-width portrait handling
- future screenshot-based verification must first confirm navigation to the exact target screen before capture
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-06-task-detail-thread-photo-correction-implementation.md
git commit -m "docs(task-detail): record thread photo correction pass"
```

## Spec Coverage Check

- no thread `detailLabel` line: Task 2
- photo-only updates avoid unchanged progress copy: Task 1
- aspect-ratio-based lead-photo rendering: Task 2
- future exact-screen verification rule recorded: Task 3

## Placeholder Scan

- No `TBD` / `TODO`
- No “similar to Task N” shortcuts
- All file paths are explicit
- Each code-changing step includes concrete code
- Each verification step includes exact commands and expected outcomes

## Type Consistency Check

- `photoAspectRatio` is introduced in the thread-row contract and consumed only in the timeline renderer
- `eventLabel` remains the primary thread headline field
- `detailLabel` is no longer part of the thread-card rendering path
