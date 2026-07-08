# Tasks Container Card Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the existing `ContainerCard` thumbnail task presentation on `Tasks` so it keeps shared task-card plumbing while visually borrowing the cleaner formatting of the dashboard `Recent Activity` tile.

**Architecture:** Keep `TasksScreen -> mapTaskRowToContainerCardProps() -> ContainerCard` unchanged as the structural path. Limit the implementation to the thumbnail presentation branch in `ContainerCard`, only touching mapper output if the current supporting/context ordering blocks the intended hierarchy. Protect the work with focused component and screen tests before changing code.

**Tech Stack:** Expo React Native, TypeScript, React Native Testing Library, NativeWind className styling

---

## File Map

- Modify: `src/components/primitives/container/ContainerCard.tsx`
  - Reformat the existing thumbnail presentation branch to feel closer to `Recent Activity`.
- Modify: `src/ui/mappers/tasksMappers.ts`
  - Only if needed to keep title/status/context ordering aligned with the new thumbnail presentation.
- Modify: `src/components/primitives/container/__tests__/ContainerCard.test.tsx`
  - Lock the new thumbnail shell, spacing, and hierarchy expectations first.
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`
  - Confirm the `Tasks` screen still renders the task card through `ContainerCard` with the new presentation.

### Task 1: Lock The Desired Thumbnail Presentation In Tests

**Files:**
- Modify: `src/components/primitives/container/__tests__/ContainerCard.test.tsx`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`

- [ ] **Step 1: Write the failing `ContainerCard` test assertions for the lighter Recent Activity-like shell**

Add or update the thumbnail test so it expects a softer, tile-like content stack while preserving task semantics:

```tsx
it("renders the task thumbnail card with a Recent Activity-style text stack", () => {
  const { getByTestId, getByText, queryByText } = render(
    <ContainerCard contract={buildTaskCardContract()} />,
  );

  expect(getByTestId("container-card:task-1:thumbnail")).toBeTruthy();
  expect(getByTestId("container-card:task-1").props.className).toContain("overflow-hidden");
  expect(getByTestId("container-card:task-1:thumbnail").props.className).toContain("w-28");
  expect(getByTestId("container-card:task-1:content").props.className).toContain("justify-center");
  expect(getByTestId("container-card:task-1:title").props.className).toContain("text-base");
  expect(getByTestId("container-card:task-1:title").props.className).toContain("font-semibold");
  expect(getByTestId("container-card:task-1:status-line").props.className).toContain("mt-1");
  expect(getByText("Structural steel inspection — Level 12")).toBeTruthy();
  expect(getByText("Submitted for review")).toBeTruthy();
  expect(getByText("Level 12, Grid B–C")).toBeTruthy();
  expect(queryByText("REVIEW")).toBeNull();
});
```

- [ ] **Step 2: Write the failing `TasksScreen` assertion for the updated card presentation**

Adjust the existing screen-level task-card test so it checks the same new test IDs emitted by `ContainerCard`:

```tsx
it("renders the Tasks list card with the reskinned thumbnail hierarchy", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.getByTestId("container-card:task-1:thumbnail")).toBeTruthy();
  expect(screen.getByTestId("container-card:task-1:content")).toBeTruthy();
  expect(screen.getByTestId("container-card:task-1:title")).toBeTruthy();
  expect(screen.getByTestId("container-card:task-1:status-line")).toBeTruthy();
  expect(screen.getByText("Structural steel inspection — Level 12")).toBeTruthy();
  expect(screen.getByText("Submitted for review")).toBeTruthy();
  expect(screen.getByText("Level 12, Grid B–C")).toBeTruthy();
});
```

- [ ] **Step 3: Run the focused tests to verify they fail for the expected reason**

Run:

```bash
npx jest src/components/primitives/container/__tests__/ContainerCard.test.tsx src/screens/__tests__/TasksScreen.test.tsx --runInBand
```

Expected:

```text
FAIL ... Unable to find an element with testID: container-card:task-1:content
```

- [ ] **Step 4: Commit the red test checkpoint**

```bash
git add src/components/primitives/container/__tests__/ContainerCard.test.tsx src/screens/__tests__/TasksScreen.test.tsx
git commit -m "test: lock tasks thumbnail reskin expectations"
```

### Task 2: Re-Skin The Existing Thumbnail Branch In `ContainerCard`

**Files:**
- Modify: `src/components/primitives/container/ContainerCard.tsx`

- [ ] **Step 1: Implement the minimal thumbnail layout change**

Update only the `isTaskThumbnailCard` render branch so it emits the new content/test IDs and a lighter text stack. Keep the task title, status, and context semantics intact.

Replace the current right-column block with:

```tsx
<View
  testID={`${resolvedTestId}:content`}
  className="min-w-0 flex-1 justify-center px-3 py-3"
>
  <Text
    testID={`${resolvedTestId}:title`}
    className={cn("text-base font-semibold text-slate-900", density === "compact" ? "leading-5" : "leading-6")}
    numberOfLines={2}
  >
    {contract.chrome.title}
  </Text>

  <View
    testID={`${resolvedTestId}:status-line`}
    className="mt-1 flex-row items-center gap-2"
  >
    <View
      testID={`${resolvedTestId}:status-badge`}
      className={cn(
        "self-start rounded-full border px-2 py-1",
        statusToneClasses.container,
      )}
    >
      <Text className={cn("text-xs font-semibold uppercase tracking-[0.08em]", statusToneClasses.label)}>
        {statusRow?.value}
      </Text>
    </View>
  </View>

  {contextRow ? (
    <Text className="mt-1 text-sm text-slate-500" numberOfLines={2}>
      {contextRow.value}
    </Text>
  ) : null}
</View>
```

- [ ] **Step 2: Preserve the left thumbnail shell while keeping it visually prominent**

Keep the existing left-image/right-text split, but retain the full-height image shell:

```tsx
<View className="flex-row items-stretch">
  <View
    testID={`${resolvedTestId}:thumbnail`}
    className="w-28 self-stretch overflow-hidden bg-slate-100"
  >
    {thumbnailItem ? (
      <Image
        testID={`${resolvedTestId}:thumbnail-image`}
        source={{ uri: thumbnailItem.uri }}
        accessibilityLabel={thumbnailItem.accessibilityLabel}
        resizeMode="cover"
        className="h-full w-full"
      />
    ) : (
      <View
        testID={`${resolvedTestId}:thumbnail-placeholder`}
        className="h-full w-full bg-slate-100"
      />
    )}
  </View>
  {/* content block from Step 1 */}
</View>
```

- [ ] **Step 3: Run the focused tests to verify the new layout passes**

Run:

```bash
npx jest src/components/primitives/container/__tests__/ContainerCard.test.tsx src/screens/__tests__/TasksScreen.test.tsx --runInBand
```

Expected:

```text
PASS src/components/primitives/container/__tests__/ContainerCard.test.tsx
PASS src/screens/__tests__/TasksScreen.test.tsx
```

- [ ] **Step 4: Commit the thumbnail re-skin**

```bash
git add src/components/primitives/container/ContainerCard.tsx src/components/primitives/container/__tests__/ContainerCard.test.tsx src/screens/__tests__/TasksScreen.test.tsx
git commit -m "feat: reskin tasks thumbnail cards"
```

### Task 3: Adjust Mapper Output Only If Hierarchy Needs It

**Files:**
- Modify: `src/ui/mappers/tasksMappers.ts`
- Test: `src/screens/__tests__/TasksScreen.test.tsx`

- [ ] **Step 1: Inspect whether the current mapper already supplies the right hierarchy**

Confirm the current thumbnail metadata ordering still matches:

```ts
metadataRows: [
  {
    rowId: "task-card-status",
    label: "Status",
    value: data.statusLabel,
    semanticToken: data.statusToken,
  },
  ...(data.contextLine
    ? [
        {
          rowId: "task-card-context",
          label: "Context",
          value: data.contextLine,
        },
      ]
    : []),
],
```

If this already supplies the desired order, make no mapper change in this task.

- [ ] **Step 2: If needed, make the smallest mapper adjustment**

If the card needs the supporting line or a different context source to match the approved hierarchy, update only the thumbnail metadata rows. Example minimal change:

```ts
metadataRows: [
  {
    rowId: "task-card-status",
    label: "Status",
    value: data.statusLabel,
    semanticToken: data.statusToken,
  },
  ...(data.contextLine
    ? [
        {
          rowId: "task-card-context",
          label: "Context",
          value: data.contextLine,
        },
      ]
    : data.contextLabel
      ? [
          {
            rowId: "task-card-context",
            label: "Context",
            value: data.contextLabel,
          },
        ]
      : []),
],
```

- [ ] **Step 3: Re-run the `TasksScreen` test to verify task semantics still render correctly**

Run:

```bash
npx jest src/screens/__tests__/TasksScreen.test.tsx -t "renders the Tasks list card with the reskinned thumbnail hierarchy" --runInBand
```

Expected:

```text
PASS src/screens/__tests__/TasksScreen.test.tsx
```

- [ ] **Step 4: Commit the mapper adjustment only if a code change was required**

```bash
git add src/ui/mappers/tasksMappers.ts src/screens/__tests__/TasksScreen.test.tsx
git commit -m "refactor: align task card metadata hierarchy"
```

### Task 4: Run Final Verification And Capture The Slice

**Files:**
- Modify: `src/components/primitives/container/ContainerCard.tsx`
- Modify: `src/ui/mappers/tasksMappers.ts` (if changed)
- Modify: `src/components/primitives/container/__tests__/ContainerCard.test.tsx`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`

- [ ] **Step 1: Run the full targeted validation set**

Run:

```bash
npx jest src/components/primitives/container/__tests__/ContainerCard.test.tsx src/screens/__tests__/TasksScreen.test.tsx --runInBand
npx tsc --noEmit
```

Expected:

```text
PASS src/components/primitives/container/__tests__/ContainerCard.test.tsx
PASS src/screens/__tests__/TasksScreen.test.tsx
```

and:

```text
Found 0 errors.
```

- [ ] **Step 2: Manually verify the `Tasks` card presentation in-app**

Check:

```text
- left thumbnail remains visually prominent
- title is the strongest text line
- status is visible but secondary
- context is tertiary
- card still opens Task Detail
- dashboard Recent Activity remains unchanged
```

- [ ] **Step 3: Stage the final slice**

```bash
git add src/components/primitives/container/ContainerCard.tsx src/ui/mappers/tasksMappers.ts src/components/primitives/container/__tests__/ContainerCard.test.tsx src/screens/__tests__/TasksScreen.test.tsx docs/superpowers/specs/2026-07-07-tasks-container-card-reskin-design.md docs/superpowers/plans/2026-07-07-tasks-container-card-reskin-implementation.md
```

- [ ] **Step 4: Create the checkpoint commit**

```bash
git commit -m "feat: align task cards with activity styling"
```

## Self-Review

- Spec coverage: The plan covers the approved scope only: `Tasks` thumbnail presentation, preserved `ContainerCard` plumbing, no dashboard changes, no new card variant.
- Placeholder scan: No `TODO`, `TBD`, or undefined validation steps remain.
- Type consistency: The plan uses the existing `TasksScreen -> tasksMappers -> ContainerCard` path and names only fields already present in `TasksScreenRowItem` and `ContainerPrimitiveContract`.
