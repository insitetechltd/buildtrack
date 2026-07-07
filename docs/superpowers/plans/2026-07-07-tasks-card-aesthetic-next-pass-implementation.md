# Tasks Card Aesthetic Next Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the `Tasks` thumbnail card to feel closer to `Recent Activity` while preserving thumbnail-card plumbing, tap behavior, placeholder behavior, and search-result provenance.

**Architecture:** Keep `useTasksViewAdapter()` responsible for row-level content decisions and keep `ContainerCard` responsible for the thumbnail-card shell, spacing, and hierarchy. Implement the change as a focused visual refinement of the task-thumbnail branch inside `ContainerCard`, backed by a tighter component test and the already-added adapter regression for search provenance.

**Tech Stack:** React Native, TypeScript, NativeWind className styling, Jest, Testing Library

---

## File Map

- Modify: `src/components/primitives/container/ContainerCard.tsx`
  Owns the task-thumbnail card shell, thumbnail column, status row, and supporting text hierarchy.
- Modify: `src/components/primitives/container/__tests__/ContainerCard.test.tsx`
  Guards the intended shell softness, title hierarchy, calmer metadata rhythm, and placeholder stability.
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
  Preserves search-result provenance in `contextLine` for thumbnail cards.
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
  Locks the search-result provenance path so search thumbnails stay distinguishable.

## Task 1: Lock The Approved Visual Contract In Tests

**Files:**
- Modify: `src/components/primitives/container/__tests__/ContainerCard.test.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`

- [ ] **Step 1: Extend the failing thumbnail-card test to reflect the approved next-pass shell**

```tsx
it("renders the task thumbnail card with a softer Recent Activity-style shell", () => {
  const { getByTestId, getByText } = render(
    <ContainerCard contract={buildTaskCardContract()} />,
  );

  expect(getByTestId("container-card:task-1").props.className).toContain("rounded-3xl");
  expect(getByTestId("container-card:task-1").props.className).toContain("border-slate-200");
  expect(getByTestId("container-card:task-1").props.className).toContain("shadow-sm");
  expect(getByTestId("container-card:task-1:content").props.className).toContain("px-4");
  expect(getByTestId("container-card:task-1:title").props.className).toContain("text-[17px]");
  expect(getByTestId("container-card:task-1:status-line").props.className).toContain("mt-2");
  expect(getByText("Structural steel inspection — Level 12")).toBeTruthy();
  expect(getByText("Level 12, Grid B–C")).toBeTruthy();
});
```

- [ ] **Step 2: Keep the adapter regression for search provenance explicit**

```tsx
expect(result.current.output.searchResults[0].contextLine).toBe("My Queue · New · Project A");
expect(result.current.output.searchResults[1].contextLine).toBe("Team Queue · Review · Project A");
```

- [ ] **Step 3: Run the focused tests to verify the new shell assertions fail for the expected reason**

Run: `npx jest src/components/primitives/container/__tests__/ContainerCard.test.tsx src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts --runInBand`

Expected: `ContainerCard.test.tsx` fails because the thumbnail-card shell still uses the older `h-28 overflow-hidden border bg-white` styling and tighter spacing; the adapter test stays green.

- [ ] **Step 4: Commit the red-state test update only if you need a checkpoint**

```bash
git add src/components/primitives/container/__tests__/ContainerCard.test.tsx src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts
git commit -m "test(tasks): lock next-pass thumbnail card styling"
```

## Task 2: Implement The Next-Pass Thumbnail Card Shell

**Files:**
- Modify: `src/components/primitives/container/ContainerCard.tsx`

- [ ] **Step 1: Update the task-thumbnail branch with the softer shell and calmer metadata rhythm**

```tsx
className={cn(
  "min-h-32 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm",
  stateClasses.shell,
  marginClass,
  className,
)}
```

```tsx
<View
  testID={`${resolvedTestId}:content`}
  className="min-w-0 flex-1 justify-center px-4 py-4"
>
  <Text
    testID={`${resolvedTestId}:title`}
    className={cn(
      "pr-1 text-[17px] font-semibold tracking-[-0.01em] text-slate-900",
      contract.density === "compact" ? "leading-[22px]" : "leading-6",
    )}
    numberOfLines={2}
  >
    {contract.chrome.title}
  </Text>
```

- [ ] **Step 2: Soften the status row so it supports the title instead of competing with it**

```tsx
<View
  testID={`${resolvedTestId}:status-line`}
  className="mt-2 flex-row items-center gap-2"
>
  <View
    testID={`${resolvedTestId}:status-badge`}
    className={cn(
      "self-start rounded-full border px-2.5 py-1",
      statusBadgeDensityClasses.container,
      statusToneClasses.container,
    )}
  >
```

```tsx
<Text
  className={cn(
    statusBadgeDensityClasses.label,
    "uppercase tracking-[0.06em]",
    statusToneClasses.label,
  )}
  numberOfLines={1}
>
  {statusRow?.value ?? contract.chrome.subtitle}
</Text>
```

- [ ] **Step 3: Keep the supporting line readable but quieter**

```tsx
{contextRow?.value ? (
  <Text
    testID={`${resolvedTestId}:context-line`}
    className="mt-2 text-[13px] leading-[18px] text-slate-500"
    numberOfLines={2}
  >
    {contextRow.value}
  </Text>
) : null}
```

- [ ] **Step 4: Preserve the thumbnail column and placeholder layout while softening the frame**

```tsx
<View
  testID={`${resolvedTestId}:thumbnail`}
  className="w-30 self-stretch overflow-hidden bg-slate-100"
>
```

```tsx
<View
  testID={`${resolvedTestId}:thumbnail-placeholder`}
  className="h-full w-full bg-slate-100"
/>
```

- [ ] **Step 5: Run the focused tests to verify the shell is green**

Run: `npx jest src/components/primitives/container/__tests__/ContainerCard.test.tsx src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts --runInBand`

Expected: PASS

- [ ] **Step 6: Commit the implementation checkpoint**

```bash
git add src/components/primitives/container/ContainerCard.tsx src/components/primitives/container/__tests__/ContainerCard.test.tsx src/ui/viewAdapters/useTasksViewAdapter.ts src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts
git commit -m "feat(tasks): refine thumbnail card aesthetic"
```

## Task 3: Run Slice Validation And Visual QA

**Files:**
- Modify: none

- [ ] **Step 1: Run typecheck after the component change**

Run: `npx tsc --noEmit`

Expected: PASS with no output

- [ ] **Step 2: Restart or refresh Metro if the simulator is stale**

Run: `env -u CI npx expo start --dev-client --clear`

Expected: Metro starts cleanly from the worktree and serves the updated bundle.

- [ ] **Step 3: Relaunch the app on the booted simulator**

Run: `xcrun simctl launch booted com.buildtrack.app.local`

Expected: The dev build opens successfully.

- [ ] **Step 4: Verify the live `Tasks` tab against the approved aesthetic**

Check:
- queue cards show the softer shell and calmer metadata rhythm
- search mode still shows provenance lines such as `My Queue · New · Project A`
- no-photo cards still show a stable placeholder block
- tapping a card still opens task detail

- [ ] **Step 5: Capture the final validation status in git**

```bash
git status -sb
```

Expected: clean working tree after the commit, or only known local browser-preview artifacts excluded from commit scope.

## Task 4: Push And Handoff

**Files:**
- Modify: none

- [ ] **Step 1: Push the slice branch**

Run: `git push -u origin feat/s-ux-01i-tasks-card-reskin`

Expected: remote branch updates successfully

- [ ] **Step 2: Summarize what was verified and what remains manual**

```md
- Verified focused thumbnail-card Jest coverage
- Verified adapter provenance regression coverage
- Verified TypeScript
- Verified live Tasks-tab visual pass
- Remaining gap: broader multi-device polish only if explicitly requested
```

- [ ] **Step 3: If the user wants review before merge, request it with the exact changed files**

```md
Please review:
- `src/components/primitives/container/ContainerCard.tsx`
- `src/components/primitives/container/__tests__/ContainerCard.test.tsx`
- `src/ui/viewAdapters/useTasksViewAdapter.ts`
- `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
```
