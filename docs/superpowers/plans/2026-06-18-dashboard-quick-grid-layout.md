# Dashboard Quick-Grid Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a compact 3-tile responsibility quick-grid in the modern dashboard using existing adapter scalar metrics, with conditional overdue indicators and stable screen-level test coverage.

**Architecture:** Keep business logic in the adapter and accountability engine. `DashboardScreen.tsx` only consumes `output.scalarMetrics`, renders a presentational quick-grid below the header, and leaves the existing `FlatList`, FAB, and navigation wiring unchanged. Screen tests validate both baseline rendering and conditional overdue states.

**Tech Stack:** Expo React Native, TypeScript, NativeWind class utilities, Jest, `@testing-library/react-native`

---

## File Structure

- **Modify:** `src/screens/DashboardScreen.tsx`
  - add quick-grid render section below the header
  - destructure responsibility scalar metrics from `output.scalarMetrics`
  - attach stable `testID` attributes to tiles and overdue indicators
- **Modify:** `src/screens/__tests__/DashboardScreen.test.tsx`
  - extend the mocked adapter output with responsibility metrics
  - assert the three tiles render
  - assert overdue indicators are conditional
  - preserve existing header/FAB navigation assertions
- **Validate:** `src/ui/contracts/viewAdapters.ts`
  - read-only reference during implementation to confirm scalar field names already match the screen usage

### Task 1: Red Phase for Dashboard Quick-Grid

**Files:**
- Modify: `src/screens/__tests__/DashboardScreen.test.tsx`
- Reference: `src/ui/contracts/viewAdapters.ts`

- [ ] **Step 1: Write the failing screen assertions for the quick-grid**

Add assertions for:

- `dashboard-screen__metric_action_required`
- `dashboard-screen__metric_in_progress`
- `dashboard-screen__metric_awaiting_approval`
- `dashboard-screen__metric_action_required_overdue`
- `dashboard-screen__metric_in_progress_overdue`
- absence of `dashboard-screen__metric_awaiting_approval_overdue` when overdue is zero

Use adapter fixture values like:

```ts
scalarMetrics: {
  openTaskCount: 6,
  overdueTaskCount: 2,
  projectCount: 1,
  hasSelectedProject: true,
  actionRequiredCount: 3,
  inProgressSentCount: 4,
  awaitingApprovalCount: 1,
  actionRequiredOverdueCount: 2,
  inProgressSentOverdueCount: 1,
  awaitingApprovalOverdueCount: 0,
}
```

- [ ] **Step 2: Run the dashboard screen test to verify it fails**

Run:

```bash
npx jest src/screens/__tests__/DashboardScreen.test.tsx --runInBand
```

Expected:

- FAIL because the new quick-grid `testID`s are not rendered yet

### Task 2: Implement Dashboard Quick-Grid Rendering

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`
- Reference: `src/ui/viewAdapters/useDashboardViewAdapter.ts`

- [ ] **Step 1: Destructure the six quick-grid metrics from the adapter**

Read from:

```ts
const { output, visibility } = useDashboardViewAdapter();
const {
  actionRequiredCount,
  actionRequiredOverdueCount,
  inProgressSentCount,
  inProgressSentOverdueCount,
  awaitingApprovalCount,
  awaitingApprovalOverdueCount,
} = output.scalarMetrics;
```

- [ ] **Step 2: Insert the quick-grid section below the header**

Render structure:

```tsx
<View className="mb-4 flex-row gap-3" testID="dashboard-screen__metric_grid">
  {/* Action Required tile */}
  {/* In Progress tile */}
  {/* Awaiting Approval tile */}
</View>
```

Each tile should use equal flex width and compact spacing, for example:

```tsx
<View
  testID="dashboard-screen__metric_action_required"
  className="flex-1 rounded-2xl border border-orange-200 bg-orange-50 p-3"
>
  <Text className="text-xs font-semibold uppercase tracking-wide text-orange-700">
    Action Required
  </Text>
  <Text className="mt-2 text-3xl font-bold text-orange-900">
    {actionRequiredCount}
  </Text>
  {actionRequiredOverdueCount > 0 ? (
    <View
      testID="dashboard-screen__metric_action_required_overdue"
      className="mt-2 self-start rounded-full bg-red-600 px-2 py-1"
    >
      <Text className="text-xs font-semibold text-white">
        {actionRequiredOverdueCount} Overdue
      </Text>
    </View>
  ) : null}
</View>
```

Use corresponding palette variants for the other two tiles:

- blue family for `In Progress`
- cyan family for `Awaiting Approval`

For `In Progress`, the overdue indicator can be a compact text sub-label:

```tsx
{inProgressSentOverdueCount > 0 ? (
  <Text
    testID="dashboard-screen__metric_in_progress_overdue"
    className="mt-2 text-xs font-medium text-amber-700"
  >
    {inProgressSentOverdueCount} overdue
  </Text>
) : null}
```

- [ ] **Step 3: Keep the list/FAB structure intact**

Do not change:

- project card mapping
- `FlatList` key extraction
- `ListFooterComponent`
- FAB position or header shortcut behavior

### Task 3: Green Phase Validation

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/screens/__tests__/DashboardScreen.test.tsx`

- [ ] **Step 1: Re-run the dashboard screen test**

Run:

```bash
npx jest src/screens/__tests__/DashboardScreen.test.tsx --runInBand
```

Expected:

- PASS
- existing FAB/header interaction assertions remain green
- new quick-grid tile and overdue assertions pass

- [ ] **Step 2: Verify conditional overdue rendering explicitly**

Confirm in the test file that:

- action required overdue node exists when count `> 0`
- in progress overdue node exists when count `> 0`
- awaiting approval overdue node is absent when count is `0`

### Task 4: Refactor and Safety Validation

**Files:**
- Modify: `src/screens/DashboardScreen.tsx` if minor cleanup is needed

- [ ] **Step 1: Keep render code tidy without changing behavior**

Allowed refactor:

- small local array/config object for the three tiles if it reduces duplication
- small local render helper inside `DashboardScreen.tsx`

Not allowed:

- moving logic into new files
- introducing screen-layer metric calculations
- changing adapter behavior

- [ ] **Step 2: Run TypeScript verification**

Run:

```bash
npx tsc --noEmit
```

Expected:

- PASS with no type errors

- [ ] **Step 3: Run the targeted dashboard test again**

Run:

```bash
npx jest src/screens/__tests__/DashboardScreen.test.tsx --runInBand
```

Expected:

- PASS

- [ ] **Step 4: Run full regression verification**

Run:

```bash
npm run test:regression
```

Expected:

- PASS across task, upload, component, and integration suites

- [ ] **Step 5: Prepare implementation summary**

Summarize:

- where the quick-grid was inserted
- which `testID`s were added
- which overdue states are conditional
- validation results from TypeScript, targeted Jest, and regression suite

## Spec Coverage Check

- Placement below header and above `FlatList`: covered in Task 2
- Three equal-width tiles: covered in Task 2
- Direct scalar metric consumption only: covered in Task 2
- Conditional overdue indicators: covered in Tasks 1, 2, and 3
- Theme/palette alignment: covered in Task 2
- Stable `testID`s for automation: covered in Tasks 1 and 2
- Validation commands: covered in Task 4

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-18-dashboard-quick-grid-layout.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
