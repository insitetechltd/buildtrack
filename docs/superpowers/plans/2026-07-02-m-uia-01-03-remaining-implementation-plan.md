# WS-UIA (M-UIA-01..03) Remaining Work — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining `WS-UIA / M-UIA-01`, `M-UIA-02`, and `M-UIA-03` work by removing remaining `any`-typed navigation wrappers/helpers, applying portability fixes, converting the specified heavy `ScrollView + map` lists to `FlatList`, and verifying via `tsc` + regression tests.

**Architecture:** Keep existing screen-driven + wrapper navigation architecture. Changes are limited to typing improvements, portability of scoring/docs paths, and list virtualization. Runtime behavior must remain unchanged.

**Tech Stack:** Expo-managed React Native, TypeScript, React Navigation, Zustand, Supabase, Jest.

---

## Files Overview

**Modify**
- `src/navigation/AppNavigator.tsx`
- `src/screens/CreateTaskScreen.tsx` (only to remove `useNavigation<any>()` typing if feasible without behavior change)
- `src/ui/contracts/screenScoring.ts`
- `documentation/m-fnd-04-ui-migration-wave-matrix.md`
- `src/screens/ProjectsTasksScreen.tsx`
- `src/screens/UserManagementScreen.tsx`

**Create**
- `documentation/UI_ARCHITECTURE.md`

**Validate**
- `npx tsc --noEmit`
- `npm run test:regression`

---

## Task 1: M-UIA-01 — Navigation Wrapper Type Safety + Remove Verbose Tracing Logs

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`
- Modify (optional): `src/screens/CreateTaskScreen.tsx`

### Step 1: Remove verbose navigation/photo tracing logs from AppNavigator

- [ ] Remove high-volume `console.log(...)` tracing blocks introduced for debugging (e.g. those prefixed with `📸` / `📦` or banner-style separators).
- [ ] Keep any existing error-only logging patterns if present (e.g. `console.error` on catch blocks) and do not add new logs.

Expected result:
- Normal navigation/photo flows no longer spam the JS console.

### Step 2: Make navigation helper functions type-safe (no `any[]` varargs)

- [ ] Replace `navigateToProjectPicker(...)` navigation parameter shape with a typed union that supports:
  - stack `navigation.navigate("ProjectPicker", ...)`
  - tab parent navigation `parent.navigate("Dashboard", { screen: "ProjectPicker", params: ... })`
- [ ] Replace `navigateToCreateTaskRoute(...)` navigation parameter shape with a typed union that supports:
  - navigating within the CreateTask stack (`"CreateTaskMain"`)
  - navigating via the CreateTask tab parent (`parent.navigate("CreateTask", { screen: "CreateTaskMain", params })`)
  - legacy fallback to `"CreateTask"` when present in the current routeNames

Implementation shape (use existing `RootTabParamList` / stack param lists):

```ts
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type {
  RootTabParamList,
  DashboardStackParamList,
  CreateTaskStackParamList,
  CreateTaskParams,
} from "./navigationTypes";

type RouteStateLike = { routeNames?: string[] };

type RootTabLikeNavigation = Pick<
  BottomTabNavigationProp<RootTabParamList>,
  "navigate"
>;

type ProjectPickerNavigation = {
  navigate: BottomTabNavigationProp<DashboardStackParamList>["navigate"];
  getParent?: () => RootTabLikeNavigation | undefined;
  getState?: () => RouteStateLike;
};

type CreateTaskRouteNavigation = {
  navigate:
    | BottomTabNavigationProp<DashboardStackParamList>["navigate"]
    | BottomTabNavigationProp<CreateTaskStackParamList>["navigate"];
  getParent?: () => RootTabLikeNavigation | undefined;
  getState?: () => RouteStateLike;
};
```

Expected result:
- No `navigate: (...args: any[]) => void` remains in `navigateToProjectPicker` / `navigateToCreateTaskRoute`.

### Step 3: Type wrapper props that still use `any` navigation surfaces

- [ ] Update wrapper prop typing for:
  - `PhotoViewerScreenWrapper`
  - `PhotoAnnotationScreenWrapper`
  - `PhotoSelectionScreenWrapper`
  - `CreateTaskScreenWrapper`
  - `UpdateProgressScreenWrapper`
  - `AddCommentScreenWrapper`
  - `RejectTaskScreenWrapper`
  - `ReassignTaskScreenWrapper`

Use `NativeStackScreenProps<...>` per the actual stack they are registered in.

Example pattern:

```ts
type PhotoSelectionProps = NativeStackScreenProps<
  DashboardStackParamList,
  "PhotoSelection"
>;

function PhotoSelectionScreenWrapper({ route, navigation }: PhotoSelectionProps) {
  // ...
}
```

Expected result:
- No wrapper uses ad-hoc `navigate: (...args: any[]) => void` types.

### Step 4 (Optional): Remove `useNavigation<any>()` in CreateTaskScreen

- [ ] If feasible without touching behavior, replace `useNavigation<any>()` with typed navigation:

```ts
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { DashboardStackParamList } from "@/navigation/navigationTypes";

const navigation = useNavigation<NativeStackNavigationProp<DashboardStackParamList>>();
```

Notes:
- If CreateTaskScreen is used in multiple stacks (Dashboard + CreateTask stack), prefer a safe union type or keep existing typing if it explodes scope.
- Do not change runtime navigation logic in CreateTaskScreen.

### Step 5: Validation gate for M-UIA-01

- [ ] Run: `npx tsc --noEmit`
  - Expected: exit code 0
- [ ] Run: `npm run test:regression`
  - Expected: PASS

### Step 6: Commit-ready checkpoint (do not execute unless user requests)

```bash
git add src/navigation src/screens
git commit -m "refactor(uia): close m-uia-01 navigation typing and remove tracing logs"
```

---

## Task 2: M-UIA-02 — Portability Cleanup + Canonical UI Architecture Rules

**Files:**
- Modify: `src/ui/contracts/screenScoring.ts`
- Modify: `documentation/m-fnd-04-ui-migration-wave-matrix.md`
- Create: `documentation/UI_ARCHITECTURE.md`

### Step 1: Replace absolute paths with repo-relative paths in scoring inventory

- [ ] In `src/ui/contracts/screenScoring.ts`, change:
  - `absolutePath: string` -> `repoPath: string`
  - each inventory entry value to `repoPath: "src/screens/<Name>.tsx"`

Example:

```ts
export interface ScreenMigrationInventoryEntry {
  screenId: ScreenMigrationCandidateId;
  repoPath: string;
  scores: ScreenMigrationDimensionScores;
}

export const SCREEN_MIGRATION_INVENTORY: Record<
  ScreenMigrationCandidateId,
  ScreenMigrationInventoryEntry
> = {
  DashboardScreen: {
    screenId: "DashboardScreen",
    repoPath: "src/screens/DashboardScreen.tsx",
    scores: { /* unchanged */ },
  },
  // ...
};
```

Expected result:
- No machine-specific `/Volumes/...` paths remain in this file.

### Step 2: Update wave matrix doc to use repo-relative paths

- [ ] In `documentation/m-fnd-04-ui-migration-wave-matrix.md`, replace all `/Volumes/KooDrive/Insite App/src/...` references with `src/...`.

Expected result:
- Document is portable across machines and CI.

### Step 3: Create documentation/UI_ARCHITECTURE.md

- [ ] Create `documentation/UI_ARCHITECTURE.md` that states:
  - Ownership boundaries: `src/screens/` vs `src/ui/viewAdapters/` vs `src/state/` vs `src/api/`
  - Contract expectations: adapters output `screenId/readiness/continuity` where applicable
  - Parallel-work separation rule: avoid mixing view work with store persistence changes unless required
  - Navigation typing expectation: `src/navigation/navigationTypes.ts` is the source of truth

### Step 4: Validation gate for M-UIA-02

- [ ] Run: `npx tsc --noEmit`
  - Expected: exit code 0
- [ ] Run: `npm run test:regression`
  - Expected: PASS

### Step 5: Commit-ready checkpoint (do not execute unless user requests)

```bash
git add src/ui/contracts documentation
git commit -m "refactor(uia): close m-uia-02 portability and ownership rules"
```

---

## Task 3: M-UIA-03 — Render Performance Hotspots (Virtualized Lists)

**Files:**
- Modify: `src/screens/ProjectsTasksScreen.tsx`
- Modify: `src/screens/UserManagementScreen.tsx`

### Step 1: Convert ProjectsTasksScreen task list ScrollView+map to FlatList

- [ ] Locate the task list rendering block in `src/screens/ProjectsTasksScreen.tsx` (ScrollView + `.map(...)`).
- [ ] Replace the mapped children with a `FlatList`.
- [ ] Move any existing “top of list” UI into `ListHeaderComponent`.
- [ ] Use a stable `keyExtractor` based on the existing item id (or equivalent).
- [ ] Memoize `renderItem` with `useCallback` if it closes over stable values.

Implementation shape:

```ts
<FlatList
  data={allTasks}
  keyExtractor={(item) => item.id}
  renderItem={renderTaskRow}
  ListHeaderComponent={header}
  ListFooterComponent={<View style={{ height: 24 }} />}
/>
```

Notes:
- Preserve existing spacing/margins by wrapping row content with the same container View(s) used today.
- Preserve existing empty state behavior (use `ListEmptyComponent` if needed).

### Step 2: Convert UserManagementScreen user list ScrollView+map to FlatList

- [ ] Locate `{output.userCards.map(...)}` inside `ScrollView` in `src/screens/UserManagementScreen.tsx`.
- [ ] Replace with `FlatList` using `output.userCards` as `data`.
- [ ] Preserve filtering/search behavior (do not change adapter output).
- [ ] Preserve empty/loading UI (use `ListEmptyComponent` and conditionals).

Implementation shape:

```ts
<FlatList
  data={output.userCards}
  keyExtractor={(item) => item.primitiveId}
  renderItem={renderUserCard}
  contentContainerStyle={{ paddingBottom: 24 }}
/>
```

### Step 3: Validation gate for M-UIA-03

- [ ] Run: `npx tsc --noEmit`
  - Expected: exit code 0
- [ ] Run: `npm run test:regression`
  - Expected: PASS

### Step 4: Commit-ready checkpoint (do not execute unless user requests)

```bash
git add src/screens
git commit -m "perf(uia): close m-uia-03 virtualize heavy lists"
```

---

## End-to-End Verification Summary (final)

- [ ] Confirm `AppNavigator.tsx` no longer contains high-volume tracing logs.
- [ ] Confirm `src/ui/contracts/screenScoring.ts` and `documentation/m-fnd-04-ui-migration-wave-matrix.md` have no machine-specific paths.
- [ ] Confirm the two specified heavy lists are `FlatList`-backed.
- [ ] Re-run:
  - `npx tsc --noEmit`
  - `npm run test:regression`

