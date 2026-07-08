# Task Detail Two-Button Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current variable Task Detail quick-action cluster with a fixed two-button bottom action bar that changes by task state.

**Architecture:** Keep the existing navigator structure, task-detail route ownership, and task semantics untouched. Restrict this change to Task Detail action selection and quick-action rendering so the screen continues to use the current task store methods while exposing only the approved two-button sets: `Accept` / `Reject` before acceptance, then `Add Photos` / `Add Comment` after acceptance and through review.

**Tech Stack:** Expo 54, React Native, TypeScript, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
  Replace the current quick-action selection logic with the approved two-button state map.

- `src/components/taskDetail/TaskDetailQuickActions.tsx`
  Render the action surface as a fixed two-button layout instead of a variable wrap cluster.

- `src/screens/TaskDetailScreen.tsx`
  Preserve existing placement and wiring while using the updated quick-action layout.

### Tests to modify

- `src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx`
- `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

### Docs to update after implementation

- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- `docs/superpowers/plans/2026-07-07-task-detail-two-button-actions.md`

## Task 1: Implement the state-driven two-button action model

**Files:**
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Modify: `src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("shows Accept and Reject before the task is accepted", () => {
  const { output } = buildTaskDetailForStatus("assigned");

  expect(output.quickActions?.actions.map((action) => action.actionId)).toEqual([
    "accept_task",
    "decline_task",
  ]);
});
```

```tsx
it("shows Add Photos and Add Comment after the task is accepted", () => {
  const { output } = buildTaskDetailForStatus("accepted");

  expect(output.quickActions?.actions.map((action) => action.actionId)).toEqual([
    "update_progress",
    "add_comment",
  ]);
});
```

```tsx
it("keeps Add Photos and Add Comment while the task is in review", () => {
  const { output } = buildTaskDetailForStatus("submitted_for_review");

  expect(output.quickActions?.actions.map((action) => action.actionId)).toEqual([
    "update_progress",
    "add_comment",
  ]);
  expect(output.quickActions?.actions.some((action) => action.actionId === "approve_task")).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: FAIL because the current quick-action logic still exposes three-button review states and approval/rejection actions in review.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/viewAdapters/useTaskDetailViewAdapter.ts
const quickActionIds = isAwaitingAcceptance
  ? ["accept_task", "decline_task"]
  : isActiveWorkState || isContributorReviewState || isReviewerApprovalState
    ? ["update_progress", "add_comment"]
    : [];
```

```ts
if (isActiveWorkState || isContributorReviewState || isReviewerApprovalState) {
  addActionItem({
    actionId: "update_progress",
    label: t.taskDetail.updateTask || "Add Photos",
    icon: "camera-outline",
  });

  addActionItem({
    actionId: "add_comment",
    label: "Add Comment",
    icon: "chatbubble-outline",
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
git commit -m "feat(task-detail): add state-driven two-button actions"
```

## Task 2: Render quick actions as a fixed two-button bottom bar

**Files:**
- Modify: `src/components/taskDetail/TaskDetailQuickActions.tsx`
- Modify: `src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("renders the quick actions as a fixed two-button row", () => {
  const screen = render(
    <TaskDetailQuickActions
      model={buildQuickActionModel(["accept_task", "decline_task"])}
      onPress={jest.fn()}
    />,
  );

  expect(screen.getByTestId("task-detail__quick-actions-row")).toBeTruthy();
  expect(screen.queryByText("Quick Actions")).toBeNull();
});
```

```tsx
it("renders both action buttons with equal width in the bottom bar", () => {
  const screen = render(
    <TaskDetailQuickActions
      model={buildQuickActionModel(["update_progress", "add_comment"])}
      onPress={jest.fn()}
    />,
  );

  expect(screen.getByTestId("task-detail__quick-action-update_progress")).toBeTruthy();
  expect(screen.getByTestId("task-detail__quick-action-add_comment")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx --runInBand`

Expected: FAIL because the current component still renders a titled chip-wrap cluster.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/taskDetail/TaskDetailQuickActions.tsx
return (
  <View testID="task-detail__quick-actions" className="mx-4 mt-4">
    <View testID="task-detail__quick-actions-row" className="flex-row gap-3">
      {model.actions.slice(0, 2).map((action) => (
        <Pressable
          key={action.id}
          testID={`task-detail__quick-action-${action.actionId}`}
          className="min-w-0 flex-1 rounded-2xl bg-slate-900 px-4 py-4"
          onPress={() => onPress(action.actionId)}
        >
          <Text className="text-center text-base font-semibold text-white">
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  </View>
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/taskDetail/TaskDetailQuickActions.tsx src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx
git commit -m "feat(task-detail): render fixed two-button action bar"
```

## Task 3: Validate and record the Task Detail action-bar change

**Files:**
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-07-task-detail-two-button-actions.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Update the execution ledger**

```md
- replaced the variable Task Detail quick-action cluster with a fixed two-button bottom bar
- pre-acceptance tasks now show `Accept` and `Reject`
- accepted and review-state tasks now show `Add Photos` and `Add Comment`
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-07-task-detail-two-button-actions.md
git commit -m "docs(task-detail): record two-button action bar"
```

## Spec Coverage Check

- fixed two-button bottom action layout: Task 1 and Task 2
- pre-acceptance state uses `Accept` and `Reject`: Task 1
- post-acceptance and review states use `Add Photos` and `Add Comment`: Task 1
- no navigation-stack rewrite required: Task 1 and Task 2

## Placeholder Scan

- No `TBD` / `TODO`
- No “similar to Task N” shortcuts
- All file paths are explicit
- Each code-changing step includes concrete code
- Each verification step includes exact commands and expected outcomes

## Type Consistency Check

- `quickActions` remains the source of truth for Task Detail bottom actions
- `update_progress` remains the add-photos action wiring under the new label
- `TaskDetailQuickActions` becomes a fixed two-button renderer but keeps `onPress(actionId)` unchanged
