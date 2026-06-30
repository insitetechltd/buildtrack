# S-UI-02A ProjectsScreen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `ProjectsScreen` into a thinner, adapter-driven Wave 2 screen shell while preserving current project-list, filter, refresh, and edit behavior.

**Architecture:** Keep `src/ui/viewAdapters/useProjectsViewAdapter.ts` as the active domain/data boundary, expand tests first, then move only the minimum missing render-state logic into the adapter contract. Thin `src/screens/ProjectsScreen.tsx` with prop-driven leaf extraction only where it reduces coupling, and isolate the embedded edit modal only if it can be done without changing project-edit business behavior.

**Tech Stack:** Expo-managed React Native, TypeScript, Zustand, Supabase, React Navigation, Jest, `@testing-library/react-native`.

---

## File Structure

**Primary files**
- Modify: `src/__tests__/integration/ProjectsScreen.test.tsx`
  - expand screen-level regression coverage for admin/non-admin actions, filters, empty states, loading, refresh, and edit entry
- Modify: `src/ui/contracts/viewAdapters.ts`
  - extend `ProjectsScreenViewAdapterOutput` only with the view data needed to thin the screen shell
- Modify: `src/ui/viewAdapters/useProjectsViewAdapter.ts`
  - provide the new render-state models without changing domain semantics
- Modify: `src/screens/ProjectsScreen.tsx`
  - convert the screen into a more declarative shell consuming adapter output

**Possible new files**
- Create: `src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts`
  - focused adapter tests for scoping, labels, and continuity
- Create: `src/screens/projects/ProjectsScreenProjectCard.tsx`
  - pure presentational project card leaf
- Create: `src/screens/projects/ProjectsScreenFilterChips.tsx`
  - pure presentational filter row
- Create: `src/screens/projects/ProjectsScreenEmptyState.tsx`
  - pure presentational empty-state leaf
- Create: `src/screens/projects/EditProjectModal.tsx`
  - only if the existing modal can be extracted behind explicit props without changing save semantics

## Task 1: Freeze ProjectsScreen Behavior With Failing Screen Tests

**Files:**
- Modify: `src/__tests__/integration/ProjectsScreen.test.tsx`
- Test: `src/__tests__/integration/ProjectsScreen.test.tsx`

- [ ] **Step 1: Write the failing tests for admin actions, filters, empty states, refresh, and edit entry**

```tsx
it("shows admin actions when the adapter exposes admin mode", () => {
  const onNavigateToCreateProject = jest.fn();
  const onNavigateToUserManagement = jest.fn();

  mockUseProjectsViewAdapterReturn({
    isAdmin: true,
    projectItems: [buildProjectItem()],
  });

  const screen = render(
    <ProjectsScreen
      onNavigateToProjectDetail={jest.fn()}
      onNavigateToCreateProject={onNavigateToCreateProject}
      onNavigateToUserManagement={onNavigateToUserManagement}
    />,
  );

  fireEvent.press(screen.getByTestId("projects-create-action"));
  fireEvent.press(screen.getByTestId("projects-user-management-action"));

  expect(onNavigateToCreateProject).toHaveBeenCalled();
  expect(onNavigateToUserManagement).toHaveBeenCalled();
});

it("hides admin actions for non-admin output", () => {
  mockUseProjectsViewAdapterReturn({
    isAdmin: false,
    projectItems: [buildProjectItem()],
  });

  const screen = render(
    <ProjectsScreen
      onNavigateToProjectDetail={jest.fn()}
      onNavigateToCreateProject={jest.fn()}
    />,
  );

  expect(screen.queryByTestId("projects-create-action")).toBeNull();
  expect(screen.queryByTestId("projects-user-management-action")).toBeNull();
});

it("delegates status filter selection through the adapter", () => {
  const selectStatusFilter = jest.fn();
  mockUseProjectsViewAdapterReturn({
    filterOptions: [
      buildFilterOption({ value: "all", label: "All", isSelected: true }),
      buildFilterOption({ value: "active", label: "Active", isSelected: false }),
    ],
    actions: { selectStatusFilter },
  });

  const screen = render(
    <ProjectsScreen
      onNavigateToProjectDetail={jest.fn()}
      onNavigateToCreateProject={jest.fn()}
    />,
  );

  fireEvent.press(screen.getByText("Active"));

  expect(selectStatusFilter).toHaveBeenCalledWith("active");
});

it("renders the empty state create action only when allowed", () => {
  const onNavigateToCreateProject = jest.fn();
  mockUseProjectsViewAdapterReturn({
    projectItems: [],
    emptyState: {
      title: "No projects yet",
      message: "Create your first project to get started",
      showCreateAction: true,
    },
  });

  const screen = render(
    <ProjectsScreen
      onNavigateToProjectDetail={jest.fn()}
      onNavigateToCreateProject={onNavigateToCreateProject}
    />,
  );

  fireEvent.press(screen.getByText("Create Project"));

  expect(onNavigateToCreateProject).toHaveBeenCalled();
});

it("delegates project edit entry through the adapter", () => {
  const openEditProject = jest.fn();
  mockUseProjectsViewAdapterReturn({
    projectItems: [buildProjectItem({ canEdit: true })],
    actions: { openEditProject },
  });

  const screen = render(
    <ProjectsScreen
      onNavigateToProjectDetail={jest.fn()}
      onNavigateToCreateProject={jest.fn()}
    />,
  );

  fireEvent.press(screen.getByTestId("projects-edit-project-1"));

  expect(openEditProject).toHaveBeenCalledWith("project-1");
});
```

- [ ] **Step 2: Run the screen suite to verify the new assertions fail for the right reasons**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/ProjectsScreen.test.tsx --runInBand
```

Expected:

```text
FAIL src/__tests__/integration/ProjectsScreen.test.tsx
- Unable to find an element with testID: projects-create-action
- Unable to find an element with testID: projects-edit-project-1
```

- [ ] **Step 3: Make the smallest test-harness updates needed to express the new behaviors**

```tsx
const mockSelectStatusFilter = jest.fn();
const mockHandleRefresh = jest.fn();
const mockOpenEditProject = jest.fn();

function buildProjectItem(
  overrides: Partial<ProjectsScreenProjectItem> = {},
): ProjectsScreenProjectItem {
  return {
    id: "projects:project-1",
    projectId: "project-1",
    title: "Tower A",
    description: "Core package",
    statusValue: "active",
    statusLabel: "Active",
    locationLabel: "Central Site",
    memberCountLabel: "4 members",
    clientName: "Acme",
    startDateLabel: "2026-01-01",
    createdByLabel: "Casey Rivera",
    leadPmName: "Jordan Lee",
    canEdit: true,
    density: "standard",
    structuralState: "stale",
    ...overrides,
  };
}

function buildFilterOption(
  overrides: Partial<ProjectsScreenFilterOption> = {},
): ProjectsScreenFilterOption {
  return {
    id: "projects-filter:all",
    value: "all",
    label: "All",
    isSelected: true,
    ...overrides,
  };
}
```

- [ ] **Step 4: Run the screen suite again and keep it red only on the production gaps**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/ProjectsScreen.test.tsx --runInBand
```

Expected:

```text
FAIL src/__tests__/integration/ProjectsScreen.test.tsx
- screen now compiles and mounts
- remaining failures point at missing production testIDs or missing render branches
```

- [ ] **Step 5: Commit the test-freeze checkpoint if isolated cleanly**

```bash
git add src/__tests__/integration/ProjectsScreen.test.tsx
git commit -m "test(projects): freeze projects screen wave 2 behavior"
```

## Task 2: Add Adapter-Level Coverage For Scoping And Continuity

**Files:**
- Create: `src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts`
- Test: `src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts`

- [ ] **Step 1: Write the failing adapter tests for admin scoping, labels, search/filter narrowing, and continuity**

```tsx
it("uses company projects for admin users", async () => {
  mockUseAuthStore.mockReturnValue({
    user: { id: "admin-1", companyId: "company-1", role: "admin" },
  });
  mockGetProjectsByCompany.mockReturnValue([buildProject()]);
  mockGetProjectsByUser.mockReturnValue([]);

  const { result } = renderHook(() => useProjectsViewAdapter({}));

  await waitFor(() => {
    expect(result.current.output.projectItems).toHaveLength(1);
  });

  expect(mockGetProjectsByCompany).toHaveBeenCalledWith("company-1");
  expect(mockGetProjectsByUser).not.toHaveBeenCalled();
});

it("uses assigned projects for non-admin users", async () => {
  mockUseAuthStore.mockReturnValue({
    user: { id: "worker-1", companyId: "company-1", role: "worker" },
  });
  mockGetProjectsByCompany.mockReturnValue([buildProject()]);
  mockGetProjectsByUser.mockReturnValue([buildProject({ id: "project-2" })]);

  const { result } = renderHook(() => useProjectsViewAdapter({}));

  await waitFor(() => {
    expect(result.current.output.projectItems[0].projectId).toBe("project-2");
  });
});

it("filters by search query and status", async () => {
  mockGetProjectsByCompany.mockReturnValue([
    buildProject({ id: "project-1", name: "Tower A", status: "active" }),
    buildProject({ id: "project-2", name: "Warehouse", status: "planning" }),
  ]);

  const { result } = renderHook(() => useProjectsViewAdapter({}));

  act(() => {
    result.current.actions.setSearchQuery("tower");
  });

  expect(result.current.output.projectItems).toHaveLength(1);

  act(() => {
    result.current.actions.selectStatusFilter("active");
  });

  expect(result.current.output.projectItems[0].projectId).toBe("project-1");
});

it("preserves newProjectId continuity loading path", async () => {
  mockFetchProjects.mockResolvedValue(undefined);
  mockFetchUsers.mockResolvedValue(undefined);
  mockFetchUserProjectAssignments.mockResolvedValue(undefined);
  mockGetProjectsByCompany
    .mockReturnValueOnce([])
    .mockReturnValueOnce([buildProject({ id: "project-new" })]);

  const { result } = renderHook(() =>
    useProjectsViewAdapter({ newProjectId: "project-new" }),
  );

  await waitFor(() => {
    expect(result.current.output.projectItems[0].projectId).toBe("project-new");
  });
});
```

- [ ] **Step 2: Run the adapter suite to verify it fails correctly**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts --runInBand
```

Expected:

```text
FAIL src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts
- module or helper setup failures only if mocks are incomplete
- no false green on continuity or scoping behavior
```

- [ ] **Step 3: Finish the minimal mock scaffolding so the tests express the current contract accurately**

```tsx
jest.mock("@/state/authStore", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithCompanyInit: jest.fn(),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStoreWithInit: jest.fn(),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    projects: {
      active: "Active",
      planning: "Planning",
      onHold: "On Hold",
      completed: "Completed",
      cancelled: "Cancelled",
      all: "All",
      project: "project",
      projectsPlural: "projects",
      assignedToYou: "assigned to you",
      noLocation: "No location",
      member: "member",
      members: "members",
      budget: "Budget",
      unknown: "Unknown",
      noProjects: "No projects yet",
      noProjectsFound: "No projects found",
      tryAdjustingSearch: "Try adjusting your search or filters",
      createFirstProject: "Create your first project to get started",
      noProjectsMessage: "You haven't been assigned to any projects yet",
      projectUpdated: "Project updated successfully",
    },
    errors: {
      success: "Success",
    },
  }),
}));
```

- [ ] **Step 4: Run the adapter suite to green**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts --runInBand
```

Expected:

```text
PASS src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts
```

- [ ] **Step 5: Commit the adapter-coverage checkpoint**

```bash
git add src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts
git commit -m "test(projects): add projects adapter regression coverage"
```

## Task 3: Extend The ProjectsScreen Contract And Adapter Output

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useProjectsViewAdapter.ts`
- Test: `src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts`

- [ ] **Step 1: Write the failing adapter assertions for the new render-state contract**

```tsx
it("exposes header actions and semantic badge data for the projects shell", async () => {
  mockGetProjectsByCompany.mockReturnValue([buildProject()]);

  const { result } = renderHook(() => useProjectsViewAdapter({}));

  await waitFor(() => {
    expect(result.current.output.headerActions.showCreateAction).toBe(true);
  });

  expect(result.current.output.headerActions.showUserManagementAction).toBe(true);
  expect(result.current.output.projectItems[0].statusTone).toBe("success");
});
```

- [ ] **Step 2: Run the adapter suite to verify the new contract assertions fail**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts --runInBand
```

Expected:

```text
FAIL src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts
- Property 'headerActions' does not exist on type 'ProjectsScreenViewAdapterOutput'
- Property 'statusTone' does not exist on type 'ProjectsScreenProjectItem'
```

- [ ] **Step 3: Add the minimal contract fields needed to thin the screen**

```ts
export interface ProjectsScreenHeaderActionsModel {
  showCreateAction: boolean;
  showUserManagementAction: boolean;
}

export interface ProjectsScreenProjectItem extends PrimitiveReadyItemBase {
  id: string;
  projectId: string;
  title: string;
  description: string;
  statusValue: ProjectStatus;
  statusLabel: string;
  statusTone: "success" | "info" | "warning" | "neutral" | "danger";
  locationLabel: string;
  memberCountLabel: string;
  clientName: string;
  startDateLabel: string;
  createdByLabel: string;
  leadPmName?: string;
  budgetLabel?: string;
  canEdit: boolean;
}

export interface ProjectsScreenViewAdapterOutput {
  screenId: "ProjectsScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  headerActions: ProjectsScreenHeaderActionsModel;
  searchQuery: string;
  statusFilter: ProjectStatus | "all";
  projectCountLabel: string;
  isRefreshing: boolean;
  isAdmin: boolean;
  projectItems: ProjectsScreenProjectItem[];
  filterOptions: ProjectsScreenFilterOption[];
  emptyState: ProjectsScreenEmptyStateModel;
  editingProject: Project | null;
  isEditModalVisible: boolean;
}
```

- [ ] **Step 4: Implement the matching adapter mapping with no business-logic drift**

```ts
function getProjectStatusTone(
  status: ProjectStatus,
): "success" | "info" | "warning" | "neutral" | "danger" {
  switch (status) {
    case "active":
      return "success";
    case "planning":
      return "info";
    case "on_hold":
      return "warning";
    case "cancelled":
      return "danger";
    case "completed":
    default:
      return "neutral";
  }
}

const output = useMemo<ProjectsScreenViewAdapterOutput>(() => {
  return {
    screenId: "ProjectsScreen",
    readiness: {
      hasInitialFrame: true,
      hasUsableData: Boolean(user),
      isBackgroundRefreshing,
      isNavigationTransitionActive: false,
    },
    continuity: {
      isInitialLoading,
      isBackgroundRefreshing,
      hasCachedFrame: allProjects.length > 0,
      shouldRenderSkeletonShell: false,
      shouldRenderEmptyState: !isLoading && filteredProjects.length === 0,
      freshnessLabel: isBackgroundRefreshing
        ? "Refreshing"
        : isInitialLoading
          ? "Loading"
          : "Ready",
    },
    headerActions: {
      showCreateAction: canAdministerProjects,
      showUserManagementAction: canAdministerProjects,
    },
    searchQuery,
    statusFilter,
    projectCountLabel,
    isRefreshing,
    isAdmin: canAdministerProjects,
    projectItems: filteredProjects.map((project) => ({
      id: `projects:${project.id}`,
      projectId: project.id,
      title: project.name,
      description: project.description,
      statusValue: project.status,
      statusLabel: getStatusLabel(project.status, statusLabels),
      statusTone: getProjectStatusTone(project.status),
      locationLabel: project.location || t.projects.noLocation,
      memberCountLabel: `${getProjectStats(project.id).totalUsers} ${t.projects.members}`,
      clientName: project.clientInfo.name,
      startDateLabel: dateFormatter.formatDateShort(project.startDate),
      createdByLabel: getUserById(project.createdBy)?.name || t.projects.unknown,
      leadPmName: undefined,
      budgetLabel: project.budget
        ? `${t.projects.budget}: $${project.budget.toLocaleString()}`
        : undefined,
      canEdit: canAdministerProjects,
      density: "standard",
      structuralState: filteredProjects.length === 0 ? "empty" : "stale",
    })),
    filterOptions,
    emptyState,
    editingProject,
    isEditModalVisible,
  };
}, [allProjects.length, canAdministerProjects, dateFormatter, editingProject, emptyState, filterOptions, filteredProjects, getProjectStats, getUserById, isBackgroundRefreshing, isEditModalVisible, isInitialLoading, isLoading, isRefreshing, projectCountLabel, searchQuery, statusFilter, statusLabels, t.projects.budget, t.projects.members, t.projects.noLocation, t.projects.unknown, user]);
```

- [ ] **Step 5: Run the adapter suite and commit the contract checkpoint**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts --runInBand
```

Expected:

```text
PASS src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts
```

Commit:

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useProjectsViewAdapter.ts src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts
git commit -m "refactor(projects): add adapter-driven projects shell models"
```

## Task 4: Thin ProjectsScreen With Prop-Driven Leaf UI

**Files:**
- Modify: `src/screens/ProjectsScreen.tsx`
- Create: `src/screens/projects/ProjectsScreenProjectCard.tsx`
- Create: `src/screens/projects/ProjectsScreenFilterChips.tsx`
- Create: `src/screens/projects/ProjectsScreenEmptyState.tsx`
- Test: `src/__tests__/integration/ProjectsScreen.test.tsx`

- [ ] **Step 1: Write the failing integration assertions for the thinner shell’s testIDs and navigation/edit hooks**

```tsx
it("navigates to project detail from the project card", () => {
  const onNavigateToProjectDetail = jest.fn();
  mockUseProjectsViewAdapterReturn({
    projectItems: [buildProjectItem({ projectId: "project-1" })],
  });

  const screen = render(
    <ProjectsScreen
      onNavigateToProjectDetail={onNavigateToProjectDetail}
      onNavigateToCreateProject={jest.fn()}
    />,
  );

  fireEvent.press(screen.getByTestId("projects-card-project-1"));

  expect(onNavigateToProjectDetail).toHaveBeenCalledWith("project-1");
});
```

- [ ] **Step 2: Run the integration suite to verify the shell-seam assertions fail**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/ProjectsScreen.test.tsx --runInBand
```

Expected:

```text
FAIL src/__tests__/integration/ProjectsScreen.test.tsx
- Unable to find an element with testID: projects-card-project-1
```

- [ ] **Step 3: Extract pure leaf components and replace inline screen-owned rendering**

```tsx
export function ProjectsScreenProjectCard({
  project,
  onPress,
  onEdit,
}: {
  project: ProjectsScreenProjectItem;
  onPress: (projectId: string) => void;
  onEdit: (projectId: string) => void;
}) {
  return (
    <View className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
      <Pressable testID={`projects-card-${project.projectId}`} onPress={() => onPress(project.projectId)}>
        <Text className="font-bold text-xl text-gray-900 mb-1">{project.title}</Text>
        <Text className="text-base text-gray-600">{project.description}</Text>
      </Pressable>
      {project.canEdit ? (
        <Pressable
          testID={`projects-edit-${project.projectId}`}
          onPress={() => onEdit(project.projectId)}
          className="w-8 h-8 items-center justify-center bg-blue-50 rounded-lg"
        >
          <Ionicons name="pencil" size={16} color="#3b82f6" />
        </Pressable>
      ) : null}
    </View>
  );
}
```

```tsx
<StandardHeader
  title={t.projects.projects}
  showBackButton={!!onNavigateBack}
  onBackPress={onNavigateBack}
  rightElement={
    output.headerActions.showCreateAction ? (
      <View className="flex-row space-x-2">
        {output.headerActions.showUserManagementAction && onNavigateToUserManagement ? (
          <Pressable
            testID="projects-user-management-action"
            onPress={onNavigateToUserManagement}
            className="w-10 h-10 bg-purple-600 rounded-full items-center justify-center"
          >
            <Ionicons name="people" size={20} color="white" />
          </Pressable>
        ) : null}
        <Pressable
          testID="projects-create-action"
          onPress={onNavigateToCreateProject}
          className="w-10 h-10 bg-blue-600 rounded-full items-center justify-center"
        >
          <Ionicons name="add" size={24} color="white" />
        </Pressable>
      </View>
    ) : undefined
  }
/>
```

- [ ] **Step 4: Run the integration suite to green**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/ProjectsScreen.test.tsx --runInBand
```

Expected:

```text
PASS src/__tests__/integration/ProjectsScreen.test.tsx
```

- [ ] **Step 5: Commit the screen-shell checkpoint**

```bash
git add src/screens/ProjectsScreen.tsx src/screens/projects/ProjectsScreenProjectCard.tsx src/screens/projects/ProjectsScreenFilterChips.tsx src/screens/projects/ProjectsScreenEmptyState.tsx src/__tests__/integration/ProjectsScreen.test.tsx
git commit -m "refactor(projects): thin projects screen shell"
```

## Task 5: Isolate The Edit Modal Only If Behavior Can Stay Exact

**Files:**
- Modify: `src/screens/ProjectsScreen.tsx`
- Create: `src/screens/projects/EditProjectModal.tsx`
- Test: `src/__tests__/integration/ProjectsScreen.test.tsx`

- [ ] **Step 1: Write the failing integration test that freezes edit modal visibility and save delegation**

```tsx
it("renders the edit modal when the adapter exposes an editing project", () => {
  mockUseProjectsViewAdapterReturn({
    isEditModalVisible: true,
    editingProject: buildProjectRecord(),
  });

  const screen = render(
    <ProjectsScreen
      onNavigateToProjectDetail={jest.fn()}
      onNavigateToCreateProject={jest.fn()}
    />,
  );

  expect(screen.getByText("Edit Project")).toBeTruthy();
  expect(screen.getByText("Project Information")).toBeTruthy();
});
```

- [ ] **Step 2: Run the integration suite and verify the modal-freeze assertion fails only if extraction has not happened yet**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/ProjectsScreen.test.tsx --runInBand
```

Expected:

```text
FAIL only if the modal seam is not yet testable through the current screen harness
```

- [ ] **Step 3: Extract the modal behind explicit props if the behavior stays intact**

```tsx
export interface EditProjectModalProps {
  visible: boolean;
  project: Project | null;
  onClose: () => void;
  onSave: (project: Project) => void;
}

export default function EditProjectModal({
  visible,
  project,
  onClose,
  onSave,
}: EditProjectModalProps) {
  // Move the current modal body verbatim first.
  // Only then do the smallest cleanup required for prop-driven reuse.
}
```

```tsx
<EditProjectModal
  visible={output.isEditModalVisible}
  project={output.editingProject}
  onClose={actions.closeEditProject}
  onSave={actions.saveEditedProject}
/>
```

- [ ] **Step 4: If extraction stays safe, rerun the screen suite to green; if it requires redesign, explicitly stop and keep the modal in place**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/ProjectsScreen.test.tsx --runInBand
```

Expected:

```text
PASS src/__tests__/integration/ProjectsScreen.test.tsx
```

- [ ] **Step 5: Commit only if the modal isolation remains behavior-preserving**

```bash
git add src/screens/ProjectsScreen.tsx src/screens/projects/EditProjectModal.tsx src/__tests__/integration/ProjectsScreen.test.tsx
git commit -m "refactor(projects): isolate edit project modal"
```

## Task 6: Final Verification And `S-UI-02A` Checkpoint

**Files:**
- Verify: `src/__tests__/integration/ProjectsScreen.test.tsx`
- Verify: `src/screens/__tests__/ProjectsTasksScreen.test.tsx`
- Verify: `src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts`
- Verify: `src/ui/contracts/viewAdapters.ts`
- Verify: `src/ui/viewAdapters/useProjectsViewAdapter.ts`
- Verify: `src/screens/ProjectsScreen.tsx`

- [ ] **Step 1: Run the focused `S-UI-02A` verification gate**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/ProjectsScreen.test.tsx --runInBand
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/screens/__tests__/ProjectsTasksScreen.test.tsx --runInBand
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts --runInBand
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit
```

Expected:

```text
PASS src/__tests__/integration/ProjectsScreen.test.tsx
PASS src/screens/__tests__/ProjectsTasksScreen.test.tsx
PASS src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts
tsc exits with code 0
```

- [ ] **Step 2: Run diagnostics on touched files and clear any easy linter/type regressions**

Run diagnostics for:

```text
src/screens/ProjectsScreen.tsx
src/ui/viewAdapters/useProjectsViewAdapter.ts
src/ui/contracts/viewAdapters.ts
src/__tests__/integration/ProjectsScreen.test.tsx
src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts
```

Expected:

```text
No newly introduced diagnostics remain in the touched files
```

- [ ] **Step 3: Inspect the staged diff before checkpointing**

Run:

```bash
git status --short
git diff -- src/screens/ProjectsScreen.tsx src/ui/viewAdapters/useProjectsViewAdapter.ts src/ui/contracts/viewAdapters.ts src/__tests__/integration/ProjectsScreen.test.tsx src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts src/screens/projects
```

Expected:

```text
Only the approved `S-UI-02A` files are changed
```

- [ ] **Step 4: Create the `S-UI-02A` checkpoint commit**

```bash
git add src/screens/ProjectsScreen.tsx src/ui/viewAdapters/useProjectsViewAdapter.ts src/ui/contracts/viewAdapters.ts src/__tests__/integration/ProjectsScreen.test.tsx src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts src/screens/projects
git commit -m "refactor(projects): complete phase 4b projects migration"
```

- [ ] **Step 5: Record handoff status for the next slice**

```text
`S-UI-02A` closed:
- ProjectsScreen shell is thinner
- adapter-driven render models are in place
- focused screen and adapter regressions are green
- next slice remains Group B bridge-header convergence as a separate approval step
```

## Self-Review

**Spec coverage**
- behavior freeze line is covered by Tasks 1, 2, and 5
- adapter-shell thinning is covered by Tasks 3 and 4
- focused verification and checkpoint discipline are covered by Task 6

**Placeholder scan**
- no `TODO`, `TBD`, or unresolved “implement later” instructions remain
- each task has explicit files, code, commands, and expected outcomes

**Type consistency**
- `headerActions` and `statusTone` are introduced in Task 3 and consumed consistently in Task 4
- `EditProjectModal` extraction is optional and explicitly guarded behind behavior preservation rather than assumed
