# Batch C Utility And Admin Tail Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize `PendingUsersScreen`, `PhotoViewerScreen`, `DeveloperSettingsScreen`, and `DevAdminScreen` with adapter-driven state and presentation-focused screen shells.

**Architecture:** Add one focused contract slice per screen to `src/ui/contracts/viewAdapters.ts`, create one adapter hook per screen under `src/ui/viewAdapters/`, and refactor each screen so rendering is driven by adapter `output` and `actions`. Preserve current approval, photo viewing, developer tooling, and restricted dev-admin behavior while keeping large modal or utility bodies local when that reduces risk.

**Tech Stack:** Expo-managed React Native, TypeScript, React Navigation, Zustand, Supabase, NativeWind, Jest, AsyncStorage.

---

### Task 1: Modernize PendingUsersScreen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Create: `src/ui/viewAdapters/usePendingUsersViewAdapter.ts`
- Modify: `src/screens/PendingUsersScreen.tsx`
- Test: `src/__tests__/integration/PendingUsersScreen.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

Create a focused test that verifies pending users render and the approve action remains wired.

```tsx
expect(screen.getByText(/pending approvals/i)).toBeTruthy();
fireEvent.press(screen.getByText(/approve/i));
expect(Alert.alert).toHaveBeenCalled();
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx jest src/__tests__/integration/PendingUsersScreen.test.tsx --runInBand
```

- [ ] **Step 3: Add the PendingUsers adapter contract**

Extend `src/ui/contracts/viewAdapters.ts` with a `PendingUsersScreenViewAdapterOutput` covering:

- readiness/loading state
- subtitle count
- pending user cards
- refresh state
- empty state

- [ ] **Step 4: Implement `usePendingUsersViewAdapter`**

Move user loading, refresh flow, pending user derivation, approve/reject alert orchestration, and success/error reload behavior into the adapter.

- [ ] **Step 5: Refactor `PendingUsersScreen.tsx`**

Make the screen presentation-focused and delegate actions through the adapter.

- [ ] **Step 6: Run validation**

Run:

```bash
npx jest src/__tests__/integration/PendingUsersScreen.test.tsx --runInBand
npx tsc --noEmit
```

### Task 2: Modernize PhotoViewerScreen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Create: `src/ui/viewAdapters/usePhotoViewerViewAdapter.ts`
- Modify: `src/screens/PhotoViewerScreen.tsx`
- Test: `src/__tests__/integration/PhotoViewerScreen.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

Create a focused test that verifies the photo viewer renders the current index and responds to back navigation or photo paging state.

```tsx
expect(screen.getByText("1 / 3")).toBeTruthy();
fireEvent.press(screen.getByText(/back/i));
expect(mockNavigateBack).toHaveBeenCalled();
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx jest src/__tests__/integration/PhotoViewerScreen.test.tsx --runInBand
```

- [ ] **Step 3: Add the PhotoViewer adapter contract**

Add `PhotoViewerScreenViewAdapterOutput` covering:

- current index
- photo count label
- activity metadata block
- derived icon/color metadata

- [ ] **Step 4: Implement `usePhotoViewerViewAdapter`**

Move current-index state, activity metadata derivation, reason extraction, and header label logic into the adapter.

- [ ] **Step 5: Refactor `PhotoViewerScreen.tsx`**

Keep the scroll/photo rendering local but bind all derived display state and navigation actions through the adapter.

- [ ] **Step 6: Run validation**

Run:

```bash
npx jest src/__tests__/integration/PhotoViewerScreen.test.tsx --runInBand
npx tsc --noEmit
```

### Task 3: Modernize DeveloperSettingsScreen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Create: `src/ui/viewAdapters/useDeveloperSettingsViewAdapter.ts`
- Modify: `src/screens/DeveloperSettingsScreen.tsx`
- Test: `src/__tests__/integration/DeveloperSettingsScreen.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

Create a focused test that verifies key developer sections render and one primary tool action remains wired.

```tsx
expect(screen.getByText(/developer settings/i)).toBeTruthy();
fireEvent.press(screen.getByText(/force sync all/i));
expect(mockForceSync).toHaveBeenCalled();
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx jest src/__tests__/integration/DeveloperSettingsScreen.test.tsx --runInBand
```

- [ ] **Step 3: Add the DeveloperSettings adapter contract**

Add `DeveloperSettingsScreenViewAdapterOutput` covering:

- auth/readiness state
- counts and toggles
- loading flags for destructive/test actions
- grouped developer actions

- [ ] **Step 4: Implement `useDeveloperSettingsViewAdapter`**

Move AsyncStorage actions, sync flows, diagnostics, dev-toggle state, and Sprint 7 sandbox actions into the adapter.

- [ ] **Step 5: Refactor `DeveloperSettingsScreen.tsx`**

Keep the large utility sections local if needed, but drive their state and handlers from the adapter.

- [ ] **Step 6: Run validation**

Run:

```bash
npx jest src/__tests__/integration/DeveloperSettingsScreen.test.tsx --runInBand
npx tsc --noEmit
```

### Task 4: Modernize DevAdminScreen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Create: `src/ui/viewAdapters/useDevAdminViewAdapter.ts`
- Modify: `src/screens/DevAdminScreen.tsx`
- Test: `src/__tests__/integration/DevAdminScreen.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

Create a focused test that verifies the access gate renders and one allowed environment/tool action remains wired for the authorized user path.

```tsx
expect(screen.getByText(/access denied/i)).toBeTruthy();
// authorized case
fireEvent.press(screen.getByText(/database health check/i));
expect(mockCheckHealth).toHaveBeenCalled();
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx jest src/__tests__/integration/DevAdminScreen.test.tsx --runInBand
```

- [ ] **Step 3: Add the DevAdmin adapter contract**

Add `DevAdminScreenViewAdapterOutput` covering:

- authorization state
- environment rows
- test script rows
- add-environment modal/form state
- loading state

- [ ] **Step 4: Implement `useDevAdminViewAdapter`**

Move authorization gating, environment switching, add/remove environment logic, and test-script orchestration into the adapter.

- [ ] **Step 5: Refactor `DevAdminScreen.tsx`**

Keep screen rendering local but bind to adapter output/actions.

- [ ] **Step 6: Run validation**

Run:

```bash
npx jest src/__tests__/integration/DevAdminScreen.test.tsx --runInBand
npx tsc --noEmit
```

### Task 5: Batch C Verification

**Files:**
- Test: `src/__tests__/integration/PendingUsersScreen.test.tsx`
- Test: `src/__tests__/integration/PhotoViewerScreen.test.tsx`
- Test: `src/__tests__/integration/DeveloperSettingsScreen.test.tsx`
- Test: `src/__tests__/integration/DevAdminScreen.test.tsx`

- [ ] **Step 1: Run the combined Batch C test sweep**

Run:

```bash
npx jest src/__tests__/integration/PendingUsersScreen.test.tsx src/__tests__/integration/PhotoViewerScreen.test.tsx src/__tests__/integration/DeveloperSettingsScreen.test.tsx src/__tests__/integration/DevAdminScreen.test.tsx --runInBand
```

- [ ] **Step 2: Run the final typecheck**

Run:

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/usePendingUsersViewAdapter.ts src/ui/viewAdapters/usePhotoViewerViewAdapter.ts src/ui/viewAdapters/useDeveloperSettingsViewAdapter.ts src/ui/viewAdapters/useDevAdminViewAdapter.ts src/screens/PendingUsersScreen.tsx src/screens/PhotoViewerScreen.tsx src/screens/DeveloperSettingsScreen.tsx src/screens/DevAdminScreen.tsx src/__tests__/integration/PendingUsersScreen.test.tsx src/__tests__/integration/PhotoViewerScreen.test.tsx src/__tests__/integration/DeveloperSettingsScreen.test.tsx src/__tests__/integration/DevAdminScreen.test.tsx docs/superpowers/plans/2026-06-20-batch-c-utility-and-admin-tail-screens.md
git commit -m "refactor(ui): modernize batch c utility and admin tail screens"
```
