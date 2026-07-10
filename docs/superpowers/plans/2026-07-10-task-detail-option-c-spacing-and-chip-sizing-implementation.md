# Task Detail Option C Spacing And Chip Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the live `Task Details` card so the Option C metadata chips are more legible and the card spacing feels denser and more intentional without changing structure or wording.

**Architecture:** Keep the existing Option C layout in place and make a narrow styling pass across the `TaskDetailInfoCard` component only, with corresponding screenshot-driven regression assertions in the Task Detail test suite. Reuse the current header and data contract so this slice changes presentation only and does not reopen the Task Detail structure work.

**Tech Stack:** Expo React Native, TypeScript, React Native Testing Library, Jest, NativeWind utility classes

---

## File Map

- Modify: `src/components/taskDetail/TaskDetailInfoCard.tsx`
  - tune card spacing and chip sizing
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
  - assert the updated chip and card class contract
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
  - keep screen-level Task Details assertions aligned with the tuned card
- Modify: `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
  - keep bounded layout expectations aligned after spacing changes

### Task 1: Lock the spacing and chip-sizing contract in tests

**Files:**
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- Test: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- Test: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

- [ ] **Step 1: Write the failing chip-sizing assertions**

```tsx
expect(infoCardScreen.getByTestId("task-detail__detail_chips").props.className).toContain("mt-3");
expect(infoCardScreen.getByText("Site: Level 9 Rooftop").props.className).toContain("text-sm");
expect(infoCardScreen.getByText("By: Casey").props.className).toContain("text-sm");
expect(infoCardScreen.getByText("To: Sam, Alex").props.className).toContain("text-sm");
```

- [ ] **Step 2: Write the failing card-spacing assertions**

```tsx
expect(infoCardScreen.getByTestId("task-detail__info_card").props.className).toContain("p-[14px]");
expect(infoCardScreen.getByTestId("task-detail__detail_chips").props.className).toContain("gap-1.5");
```

- [ ] **Step 3: Run the focused tests to verify they fail**

Run: `npm test -- --runInBand --runTestsByPath src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx`

Expected: FAIL because the current card still uses the first-pass chip sizing and spacing classes.

- [ ] **Step 4: Commit the red test update**

```bash
git add src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx
git commit -m "test(task-detail): capture chip sizing refinement"
```

### Task 2: Tune the `Task Details` card spacing and chip sizing

**Files:**
- Modify: `src/components/taskDetail/TaskDetailInfoCard.tsx`
- Test: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Tighten the card rhythm**

Replace the root and content spacing with:

```tsx
<View
  testID="task-detail__info_card"
  className="mx-4 mt-4 rounded-3xl border border-slate-200 bg-white p-[14px]"
>
  <View>
    <Text className="text-base font-semibold uppercase tracking-[1.2px] text-slate-500">
      Task Details
    </Text>
    <Text className="mt-1.5 text-lg leading-7 text-slate-700">
      {model.descriptionLabel || "—"}
    </Text>
  </View>
```

- [ ] **Step 2: Increase chip size and rebalance wrap spacing**

Replace the chip block and chip styles with:

```tsx
<View testID="task-detail__detail_chips" className="mt-3 flex-row flex-wrap gap-1.5">
  <InfoChip label="Site" value={model.siteLocationLabel} />
  <InfoChip label="By" value={model.assignedByLabel} />
  <InfoChip label="To" value={model.assignedToLabel} />
  {model.primaryOwnerLabel ? <InfoChip label="Owner" value={model.primaryOwnerLabel} /> : null}
</View>
```

```tsx
<View className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
  <Text className="text-sm font-semibold leading-5 text-slate-700">
    {buildInfoChipLabel(label, value)}
  </Text>
</View>
```

- [ ] **Step 3: Run the focused acceptance test**

Run: `npm test -- --runInBand --runTestsByPath src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

Expected: PASS

- [ ] **Step 4: Commit the styling pass**

```bash
git add src/components/taskDetail/TaskDetailInfoCard.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
git commit -m "feat(task-detail): tune details card chip spacing"
```

### Task 3: Validate the tuned screen contract

**Files:**
- Modify: `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
- Test: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- Test: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- Test: `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`

- [ ] **Step 1: Run the full focused Task Detail regression set**

Run: `npm test -- --runInBand --runTestsByPath src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`

Expected: PASS

- [ ] **Step 2: Review the scoped diff**

Run: `git diff --stat -- src/components/taskDetail/TaskDetailInfoCard.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`

Expected: only the Task Details card styling and its focused tests are touched.

- [ ] **Step 3: Commit the final validation alignment**

```bash
git add src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx
git commit -m "test(task-detail): verify option c visual tuning"
```
