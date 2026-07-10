# Task Detail Option C Header And Details Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Task Detail hero, move its badges into the header, and replace the old info/delegation treatment with one compact `Task Details` card using Option C metadata chips.

**Architecture:** Keep the shared `ModernScreenHeader` shell and inject a custom `titleNode` for the Task Detail header so the title and badge row stay inside the existing header contract. Recompose `TaskDetailScreen` to remove `TaskDetailHero`, retitle the info card to `Task Details`, and render compact `Site` / `By` / `To` / `Owner` chips from existing adapter data with minimal adapter churn.

**Tech Stack:** Expo React Native, TypeScript, React Native Testing Library, Jest, NativeWind utility classes

---

### Task 1: Lock the new Task Detail contract in tests

**Files:**
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- Test: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- Test: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

- [ ] **Step 1: Write the failing acceptance test for hero removal and Task Details chips**

```tsx
it("removes the hero and renders Task Details with compact metadata chips", () => {
  const screen = render(<TaskDetailScreen route={route} navigation={navigation} />);

  expect(screen.queryByTestId("task-detail__hero")).toBeNull();
  expect(screen.getByText("Task Details")).toBeTruthy();
  expect(screen.getByText("Site: Level 9 Rooftop")).toBeTruthy();
  expect(screen.getByText("By: Casey")).toBeTruthy();
  expect(screen.getByText("To: Sam, Alex")).toBeTruthy();
  expect(screen.getByText("Owner: Sam")).toBeTruthy();
});
```

- [ ] **Step 2: Run the acceptance test to verify it fails**

Run: `npm test -- --runInBand --runTestsByPath src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
Expected: FAIL because the hero still renders and the new `Task Details` / chip text is not present yet.

- [ ] **Step 3: Write the failing header test for inline badge rendering**

```tsx
it("renders the task title and badges inside the shared header", () => {
  const screen = render(<TaskDetailScreen route={route} navigation={navigation} />);

  expect(screen.getByText("Task Details")).toBeTruthy();
  expect(screen.getByText("Critical This Week")).toBeTruthy();
  expect(screen.getByText("Interior")).toBeTruthy();
  expect(screen.getByText("In Progress")).toBeTruthy();
  expect(screen.getByText("50% Complete")).toBeTruthy();
  expect(screen.getByText("Due Jul 10")).toBeTruthy();
});
```

- [ ] **Step 4: Run the header test to verify it fails**

Run: `npm test -- --runInBand --runTestsByPath src/__tests__/integration/TaskDetailScreen.header.test.tsx`
Expected: FAIL because badges are still owned by the hero instead of the header title region.

- [ ] **Step 5: Commit the red tests**

```bash
git add src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx
git commit -m "test(task-detail): capture option c layout contract"
```

### Task 2: Move badges into the header and remove the hero

**Files:**
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/components/taskDetail/TaskDetailHero.tsx`
- Test: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

- [ ] **Step 1: Implement a header title node with badges**

```tsx
const headerTitleNode = (
  <View testID="task-detail__header-title-block">
    <Text className="text-[28px] leading-8 font-semibold text-[#F8FCFF]">
      {header.title}
    </Text>
    <View testID="task-detail__header-badges" className="mt-3 flex-row flex-wrap gap-2">
      {headerBadges.map((badge) => (
        <TaskHeaderBadge key={badge.id} badge={badge} />
      ))}
    </View>
  </View>
);
```

- [ ] **Step 2: Stop rendering the hero in `TaskDetailScreen`**

```tsx
<ModernScreenHeader
  title={output.header.title}
  titleNode={headerTitleNode}
  showBackButton
  onBackPress={handleBackPress}
  className="border-b-0 bg-[#08576E] pb-3"
/>

{output.taskHero ? null : null}
```

- [ ] **Step 3: Run the focused header and acceptance tests**

Run: `npm test -- --runInBand --runTestsByPath src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
Expected: header assertions pass, acceptance test still fails on the old info-card shape until Task 3 lands.

- [ ] **Step 4: Commit the hero-removal/header change**

```bash
git add src/screens/TaskDetailScreen.tsx
git commit -m "feat(task-detail): move summary badges into header"
```

### Task 3: Convert the info card into Option C `Task Details`

**Files:**
- Modify: `src/components/taskDetail/TaskDetailInfoCard.tsx`
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Test: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Add an explicit compact-chip model if the existing info-card contract is too row-oriented**

```ts
export interface TaskDetailInfoChipModel {
  id: string;
  label: "Site" | "By" | "To" | "Owner";
  value: string;
}
```

- [ ] **Step 2: Map adapter data into `Task Details` chip content**

```ts
const infoChips: TaskDetailInfoChipModel[] = [
  buildInfoChip("site", "Site", task.locationOnSiteLabel),
  buildInfoChip("assigned-by", "By", assignment.assignerLabel),
  buildInfoChip("assigned-to", "To", assignment.assigneeSummaryLabel),
  buildInfoChip("owner", "Owner", assignment.primaryOwnerLabel),
].filter((chip): chip is TaskDetailInfoChipModel => Boolean(chip));
```

- [ ] **Step 3: Render the compact card in `TaskDetailInfoCard`**

```tsx
<View testID="task-detail__info-card" className="rounded-[24px] border border-slate-200 bg-white p-4">
  <Text className="text-[15px] font-semibold uppercase tracking-[2px] text-slate-500">
    Task Details
  </Text>
  <Text testID="task-detail__description" className="mt-3 text-[16px] leading-6 text-slate-700">
    {descriptionText}
  </Text>
  <View testID="task-detail__detail-chips" className="mt-4 flex-row flex-wrap gap-2">
    {chips.map((chip) => (
      <View key={chip.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
        <Text className="text-[13px] font-semibold text-slate-700">
          {chip.label}: {chip.value}
        </Text>
      </View>
    ))}
  </View>
</View>
```

- [ ] **Step 4: Run the acceptance test to verify it passes**

Run: `npm test -- --runInBand --runTestsByPath src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
Expected: PASS with `Task Details` title and `Site` / `By` / `To` / `Owner` chip text visible.

- [ ] **Step 5: Commit the card conversion**

```bash
git add src/components/taskDetail/TaskDetailInfoCard.tsx src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
git commit -m "feat(task-detail): compact task details metadata"
```

### Task 4: Run the final focused validation

**Files:**
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- Test: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- Test: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- Test: `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`

- [ ] **Step 1: Run the targeted Task Detail suite**

Run: `npm test -- --runInBand --runTestsByPath src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
Expected: PASS

- [ ] **Step 2: Inspect the final diff**

Run: `git diff --stat HEAD~3..HEAD`
Expected: only task-detail screen/component/adapter/test files in the scope of the approved design

- [ ] **Step 3: Commit any final test cleanup if needed**

```bash
git add src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx
git commit -m "test(task-detail): cover option c header layout"
```
