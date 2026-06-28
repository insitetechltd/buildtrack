# Batch A Auth And Admin Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize `LoginScreen`, `ReportsScreen`, and `AdminDashboardScreen` with view adapters and presentation-focused screen shells while preserving current auth, reporting, and admin workflow behavior.

**Architecture:** Add typed screen output contracts to `src/ui/contracts/viewAdapters.ts`, create one dedicated adapter hook per screen, and refactor each screen to render from adapter output with minimal inline state. Preserve current navigation, alerting, and store interactions, and add focused integration coverage for the highest-value bindings per screen.

**Tech Stack:** Expo-managed React Native, TypeScript, React Navigation, Zustand, Supabase, NativeWind, Jest.

---

### Task 1: Modernize LoginScreen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Create: `src/ui/viewAdapters/useLoginViewAdapter.ts`
- Modify: `src/screens/LoginScreen.tsx`
- Test: `src/__tests__/integration/LoginScreen.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

Create a focused test that verifies the form renders and submit remains bound through the login flow.

```tsx
fireEvent.changeText(screen.getByTestId("login-emailOrPhone"), "demo@example.com");
fireEvent.changeText(screen.getByTestId("login-password"), "secret123");
fireEvent.press(screen.getByTestId("login-submit"));
expect(mockLogin).toHaveBeenCalledWith("demo@example.com", "secret123");
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx jest src/__tests__/integration/LoginScreen.test.tsx --runInBand
```

Expected: fail before the adapter-backed screen is implemented.

- [ ] **Step 3: Add the login adapter contract**

Extend `src/ui/contracts/viewAdapters.ts` with a compact `LoginScreenViewAdapterOutput` that covers:

- email or phone field value
- password field value
- password visibility
- build identifier label
- validation errors
- loading state

- [ ] **Step 4: Implement `useLoginViewAdapter`**

Move form state, field validation, password toggle, login submit flow, and alert branching into the adapter.

- [ ] **Step 5: Refactor `LoginScreen.tsx`**

Make the screen presentational and bind form inputs/buttons to adapter output and actions.

- [ ] **Step 6: Run validation**

Run:

```bash
npx jest src/__tests__/integration/LoginScreen.test.tsx --runInBand
npx tsc --noEmit
```

Expected: both pass.

### Task 2: Modernize ReportsScreen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Create: `src/ui/viewAdapters/useReportsViewAdapter.ts`
- Modify: `src/screens/ReportsScreen.tsx`
- Test: `src/__tests__/integration/ReportsScreen.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

Create a test that verifies report configuration renders and one critical control, such as report type or generate summary, remains wired.

```tsx
fireEvent.press(screen.getByText(/my tasks/i));
fireEvent.press(screen.getByText(/done/i));
expect(Alert.alert).toHaveBeenCalled();
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx jest src/__tests__/integration/ReportsScreen.test.tsx --runInBand
```

- [ ] **Step 3: Add the reports adapter contract**

Add `ReportsScreenViewAdapterOutput` covering:

- readiness
- current report type
- date range labels
- statistics cards
- visible task rows

- [ ] **Step 4: Implement `useReportsViewAdapter`**

Move task filtering, date-range state, report-type state, derived stats, and generate-summary behavior into the adapter.

- [ ] **Step 5: Refactor `ReportsScreen.tsx`**

Keep the screen focused on rendering cards, task rows, date pickers, and the generate action from adapter output.

- [ ] **Step 6: Run validation**

Run:

```bash
npx jest src/__tests__/integration/ReportsScreen.test.tsx --runInBand
npx tsc --noEmit
```

Expected: both pass.

### Task 3: Modernize AdminDashboardScreen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Create: `src/ui/viewAdapters/useAdminDashboardViewAdapter.ts`
- Modify: `src/screens/AdminDashboardScreen.tsx`
- Test: `src/__tests__/integration/AdminDashboardScreen.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

Create a focused test that verifies the admin dashboard renders the key stats/actions and one primary admin action remains bound.

```tsx
expect(screen.getByText(/admin dashboard/i)).toBeTruthy();
fireEvent.press(screen.getByText(/projects/i));
expect(mockNavigateToProjects).toHaveBeenCalled();
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx jest src/__tests__/integration/AdminDashboardScreen.test.tsx --runInBand
```

- [ ] **Step 3: Add the admin dashboard adapter contract**

Add `AdminDashboardScreenViewAdapterOutput` covering:

- readiness and access gating
- top-level stats
- quick actions
- banner settings state
- refresh state

- [ ] **Step 4: Implement `useAdminDashboardViewAdapter`**

Move company/user/task/project derivation, refresh flow, banner modal state, and quick-action wiring into the adapter.

- [ ] **Step 5: Refactor `AdminDashboardScreen.tsx`**

Keep the screen presentation-focused, leaving modal rendering local if that is the smallest-risk choice.

- [ ] **Step 6: Run validation**

Run:

```bash
npx jest src/__tests__/integration/AdminDashboardScreen.test.tsx --runInBand
npx tsc --noEmit
```

Expected: both pass.

### Task 4: Batch Verification

**Files:**
- Test: `src/__tests__/integration/LoginScreen.test.tsx`
- Test: `src/__tests__/integration/ReportsScreen.test.tsx`
- Test: `src/__tests__/integration/AdminDashboardScreen.test.tsx`

- [ ] **Step 1: Run the combined Batch A test sweep**

Run:

```bash
npx jest src/__tests__/integration/LoginScreen.test.tsx src/__tests__/integration/ReportsScreen.test.tsx src/__tests__/integration/AdminDashboardScreen.test.tsx --runInBand
```

Expected: all three suites pass.

- [ ] **Step 2: Run the final typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useLoginViewAdapter.ts src/ui/viewAdapters/useReportsViewAdapter.ts src/ui/viewAdapters/useAdminDashboardViewAdapter.ts src/screens/LoginScreen.tsx src/screens/ReportsScreen.tsx src/screens/AdminDashboardScreen.tsx src/__tests__/integration/LoginScreen.test.tsx src/__tests__/integration/ReportsScreen.test.tsx src/__tests__/integration/AdminDashboardScreen.test.tsx docs/superpowers/plans/2026-06-20-batch-a-auth-and-admin-screens.md
git commit -m "refactor(ui): modernize auth and admin batch a screens"
```
