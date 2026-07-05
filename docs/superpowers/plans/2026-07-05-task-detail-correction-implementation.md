# Task Detail Active-Link Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine Task Detail so the hero no longer shows `Next step`, delegation lives inside the hero, and the pinned active-entry stage becomes both media-first and dynamically driven by work-thread scroll position.

**Architecture:** Reuse the current Task Detail redesign and apply a focused follow-up correction. The implementation will move delegation into the hero contract and component, remove the old hero guidance block, simplify the pinned stage so it does not repeat a large text summary, then replace the current static top-entry ownership with real scroll-driven active-entry resolution sourced from measured thread row positions.

**Tech Stack:** Expo 54, React Native, React Navigation, TypeScript, Zustand, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/ui/contracts/viewAdapters.ts`
  Add hero delegation fields and keep the active-stage/thread contracts aligned with scroll-driven ownership.

- `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
  Stop producing hero `nextStepLabel`, move delegation data into the hero model, and keep active-stage seed data available for runtime scroll ownership.

- `src/components/taskDetail/TaskDetailHero.tsx`
  Remove the `Next step` block and render delegation in its place inside the hero.

- `src/components/taskDetail/taskDetailActiveStage.ts`
  Expand the helper so it can resolve the currently focused thread entry from measured row positions plus scroll offset.

- `src/components/taskDetail/TaskDetailEvidenceStrip.tsx`
  Remove the large `Active update` text treatment and keep the pinned stage media-first across photo, no-photo, and PDF modes.

- `src/components/taskDetail/TaskActivityTimeline.tsx`
  Measure thread rows, report their positions upward, and expose a stable focus-line callback for the screen.

- `src/screens/TaskDetailScreen.tsx`
  Track scroll position, compute the active entry dynamically, feed the pinned stage from that active entry, and keep the hero scrollable above the sticky stage.

### Tests to modify or add

- `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`
- `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
- `src/components/taskDetail/__tests__/taskDetailActiveStage.test.ts`
- `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

### Docs to update after implementation

- `docs/superpowers/specs/2026-07-05-task-detail-correction-design.md`
- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`

## Task 1: Move delegation into the hero and remove `Next step`

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Modify: `src/components/taskDetail/TaskDetailHero.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
it("does not produce nextStepLabel for the task-detail hero", () => {
  const { result } = renderHook(() => useTaskDetailViewAdapter({ taskId: "task-parent" }));

  expect(result.current.output.taskHero.nextStepLabel).toBeUndefined();
});
```

```ts
it("surfaces delegation inside the task-detail hero model", () => {
  const { result } = renderHook(() => useTaskDetailViewAdapter({ taskId: "task-parent" }));

  expect(result.current.output.taskHero).toMatchObject({
    assignedByLabel: expect.any(String),
    assignedToLabel: expect.any(String),
  });
});
```

```tsx
it("renders delegation in the hero and no longer renders the Next step block", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.queryByText("Next step")).toBeNull();
  expect(screen.getByTestId("task-detail__hero_delegation")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: FAIL because the hero still exposes `nextStepLabel` and does not yet render delegation inside the hero.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/contracts/viewAdapters.ts
export interface TaskDetailHeroModel extends PrimitiveReadyItemBase {
  title: string;
  statusLabel: string;
  projectLabel: string;
  completionLabel: string;
  dueDateLabel?: string;
  nextStepLabel?: undefined;
  assignedByLabel?: string;
  assignedToLabel?: string;
  primaryOwnerLabel?: string;
  isCritical?: boolean;
  criticalLabel?: string;
}
```

```ts
// src/ui/viewAdapters/useTaskDetailViewAdapter.ts
taskHero: {
  ...existingHero,
  nextStepLabel: undefined,
  assignedByLabel: delegationSummary.assignedByLabel,
  assignedToLabel: delegationSummary.assignedToLabel,
  primaryOwnerLabel: delegationSummary.primaryOwnerLabel,
}
```

```tsx
// src/components/taskDetail/TaskDetailHero.tsx
<View testID="task-detail__hero_delegation" className="mt-5 rounded-2xl bg-white/10 px-4 py-3">
  <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-300">
    Delegation
  </Text>
  <Text className="mt-1 text-sm text-white">
    {model.assignedByLabel} → {model.assignedToLabel}
  </Text>
</View>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/components/taskDetail/TaskDetailHero.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
git commit -m "fix(ux): move delegation into task detail hero"
```

## Task 2: Make the pinned active-entry stage media-first

**Files:**
- Modify: `src/components/taskDetail/TaskDetailEvidenceStrip.tsx`
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("does not render the large Active update text block inside the pinned stage", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.queryByText("Active update")).toBeNull();
});
```

```tsx
it("keeps the pinned stage media-first in photo mode", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.getByTestId("task-detail__active_stage_photo_featured")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: FAIL because the current pinned stage still renders the `Active update` label and supporting text block.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/taskDetail/TaskDetailEvidenceStrip.tsx
return (
  <View testID={testID} className="mx-4 mt-4 rounded-3xl border border-slate-200 bg-white p-4">
    {model.stageMode === "photo" ? (
      <Image
        testID="task-detail__active_stage_photo_featured"
        source={{ uri: model.photos[model.activePhotoIndex ?? 0] }}
        resizeMode="cover"
        className="h-52 w-full rounded-[28px] bg-slate-100"
      />
    ) : null}
    {/* keep no-photo and pdf states concise, without the large Active update block */}
  </View>
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/taskDetail/TaskDetailEvidenceStrip.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
git commit -m "fix(ux): simplify task detail active stage"
```

## Task 3: Make active-entry resolution truly scroll-driven

**Files:**
- Modify: `src/components/taskDetail/taskDetailActiveStage.ts`
- Modify: `src/components/taskDetail/__tests__/taskDetailActiveStage.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("resolves the active entry from measured row positions and scroll offset", () => {
  const result = resolveActiveStageEntry({
    entries: [
      { id: "entry-1", top: 0, height: 140 },
      { id: "entry-2", top: 164, height: 140 },
    ],
    focusY: 180,
    scrollY: 40,
  });

  expect(result?.id).toBe("entry-2");
});
```

```ts
it("keeps the previous entry active until the next row crosses the focus line", () => {
  const result = resolveActiveStageEntry({
    entries: [
      { id: "entry-1", top: 0, height: 140 },
      { id: "entry-2", top: 164, height: 140 },
    ],
    focusY: 120,
    scrollY: 10,
  });

  expect(result?.id).toBe("entry-1");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/taskDetail/__tests__/taskDetailActiveStage.test.ts --runInBand`

Expected: FAIL because the helper currently only resolves by static array index rather than measured scroll geometry.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/taskDetail/taskDetailActiveStage.ts
export interface ActiveStageMeasuredEntry {
  id: string;
  top: number;
  height: number;
}

export function resolveActiveStageEntry<T extends ActiveStageMeasuredEntry>({
  entries,
  focusY,
  scrollY,
}: {
  entries: T[];
  focusY: number;
  scrollY: number;
}): T | undefined {
  const focusLine = scrollY + focusY;

  return [...entries]
    .sort((left, right) => left.top - right.top)
    .find((entry) => entry.top <= focusLine && entry.top + entry.height > focusLine)
    ?? [...entries].sort((left, right) => left.top - right.top)[0];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/taskDetail/__tests__/taskDetailActiveStage.test.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/taskDetail/taskDetailActiveStage.ts src/components/taskDetail/__tests__/taskDetailActiveStage.test.ts
git commit -m "fix(ux): resolve active task detail entry from scroll geometry"
```

## Task 4: Measure thread rows and report active entry changes upward

**Files:**
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Modify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("reports measured thread rows for active-entry resolution", () => {
  const onVisibleEntryChange = jest.fn();
  const screen = render(
    <TaskActivityTimeline
      thread={threadRows}
      onVisibleEntryChange={onVisibleEntryChange}
      activeEntryId="entry-1"
    />,
  );

  expect(screen.getByTestId("task-activity-timeline__entry-entry-1")).toBeTruthy();
});
```

```tsx
it("marks the active row selected when activeEntryId changes", () => {
  const screen = render(
    <TaskActivityTimeline thread={threadRows} activeEntryId="entry-2" />,
  );

  expect(screen.getByTestId("task-activity-timeline__entry-entry-2").props.accessibilityState)
    .toEqual(expect.objectContaining({ selected: true }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand`

Expected: FAIL once the test expects row measurement/reporting hooks that are not yet present.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/taskDetail/TaskActivityTimeline.tsx
interface TaskActivityTimelineProps {
  ...
  onEntryLayout?: (entryId: string, top: number, height: number) => void;
}

<View
  key={activity.id}
  testID={`task-activity-timeline__entry-${activity.id}`}
  onLayout={(event) => {
    const { y, height } = event.nativeEvent.layout;
    onEntryLayout?.(activity.id, y, height);
  }}
  accessibilityState={{ selected: isActiveEntry }}
  className="flex-row"
>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx
git commit -m "fix(ux): report task thread row layout for active stage"
```

## Task 5: Wire scroll position to the pinned active-entry stage

**Files:**
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("keeps the hero scrollable while the active-entry stage remains sticky at index 1", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);
  const scrollView = screen.getByTestId("task-detail__workthread_scroll");

  expect(scrollView.props.stickyHeaderIndices).toEqual([1]);
  expect(screen.getByTestId("task-detail__hero")).toBeTruthy();
});
```

```tsx
it("feeds the pinned stage from the currently active thread entry", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.getByTestId("task-detail__active_entry_stage")).toBeTruthy();
  expect(screen.getByTestId("task-detail__activity_thread")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand`

Expected: FAIL because the screen still derives active entry from static top row ownership rather than measured scroll position.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/screens/TaskDetailScreen.tsx
const [scrollY, setScrollY] = React.useState(0);
const [entryLayouts, setEntryLayouts] = React.useState<Record<string, { top: number; height: number }>>({});

const resolvedActiveEntryId = resolveActiveStageEntry({
  entries: Object.entries(entryLayouts).map(([id, layout]) => ({ id, ...layout })),
  focusY: 24,
  scrollY,
})?.id ?? initialActiveEntryId;

<ScrollView
  testID="task-detail__workthread_scroll"
  stickyHeaderIndices={[1]}
  onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
  scrollEventThrottle={16}
>
```

```tsx
<TaskActivityTimeline
  testID="task-detail__activity_thread"
  thread={output.activityThread}
  activeEntryId={resolvedActiveEntryId}
  onEntryLayout={(entryId, top, height) => {
    setEntryLayouts((current) => ({ ...current, [entryId]: { top, height } }));
  }}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/TaskDetailScreen.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx
git commit -m "fix(ux): drive task detail active stage from thread scroll"
```

## Task 6: Validate, relaunch, document, and close the follow-up correction

**Files:**
- Modify: `docs/superpowers/specs/2026-07-05-task-detail-correction-design.md`
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-05-task-detail-correction-implementation.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/components/taskDetail/__tests__/taskDetailActiveStage.test.ts src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Relaunch the app for visual verification**

Run: `pkill -f "expo start --dev-client" || true && env -u CI npx expo start --dev-client --clear`

Expected: Metro restarts on a fresh bundle.

Run: `xcrun simctl terminate booted com.buildtrack.app.local || true && xcrun simctl launch booted com.buildtrack.app.local`

Expected: app relaunch succeeds on the booted simulator.

- [ ] **Step 3: Update the execution notes**

```md
- removed the hero `Next step` block entirely
- moved delegation into the hero in that space
- removed the large `Active update` text treatment from the pinned stage
- made the pinned active-entry stage change dynamically with thread scroll position
- preserved photo / no-photo / PDF stage modes while strengthening stage-thread linkage
```

- [ ] **Step 4: Create the checkpoint commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/components/taskDetail/TaskDetailHero.tsx src/components/taskDetail/TaskDetailEvidenceStrip.tsx src/components/taskDetail/taskDetailActiveStage.ts src/components/taskDetail/TaskActivityTimeline.tsx src/screens/TaskDetailScreen.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/components/taskDetail/__tests__/taskDetailActiveStage.test.ts src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx docs/superpowers/specs/2026-07-05-task-detail-correction-design.md docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-05-task-detail-correction-implementation.md
git commit -m "fix(ux): link task detail stage to thread scroll"
```

## Spec Coverage Check

- remove hero `Next step`: Task 1
- move delegation into hero: Task 1
- keep hero compact + critical metadata: Task 1
- remove the large active-stage text treatment: Task 2
- dynamic active-entry stage ownership from thread scroll: Tasks 3, 4, and 5
- preserve newest-first thread: Tasks 4 and 5
- preserve photo / no-photo / PDF stage modes: Tasks 2 and 5
- keep no primary footer CTA + inline actions: Task 5 regression coverage and Task 6 validation

## Placeholder Scan

- No `TBD` / `TODO`
- No “similar to Task N” shortcuts
- All file paths are explicit
- Each code-changing step includes concrete code
- Each verification step includes exact commands and expected outcomes

## Type Consistency Check

- `TaskDetailHeroModel` carries delegation fields used by `TaskDetailHero`
- `resolveActiveStageEntry` accepts measured `top`/`height` geometry used by `TaskDetailScreen`
- `TaskActivityTimeline` reports row layout through `onEntryLayout`
- `TaskDetailScreen` consumes `activeEntryId` and row geometry from the same helper types
