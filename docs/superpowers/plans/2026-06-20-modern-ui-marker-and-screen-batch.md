# Modern UI Marker And Screen Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a temporary shared `Modern UI` marker to already-modernized screens and modernize the next six approved screens using view adapters and presentation-focused screen shells.

**Architecture:** Introduce one reusable migration marker component that can render in both fully custom modern headers and `StandardHeader`-based bridge screens. Modernize the approved screens in a low-risk order, extracting state and behavior into dedicated view adapters while preserving existing task/project/profile workflow semantics. Record Group B header convergence as an explicit follow-up milestone so the bridge header does not become permanent.

**Tech Stack:** Expo-managed React Native, TypeScript, React Navigation, Zustand, Supabase, NativeWind, Jest.

---

### Task 1: Add Shared Modern UI Marker

**Files:**
- Create: `src/components/migration/ModernUiMarker.tsx`
- Modify: `src/components/StandardHeader.tsx`
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/screens/TasksScreen.tsx`
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/screens/UpdateProgressScreen.tsx`
- Modify: `src/screens/CreateTaskScreen.tsx`
- Modify: `src/screens/PhotoSelectionScreen.tsx`
- Test: `src/navigation/__tests__/uiModeRoutes.test.tsx`

- [ ] **Step 1: Write the failing marker smoke test**

Add one focused assertion to an existing modernized-screen test file or create a new small integration test that renders one Group A screen and one Group B screen with the marker expected in the top-right action area.

```tsx
expect(screen.getAllByText("Modern UI").length).toBeGreaterThanOrEqual(2);
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run:

```bash
npm test src/navigation/__tests__/uiModeRoutes.test.tsx
```

Expected: fail because `Modern UI` is not rendered yet.

- [ ] **Step 3: Implement the reusable marker**

Create `src/components/migration/ModernUiMarker.tsx` with a compact pill UI:

```tsx
import React from "react";
import { Text, View } from "react-native";

export default function ModernUiMarker() {
  return (
    <View className="h-8 rounded-full border border-blue-200 bg-blue-50 px-3 items-center justify-center">
      <Text className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        Modern UI
      </Text>
    </View>
  );
}
```

- [ ] **Step 4: Wire the marker into both header groups**

Update `StandardHeader` to compose `rightElement` alongside the existing profile slot, then add `ModernUiMarker` to:

- `DashboardScreen`
- `TasksScreen`
- `TaskDetailScreen`
- `UpdateProgressScreen`
- `CreateTaskScreen`
- `PhotoSelectionScreen`

Use the existing top-right action row rather than floating overlays.

- [ ] **Step 5: Run validation**

Run:

```bash
npm test src/navigation/__tests__/uiModeRoutes.test.tsx
npx tsc --noEmit
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/migration/ModernUiMarker.tsx src/components/StandardHeader.tsx src/screens/DashboardScreen.tsx src/screens/TasksScreen.tsx src/screens/TaskDetailScreen.tsx src/screens/UpdateProgressScreen.tsx src/screens/CreateTaskScreen.tsx src/screens/PhotoSelectionScreen.tsx src/navigation/__tests__/uiModeRoutes.test.tsx
git commit -m "feat(ui): add modern ui migration marker"
```

### Task 2: Modernize ProjectPickerScreen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Create: `src/ui/viewAdapters/useProjectPickerViewAdapter.ts`
- Modify: `src/screens/ProjectPickerScreen.tsx`
- Test: `src/__tests__/integration/ProjectPickerScreen.test.tsx`

- [ ] **Step 1: Write the failing render/binding test**

Create a focused test that asserts the project list renders and selecting a project triggers the adapter action.

```tsx
expect(screen.getByText("Select Project")).toBeTruthy();
fireEvent.press(screen.getByTestId("projectPicker-project-project-1"));
expect(mockHandleSelect).toHaveBeenCalledWith("project-1");
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test src/__tests__/integration/ProjectPickerScreen.test.tsx
```

Expected: fail before adapter wiring exists.

- [ ] **Step 3: Add the ProjectPicker adapter contract**

Extend `src/ui/contracts/viewAdapters.ts` with a project-picker output model that covers:

- readiness state
- list items
- selected project id
- switching state
- allow-back mode

- [ ] **Step 4: Implement `useProjectPickerViewAdapter`**

Move project selection, full-data refresh, selected-project state mapping, and empty-state derivation into the new adapter.

- [ ] **Step 5: Refactor the screen**

Replace inline store/state logic in `ProjectPickerScreen.tsx` with the adapter and keep the screen presentation-only.

- [ ] **Step 6: Run validation**

Run:

```bash
npm test src/__tests__/integration/ProjectPickerScreen.test.tsx
npx tsc --noEmit
```

Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useProjectPickerViewAdapter.ts src/screens/ProjectPickerScreen.tsx src/__tests__/integration/ProjectPickerScreen.test.tsx
git commit -m "refactor(projects): modernize project picker screen"
```

### Task 3: Modernize AddCommentScreen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Create: `src/ui/viewAdapters/useAddCommentViewAdapter.ts`
- Modify: `src/screens/AddCommentScreen.tsx`
- Test: `src/__tests__/integration/AddCommentScreen.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

Create a test that verifies the screen renders, comment text updates, and the submit action is bound.

```tsx
fireEvent.changeText(screen.getByPlaceholderText(/comment/i), "Need more detail");
fireEvent.press(screen.getByText(/add comment/i));
expect(mockSubmitComment).toHaveBeenCalled();
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test src/__tests__/integration/AddCommentScreen.test.tsx
```

- [ ] **Step 3: Add the adapter contract and implementation**

Extract:

- comment text state
- photo attachment state
- add-photo flow
- submit lifecycle
- task-not-found readiness state

- [ ] **Step 4: Refactor `AddCommentScreen.tsx`**

Leave the screen as a presentation shell that maps adapter output and actions into the UI.

- [ ] **Step 5: Run validation**

Run:

```bash
npm test src/__tests__/integration/AddCommentScreen.test.tsx
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useAddCommentViewAdapter.ts src/screens/AddCommentScreen.tsx src/__tests__/integration/AddCommentScreen.test.tsx
git commit -m "refactor(tasks): modernize add comment screen"
```

### Task 4: Modernize RejectTaskScreen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Create: `src/ui/viewAdapters/useRejectTaskViewAdapter.ts`
- Modify: `src/screens/RejectTaskScreen.tsx`
- Test: `src/__tests__/integration/RejectTaskScreen.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

Create a focused test that verifies rejection reason entry, optional photo handling bindings, and submit action wiring.

```tsx
fireEvent.changeText(screen.getByPlaceholderText(/reason/i), "Incorrect scope");
fireEvent.press(screen.getByText(/reject/i));
expect(mockReject).toHaveBeenCalled();
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test src/__tests__/integration/RejectTaskScreen.test.tsx
```

- [ ] **Step 3: Extract the adapter**

Move task/subtask branching, reason form state, photo state, and submit logic into `useRejectTaskViewAdapter.ts`.

- [ ] **Step 4: Refactor the screen**

Preserve current rejection semantics and route behavior while making the screen presentation-only.

- [ ] **Step 5: Run validation**

Run:

```bash
npm test src/__tests__/integration/RejectTaskScreen.test.tsx
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useRejectTaskViewAdapter.ts src/screens/RejectTaskScreen.tsx src/__tests__/integration/RejectTaskScreen.test.tsx
git commit -m "refactor(tasks): modernize reject task screen"
```

### Task 5: Modernize ReassignTaskScreen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Create: `src/ui/viewAdapters/useReassignTaskViewAdapter.ts`
- Modify: `src/screens/ReassignTaskScreen.tsx`
- Test: `src/__tests__/integration/ReassignTaskScreen.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

Create a test that verifies searchable assignee rows render and selecting a user invokes the reassignment action.

```tsx
fireEvent.changeText(screen.getByPlaceholderText(/search/i), "Chris");
fireEvent.press(screen.getByText("Chris Wong"));
expect(mockReassign).toHaveBeenCalledWith("user-2");
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test src/__tests__/integration/ReassignTaskScreen.test.tsx
```

- [ ] **Step 3: Extract the adapter**

Move:

- candidate list derivation
- search query state
- favorites binding
- selected user state
- confirm/reassign action

into `useReassignTaskViewAdapter.ts`.

- [ ] **Step 4: Refactor the screen**

Keep the screen presentation-focused and preserve return navigation and success behavior.

- [ ] **Step 5: Run validation**

Run:

```bash
npm test src/__tests__/integration/ReassignTaskScreen.test.tsx
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useReassignTaskViewAdapter.ts src/screens/ReassignTaskScreen.tsx src/__tests__/integration/ReassignTaskScreen.test.tsx
git commit -m "refactor(tasks): modernize reassign task screen"
```

### Task 6: Modernize ProfileScreen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Create: `src/ui/viewAdapters/useProfileViewAdapter.ts`
- Modify: `src/screens/ProfileScreen.tsx`
- Test: `src/__tests__/integration/ProfileScreen.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

Create a test that verifies key profile sections render and one primary action such as refresh or language settings remains wired.

```tsx
expect(screen.getByText(/profile/i)).toBeTruthy();
fireEvent.press(screen.getByText(/refresh data/i));
expect(mockRefreshAll).toHaveBeenCalled();
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test src/__tests__/integration/ProfileScreen.test.tsx
```

- [ ] **Step 3: Extract the adapter**

Move modal state, derived sections, refresh/status actions, and role-based visibility into `useProfileViewAdapter.ts`.

- [ ] **Step 4: Refactor the screen**

Preserve current sections, admin/developer visibility, and modal behaviors.

- [ ] **Step 5: Run validation**

Run:

```bash
npm test src/__tests__/integration/ProfileScreen.test.tsx
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useProfileViewAdapter.ts src/screens/ProfileScreen.tsx src/__tests__/integration/ProfileScreen.test.tsx
git commit -m "refactor(profile): modernize profile screen"
```

### Task 7: Modernize ProjectsScreen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Create: `src/ui/viewAdapters/useProjectsViewAdapter.ts`
- Modify: `src/screens/ProjectsScreen.tsx`
- Test: `src/__tests__/integration/ProjectsScreen.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

Create a test that verifies the projects list renders and at least one critical interaction, such as search or edit-entry binding, remains intact.

```tsx
fireEvent.changeText(screen.getByPlaceholderText(/search projects/i), "Tower");
expect(screen.getByText("Tower A")).toBeTruthy();
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test src/__tests__/integration/ProjectsScreen.test.tsx
```

- [ ] **Step 3: Extract the adapter**

Move list/filter/search/refresh logic and modal-entry state into `useProjectsViewAdapter.ts`.

- [ ] **Step 4: Refactor the screen carefully**

Keep role-based behavior, retry/refresh flows, and edit modal behavior intact. If the inline modal is too large, split it into a focused local component without broad architectural changes.

- [ ] **Step 5: Run validation**

Run:

```bash
npm test src/__tests__/integration/ProjectsScreen.test.tsx
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useProjectsViewAdapter.ts src/screens/ProjectsScreen.tsx src/__tests__/integration/ProjectsScreen.test.tsx
git commit -m "refactor(projects): modernize projects screen"
```

### Task 8: Record Group B Header Convergence Follow-Up

**Files:**
- Modify: `documentation/ui-migration-foundations-wave1-matrix.md`

- [ ] **Step 1: Add the follow-up note**

Append a short note stating that Group B screens using `StandardHeader` remain transitional and must be migrated to fully custom modern headers in a later milestone.

- [ ] **Step 2: Run a documentation sanity check**

Run:

```bash
grep -n "Group B" documentation/ui-migration-foundations-wave1-matrix.md
```

Expected: one or more matching lines showing the follow-up note.

- [ ] **Step 3: Commit**

```bash
git add documentation/ui-migration-foundations-wave1-matrix.md
git commit -m "docs(ui): record group b header convergence follow-up"
```
