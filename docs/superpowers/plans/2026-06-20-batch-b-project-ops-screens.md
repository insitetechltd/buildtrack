# Batch B Project Ops Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize `ProjectDetailScreen`, `UserManagementScreen`, and `CreateProjectScreen` with adapter-driven state and presentation-focused screen shells.

**Architecture:** Add typed output contracts for each Batch B screen to `src/ui/contracts/viewAdapters.ts`, create one dedicated adapter hook per screen under `src/ui/viewAdapters/`, and refactor each screen to render from adapter output with minimal inline state. Preserve current project, assignment, approval, refresh, and creation semantics while keeping large modal bodies local unless a tiny helper split materially reduces risk.

**Tech Stack:** Expo-managed React Native, TypeScript, React Navigation, Zustand, Supabase, NativeWind, Jest.

---

### Task 1: Modernize ProjectDetailScreen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Create: `src/ui/viewAdapters/useProjectDetailViewAdapter.ts`
- Modify: `src/screens/ProjectDetailScreen.tsx`
- Test: `src/__tests__/integration/ProjectDetailScreen.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

Create a focused test that verifies project detail content renders and one primary action, such as edit entry or member removal, remains wired.

```tsx
expect(screen.getByText(/project details/i)).toBeTruthy();
fireEvent.press(screen.getByTestId("project-detail__edit"));
expect(mockOpenEdit).toHaveBeenCalled();
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx jest src/__tests__/integration/ProjectDetailScreen.test.tsx --runInBand
```

- [ ] **Step 3: Add the ProjectDetail adapter contract**

Extend `src/ui/contracts/viewAdapters.ts` with a compact `ProjectDetailScreenViewAdapterOutput` covering:

- readiness and refresh state
- project summary fields
- lead PM and member rows
- task/stat cards
- edit modal visibility and member-management affordances

- [ ] **Step 4: Implement `useProjectDetailViewAdapter`**

Move project lookup, assignment cleanup/refresh, derived project/member/task data, edit modal state, add-member state, and destructive action handlers into the adapter.

- [ ] **Step 5: Refactor `ProjectDetailScreen.tsx`**

Leave the screen presentation-focused, keeping large modal rendering local if that is the lowest-risk path.

- [ ] **Step 6: Run validation**

Run:

```bash
npx jest src/__tests__/integration/ProjectDetailScreen.test.tsx --runInBand
npx tsc --noEmit
```

### Task 2: Modernize UserManagementScreen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Create: `src/ui/viewAdapters/useUserManagementViewAdapter.ts`
- Modify: `src/screens/UserManagementScreen.tsx`
- Test: `src/__tests__/integration/UserManagementScreen.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

Create a focused test that verifies user cards render and one admin action, such as approve/reject or assign, stays wired.

```tsx
expect(screen.getByText(/user management/i)).toBeTruthy();
fireEvent.press(screen.getByText(/approve/i));
expect(mockApproveUser).toHaveBeenCalled();
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx jest src/__tests__/integration/UserManagementScreen.test.tsx --runInBand
```

- [ ] **Step 3: Add the UserManagement adapter contract**

Add `UserManagementScreenViewAdapterOutput` covering:

- access gating
- search query
- filtered user cards
- active modal state
- pending approval/removal payloads
- refresh state

- [ ] **Step 4: Implement `useUserManagementViewAdapter`**

Move company-user filtering, project-role labeling, approve/reject/remove/assign flows, modal state, and refresh behavior into the adapter.

- [ ] **Step 5: Refactor `UserManagementScreen.tsx`**

Keep the screen presentational and preserve current modal-driven admin flows.

- [ ] **Step 6: Run validation**

Run:

```bash
npx jest src/__tests__/integration/UserManagementScreen.test.tsx --runInBand
npx tsc --noEmit
```

### Task 3: Modernize CreateProjectScreen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Create: `src/ui/viewAdapters/useCreateProjectViewAdapter.ts`
- Modify: `src/screens/CreateProjectScreen.tsx`
- Test: `src/__tests__/integration/CreateProjectScreen.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

Create a focused test that verifies create-project submission remains wired through the modernized screen shell.

```tsx
fireEvent.press(screen.getByText(/create/i));
expect(mockSubmitProject).toHaveBeenCalled();
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx jest src/__tests__/integration/CreateProjectScreen.test.tsx --runInBand
```

- [ ] **Step 3: Add the CreateProject adapter contract**

Add `CreateProjectScreenViewAdapterOutput` covering:

- access gating
- isSubmitting
- banner/header state
- form-submit readiness

- [ ] **Step 4: Implement `useCreateProjectViewAdapter`**

Move admin gating, create-project submission, retry/fetch confirmation flow, and success/error alert handling into the adapter.

- [ ] **Step 5: Refactor `CreateProjectScreen.tsx`**

Keep `ProjectForm` in place and wire submit/cancel behavior from the adapter.

- [ ] **Step 6: Run validation**

Run:

```bash
npx jest src/__tests__/integration/CreateProjectScreen.test.tsx --runInBand
npx tsc --noEmit
```

### Task 4: Batch B Verification

**Files:**
- Test: `src/__tests__/integration/ProjectDetailScreen.test.tsx`
- Test: `src/__tests__/integration/UserManagementScreen.test.tsx`
- Test: `src/__tests__/integration/CreateProjectScreen.test.tsx`
- Modify: `docs/superpowers/plans/2026-06-20-batch-b-project-ops-screens.md`

- [ ] **Step 1: Run the combined Batch B test sweep**

Run:

```bash
npx jest src/__tests__/integration/ProjectDetailScreen.test.tsx src/__tests__/integration/UserManagementScreen.test.tsx src/__tests__/integration/CreateProjectScreen.test.tsx --runInBand
```

- [ ] **Step 2: Run the final typecheck**

Run:

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useProjectDetailViewAdapter.ts src/ui/viewAdapters/useUserManagementViewAdapter.ts src/ui/viewAdapters/useCreateProjectViewAdapter.ts src/screens/ProjectDetailScreen.tsx src/screens/UserManagementScreen.tsx src/screens/CreateProjectScreen.tsx src/__tests__/integration/ProjectDetailScreen.test.tsx src/__tests__/integration/UserManagementScreen.test.tsx src/__tests__/integration/CreateProjectScreen.test.tsx docs/superpowers/plans/2026-06-20-batch-b-project-ops-screens.md
git commit -m "refactor(ui): modernize batch b project ops screens"
```

### Post-Batch-B Queue

**Queue prepared for the screens after Batch B:**

1. `PendingUsersScreen`
2. `PhotoViewerScreen`
3. `DeveloperSettingsScreen`
4. `DevAdminScreen`

**Deferred / Orphaned / Lower Priority**

- `RegisterScreen` remains effectively inactive in the current auth flow.
- `ProjectsTasksScreen` appears production-orphaned relative to the active navigator.
- legacy or backup files stay out of the modernization queue unless explicitly revived.
