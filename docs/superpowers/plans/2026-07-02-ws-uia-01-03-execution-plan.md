# WS-UIA (M-UIA-01..03) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close `WS-UIA / M-UIA-01`, `M-UIA-02`, and `M-UIA-03` by hardening navigation typing + adapter contracts, removing portability footguns, and addressing the top render performance hotspots without changing business behavior.

**Architecture:** Keep the existing screen-driven structure and adapter pattern. Make contract/type changes first, then portability cleanup, then focused performance refactors (FlatList/memoization) with regression gates.

**Tech Stack:** Expo-managed React Native, TypeScript, React Navigation, Zustand, Supabase, Jest.

---

## Files Overview

**Modify**
- `src/navigation/AppNavigator.tsx`
- `src/navigation/createTaskRouteParams.ts`
- `src/navigation/photoShortcutRoutes.ts`
- `src/ui/contracts/viewAdapters.ts`
- `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`
- `src/ui/contracts/screenScoring.ts`
- `documentation/m-fnd-04-ui-migration-wave-matrix.md`
- `src/screens/ProjectsTasksScreen.tsx`
- `src/screens/UserManagementScreen.tsx`

**Create**
- `src/navigation/navigationTypes.ts`
- `documentation/UI_ARCHITECTURE.md`

**Validate**
- `npx tsc --noEmit`
- `npm run test:regression`

---

## Milestone Closure Rules

- Close each milestone with an isolated checkpoint commit after:
  - reviewer pass on the diff (no architecture drift / no behavior regressions),
  - `npx tsc --noEmit` green,
  - `npm run test:regression` green.
- Do not mix dependency changes, build config changes, or unrelated feature work into UIA commits.

---

## Task 1: M-UIA-01 — Navigation Param Typing (All Routes) + Contract Alignment (CreateTask)

**Files:**
- Create: `src/navigation/navigationTypes.ts`
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/navigation/createTaskRouteParams.ts`
- Modify: `src/navigation/photoShortcutRoutes.ts`
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`

- [ ] **Step 1: Create typed ParamLists (`navigationTypes.ts`)**

Create `src/navigation/navigationTypes.ts`:

```ts
import type { NavigatorScreenParams } from "@react-navigation/native";

export type DashboardStackParamList = {
  DashboardMain: undefined;
  TaskDetailFromDashboard: { taskId: string; subTaskId?: string };
  ProjectPicker: { allowBack?: boolean } | undefined;
  UpdateProgress: { taskId: string; subTaskId?: string };
  AddComment: { taskId: string; subTaskId?: string };
  RejectTask: { taskId: string; subTaskId?: string };
  ReassignTask: { taskId: string; subTaskId?: string };
  CreateTask: CreateTaskParams;
  PhotoSelection: PhotoSelectionParams;
  PhotoViewer: PhotoViewerParams;
  PhotoAnnotation: PhotoAnnotationParams;
};

export type TasksStackParamList = {
  TasksList: undefined;
  TaskDetail: { taskId: string; subTaskId?: string };
  CreateTaskFromTask: { parentTaskId?: string; parentSubTaskId?: string; editTaskId?: string } | undefined;
  PhotoViewer: PhotoViewerParams;
  PhotoAnnotation: PhotoAnnotationParams;
  PhotoSelection: PhotoSelectionParams;
  UpdateProgress: { taskId: string; subTaskId?: string };
  AddComment: { taskId: string; subTaskId?: string };
  RejectTask: { taskId: string; subTaskId?: string };
  ReassignTask: { taskId: string; subTaskId?: string };
  CreateTask: CreateTaskParams;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  DeveloperSettings: undefined;
  PendingUsers: undefined;
};

export type ReportsStackParamList = {
  ReportsMain: undefined;
};

export type CreateTaskStackParamList = {
  CreateTaskMain: CreateTaskParams | undefined;
  PhotoSelection: PhotoSelectionParams;
  PhotoViewer: PhotoViewerParams;
  PhotoAnnotation: PhotoAnnotationParams;
};

export type AdminDashboardStackParamList = {
  AdminDashboardMain: undefined;
  ProjectsList: { newProjectId?: string } | undefined;
  ProjectDetail: { projectId: string };
  CreateProject: undefined;
  UserManagement: undefined;
  DevAdmin: undefined;
};

export type RootTabParamList = {
  Dashboard: NavigatorScreenParams<DashboardStackParamList> | undefined;
  Tasks: NavigatorScreenParams<TasksStackParamList> | undefined;
  CreateTask: NavigatorScreenParams<CreateTaskStackParamList> | undefined;
  Reports: NavigatorScreenParams<ReportsStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
  AdminDashboard: NavigatorScreenParams<AdminDashboardStackParamList> | undefined;
};

export type PhotoSelectionParams = {
  returnScreen?: "CreateTask" | "UpdateProgress" | "AddComment";
  actionType?: string;
  parentTaskId?: string;
  parentSubTaskId?: string;
  editTaskId?: string;
  updateTargetSubTaskId?: string;
  selectedPhotos?: unknown[];
  uploadedPhotoUrls?: string[];
};

export type PhotoViewerParams = {
  photos: Array<{ uri?: string; url?: string }>;
  initialIndex?: number;
  allowDelete?: boolean;
  onDelete?: (index: number) => void;
};

export type PhotoAnnotationParams = {
  photoUri: string;
  existingAnnotations?: unknown[];
};

export type CreateTaskParams = {
  parentTaskId?: string;
  parentSubTaskId?: string;
  editTaskId?: string;
  actionType?: string;
  updateTargetSubTaskId?: string;
  sourceTaskId?: string;
  sourceSubTaskId?: string;
  sourceScreen?: "dashboard" | "tasks";
  selectedPhotos?: unknown[];
  uploadedPhotoUrls?: string[];
  clearForm?: boolean;
  _timestamp?: number;
};
```

- [ ] **Step 2: Type the navigators in `AppNavigator.tsx`**

Update `AppNavigator.tsx` to use per-stack typed navigators instead of a single untyped `Stack`.

Key pattern:

```ts
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AdminDashboardStackParamList,
  CreateTaskStackParamList,
  DashboardStackParamList,
  ProfileStackParamList,
  ReportsStackParamList,
  RootTabParamList,
  TasksStackParamList,
} from "./navigationTypes";

const Tab = createBottomTabNavigator<RootTabParamList>();
const DashboardStackNavigator = createNativeStackNavigator<DashboardStackParamList>();
const TasksStackNavigator = createNativeStackNavigator<TasksStackParamList>();
const ProfileStackNavigator = createNativeStackNavigator<ProfileStackParamList>();
const ReportsStackNavigator = createNativeStackNavigator<ReportsStackParamList>();
const CreateTaskStackNavigator = createNativeStackNavigator<CreateTaskStackParamList>();
const AdminDashboardStackNavigator = createNativeStackNavigator<AdminDashboardStackParamList>();
```

Then replace each `<Stack.Navigator>` / `<Stack.Screen>` with the corresponding typed navigator variable for that stack.

- [ ] **Step 3: Replace `route: any` / `navigation: any` wrappers with typed props**

Example wrapper typing shape:

```ts
type DashboardTaskDetailProps = NativeStackScreenProps<
  DashboardStackParamList,
  "TaskDetailFromDashboard"
>;
```

Apply the same pattern for each wrapper:
- `TaskDetailFromDashboardWrapper`
- `TaskDetailScreenWrapper`
- `CreateTaskScreenWrapper`
- `PhotoSelectionScreenWrapper`
- `UpdateProgressScreenWrapper`
- `AddCommentScreenWrapper`
- `RejectTaskScreenWrapper`
- `ReassignTaskScreenWrapper`
- `PhotoViewerScreenWrapper`
- `PhotoAnnotationScreenWrapper`
- `ProjectPickerScreenWrapper`
- `ProjectsListScreen`
- `ProjectDetailScreenWrapper`
- `CreateProjectMainScreen`
- `UserManagementMainScreen`

- [ ] **Step 4: Make navigation helper functions type-safe**

Replace:
- `navigateToProjectPicker(navigation: any, ...)`
- `navigateToCreateTaskRoute(navigation: any, params: Record<string, unknown>)`

With typed signatures based on `RootTabParamList` and stack param lists. Keep runtime behavior unchanged.

- [ ] **Step 5: Align CreateTask adapter contract to standard shape**

Update `CreateTaskScreenViewAdapterOutput` in `src/ui/contracts/viewAdapters.ts` to include:
- `screenId: "CreateTaskScreen"`
- `readiness: NavigationScreenReadiness`
- `continuity: ScreenContinuityContract`

Target shape (match other adapters like `DashboardScreenViewAdapterOutput`):

```ts
export interface CreateTaskScreenViewAdapterOutput {
  screenId: "CreateTaskScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  context: CreateTaskContextModel;
  formData: CreateTaskFormModel;
  errors: Record<string, string>;
  pickers: {
    showDatePicker: boolean;
    showUserPicker: boolean;
    showPriorityPicker: boolean;
    showCategoryPicker: boolean;
    showBillingStatusPicker: boolean;
    showProjectPicker: boolean;
  };
  assigneePicker: {
    availableUsers: CreateTaskAssignableUserModel[];
    userSearchQuery: string;
    filteredUsers: CreateTaskAssignableUserModel[];
    selectedUserIds: string[];
  };
  projects: {
    availableProjects: Project[];
  };
  modals: {
    showEditReasonModal: boolean;
    editReason: string;
  };
  aiAssistant: {
    textInput: string;
    showSuggestionPreview: boolean;
    acceptedFields: Set<string>;
    isProcessing: boolean;
    lastSuggestion: TaskSuggestion | null;
    error: string | null;
  };
}
```

Then update `useCreateTaskViewAdapter.ts` to return the new contract (fill `readiness` and `continuity` using the same patterns already used in other view adapters).

- [ ] **Step 6: Validation gates**

Run:
- `npx tsc --noEmit`
- `npm run test:regression`

Expected:
- `tsc` exits 0
- Jest regression suite passes

- [ ] **Step 7: Checkpoint commit (M-UIA-01)**

```bash
git add src/navigation src/ui
git commit -m "refactor(uia): close m-uia-01 navigation typing and adapter contracts"
```

Update `documentation/ROADMAP.md` status for `WS-UIA / M-UIA-01` to `Closed` and commit that as a separate `docs(roadmap)` commit.

---

## Task 2: M-UIA-02 — Portability Cleanup + Parallel-Work Separation Rules

**Files:**
- Modify: `src/ui/contracts/screenScoring.ts`
- Modify: `documentation/m-fnd-04-ui-migration-wave-matrix.md`
- Create: `documentation/UI_ARCHITECTURE.md`

- [ ] **Step 1: Replace absolute repo paths with repo-relative paths**

In `src/ui/contracts/screenScoring.ts`, change the inventory field from repo-absolute paths to repo-relative paths:

- Change `absolutePath: "/Volumes/.../src/screens/X.tsx"` → `repoPath: "src/screens/X.tsx"`
- Update the interface accordingly.

- [ ] **Step 2: Update the wave matrix doc to use repo-relative paths**

In `documentation/m-fnd-04-ui-migration-wave-matrix.md`, replace `/Volumes/KooDrive/Insite App/src/screens/...` with `src/screens/...`.

- [ ] **Step 3: Add canonical UI architecture ownership rules**

Create `documentation/UI_ARCHITECTURE.md` that clearly states:
- what belongs in `src/screens/` vs `src/ui/viewAdapters/` vs `src/state/` vs `src/api/`
- the contract expectation: adapters output `screenId/readiness/continuity`
- parallel-work separation: no mixing screen UI work with store persistence logic in the same change unless required
- navigation typing expectations (ParamLists are the source of truth)

- [ ] **Step 4: Validation gates**

Run:
- `npx tsc --noEmit`
- `npm run test:regression`

- [ ] **Step 5: Checkpoint commit (M-UIA-02)**

```bash
git add src/ui/contracts documentation
git commit -m "refactor(uia): close m-uia-02 portability and ownership rules"
```

Update `documentation/ROADMAP.md` status for `WS-UIA / M-UIA-02` to `Closed` and commit that as a separate `docs(roadmap)` commit.

---

## Task 3: M-UIA-03 — Render Performance Hotspots (Virtualized Lists)

**Files:**
- Modify: `src/screens/ProjectsTasksScreen.tsx`
- Modify: `src/screens/UserManagementScreen.tsx`

- [ ] **Step 1: Convert ProjectsTasks task list ScrollView to FlatList**

Target hotspot reference:
- `ScrollView` rendering `{allTasks.map(...)}` in [ProjectsTasksScreen.tsx](file:///Volumes/KooDrive/Insite%20App/src/screens/ProjectsTasksScreen.tsx#L625-L665)

Implementation notes:
- Replace the map-rendered list with:
  - `FlatList`
  - stable `keyExtractor`
  - `renderItem` memoized via `useCallback`
  - move any “header” UI into `ListHeaderComponent`

- [ ] **Step 2: Convert UserManagement user list ScrollView to FlatList**

Target hotspot reference:
- `ScrollView` rendering `{output.userCards.map(...)}` in [UserManagementScreen.tsx](file:///Volumes/KooDrive/Insite%20App/src/screens/UserManagementScreen.tsx#L305-L349)

Implementation notes:
- Replace map-rendered list with `FlatList`
- Preserve any existing filtering/search behavior
- Preserve empty/loading state behavior

- [ ] **Step 3: Validation gates**

Run:
- `npx tsc --noEmit`
- `npm run test:regression`

Manual smoke:
- open Tasks list, scroll rapidly, open a task, go back
- open User Management (admin), scroll list, open user actions, go back

- [ ] **Step 4: Checkpoint commit (M-UIA-03)**

```bash
git add src/screens
git commit -m "perf(uia): close m-uia-03 virtualize heavy lists"
```

Update `documentation/ROADMAP.md` status for `WS-UIA / M-UIA-03` to `Closed` and commit that as a separate `docs(roadmap)` commit.
