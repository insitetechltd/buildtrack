# S-UX-01E Compact Project Task Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy flat project task list with the approved compact, collapsible project-scoped task surface while preserving fast drill-in, filtering, and create-task entry behavior.

**Architecture:** Keep `TasksScreen` as the current route and preserve the existing project filter store plus task-tree logic, but change the adapter output from a flat row list to grouped compact sections keyed by project container context. Deliver the slice as an adapter contract update, a compact section-based screen layout, and focused regression coverage instead of redesigning task detail or task creation in the same pass.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript, Zustand, React Navigation, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/ui/contracts/viewAdapters.ts`
  Extend the Tasks screen contract with compact grouped-section models and section-level metrics.

- `src/ui/viewAdapters/useTasksViewAdapter.ts`
  Derive active-project-only compact groups, collapsible metadata, and compact row output from the existing task store and filter store.

- `src/screens/TasksScreen.tsx`
  Recompose the Tasks screen into compact collapsible sections while preserving search, project picker, and create-task entry points.

- `src/ui/mappers/tasksMappers.ts`
  Reuse existing task card mapping where possible and support compact density for the redesigned section rows.

### Tests to add or modify

- `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
  Add focused adapter tests for active-project-only grouping, compact section order, and collapse semantics.

- `src/screens/__tests__/TasksScreen.test.tsx`
  Update the screen test to assert compact grouped sections instead of a flat legacy list.

- `src/__tests__/integration/TasksScreenInteraction.test.tsx`
  Preserve search, section-filter buttons, project picker, and create-task behavior through the redesigned screen.

### Docs to update after implementation

- `documentation/ROADMAP.md`
  Mark `WS-UX / M-UX-01 / S-UX-01E` closed only after implementation, review, and validation pass.

- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
  Add closure evidence for `S-UX-01E`.

## Task 1: Write the failing compact-surface tests

**Files:**
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`
- Modify: `src/__tests__/integration/TasksScreenInteraction.test.tsx`

- [ ] **Step 1: Add the failing adapter test for active-project compact grouping**

```ts
it("groups visible tasks into compact collapsible sections for the active project only", () => {
  const { result } = renderHook(() => useTasksViewAdapter());

  expect(result.current.output.compactSections.map((section) => section.title)).toEqual([
    "Uncontainered Tasks",
    "Level 12",
  ]);
  expect(result.current.output.compactSections.every((section) => section.projectId === "project-1")).toBe(true);
});
```

- [ ] **Step 2: Add the failing screen test for compact section rendering**

```tsx
it("renders compact task sections instead of the legacy flat task list", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.getByText("All Tasks")).toBeTruthy();
  expect(screen.getByTestId("tasks-screen__section_section-uncontainered")).toBeTruthy();
  expect(screen.queryByTestId("tasks-screen__list")).toBeNull();
});
```

- [ ] **Step 3: Add the failing interaction test for collapse/expand behavior**

```tsx
it("toggles a compact section open and closed", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  fireEvent.press(screen.getByTestId("tasks-screen__section_toggle_section-level-12"));
  expect(screen.queryByTestId("container-card:task-level-12")).toBeNull();
});
```

- [ ] **Step 4: Run the focused Tasks tests to verify they fail**

Run: `npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx src/__tests__/integration/TasksScreenInteraction.test.tsx --runInBand`

Expected: FAIL because the current implementation still returns a flat task row list and the current screen still renders the legacy `FlatList`.

## Task 2: Extend the Tasks adapter contract for compact collapsible sections

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`

- [ ] **Step 1: Add compact section models to the Tasks contract**

```ts
export interface TasksCompactSection {
  id: string;
  projectId: string;
  title: string;
  subtitle?: string;
  taskCountLabel: string;
  isCollapsed: boolean;
  rows: TasksScreenRowItem[];
}
```

```ts
export interface TasksScreenViewAdapterOutput {
  screenId: "TasksScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  filterSummary: TasksFilterSummary;
  compactSections: TasksCompactSection[];
  taskRowItems: TasksScreenRowItem[];
  scalarMetrics: TasksScalarMetrics;
}
```

- [ ] **Step 2: Add local collapsed-section state to the Tasks adapter**

```ts
const [collapsedSectionIds, setCollapsedSectionIds] = useState<string[]>([]);

const toggleSection = (sectionId: string) => {
  setCollapsedSectionIds((current) =>
    current.includes(sectionId)
      ? current.filter((id) => id !== sectionId)
      : [...current, sectionId],
  );
};
```

- [ ] **Step 3: Group searched tasks by active-project container context**

```ts
const groupedSections = groupTasksForCompactSurface({
  tasks: searchedTasks,
  selectedProjectId,
  projectStore,
  collapsedSectionIds,
  onNavigateToTaskDetail: props?.onNavigateToTaskDetail,
});
```

- [ ] **Step 4: Keep compact rows dense but still drillable**

```ts
return {
  id: `tasks-row:${task.id}`,
  taskId: task.id,
  title: task.title,
  onPress: props?.onNavigateToTaskDetail ? () => props.onNavigateToTaskDetail?.(task.id) : undefined,
  statusToken: mapTaskStatusToToken(task.status),
  statusLabel: formatTaskStatusLabel(task.status),
  responsibilityToken: getResponsibilityToken(task, currentUserId),
  priorityLabel: formatPriority(task.priority),
  dueDateLabel: task.dueDate ? task.dueDate.slice(0, 10) : undefined,
  assigneeSummary: buildAssigneeSummary(task),
  projectName: project?.name ?? "Project",
  isOverdue: isTaskOverdue(task),
  attachmentUris: Array.isArray(task.attachments) ? task.attachments : [],
  indentationLevel: level > 0 ? level : undefined,
  density: "compact",
  structuralState,
};
```

- [ ] **Step 5: Re-run the adapter test**

Run: `npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts --runInBand`

Expected: PASS

## Task 3: Recompose `TasksScreen` into compact collapsible sections

**Files:**
- Modify: `src/screens/TasksScreen.tsx`
- Modify: `src/ui/mappers/tasksMappers.ts`

- [ ] **Step 1: Replace the legacy flat list with section rendering**

```tsx
<ScrollView testID="tasks-screen__scroll" className="flex-1 px-4">
  {output.compactSections.map((section) => (
    <View
      key={section.id}
      testID={`tasks-screen__section_${section.id}`}
      className="mb-4 rounded-3xl bg-white p-4"
    >
      <Pressable
        testID={`tasks-screen__section_toggle_${section.id}`}
        onPress={() => actions.toggleSection(section.id)}
        className="flex-row items-center justify-between"
      >
        <View>
          <Text className="text-base font-semibold text-slate-900">{section.title}</Text>
          <Text className="mt-1 text-sm text-slate-500">{section.taskCountLabel}</Text>
        </View>
        <Ionicons
          name={section.isCollapsed ? "chevron-down" : "chevron-up"}
          size={18}
          color="#475569"
        />
      </Pressable>

      {!section.isCollapsed ? (
        <View className="mt-3 gap-3">
          {section.rows.map((row) => (
            <ContainerCard key={row.taskId} contract={mapTaskRowToContainerCardProps(row)} />
          ))}
        </View>
      ) : null}
    </View>
  ))}
</ScrollView>
```

- [ ] **Step 2: Keep the existing search/filter/project-picker controls intact**

```tsx
<TextField contract={searchContract} onChangeText={setSearchQuery} />
<Pressable testID="tasks-screen__header_project_picker" onPress={() => props.onNavigateToProjectPicker?.(true)} />
<Pressable testID="tasks-screen__fab_create_task" onPress={props.onNavigateToCreateTask} />
```

- [ ] **Step 3: Make task cards visually compact through the mapper**

```ts
export function mapTaskRowToContainerCardProps(data: TasksScreenRowItem): ContainerPrimitiveContract {
  return {
    ...existingContractFields,
    density: data.density ?? "compact",
  };
}
```

- [ ] **Step 4: Re-run the screen and interaction tests**

Run: `npx jest src/screens/__tests__/TasksScreen.test.tsx src/__tests__/integration/TasksScreenInteraction.test.tsx --runInBand`

Expected: PASS

## Task 4: Validate, close docs, and checkpoint the slice

**Files:**
- Modify: `documentation/ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`

- [ ] **Step 1: Run focused slice validation**

Run: `npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx src/__tests__/integration/TasksScreenInteraction.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Mark `S-UX-01E` closed in the canonical docs**

```md
| WS-UX / M-UX-01 / S-UX-01E | Compact project task surface | Closed | S-UX-01D | 14.5 | ../docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md |
```

```md
| WS-UX / M-UX-01 / S-UX-01E | Compact project task surface | Closed | Rolled out the approved compact and collapsible project task list while preserving search, filters, and drill-in behavior. |
```

- [ ] **Step 3: Create the slice checkpoint commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTasksViewAdapter.ts src/screens/TasksScreen.tsx src/ui/mappers/tasksMappers.ts src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx src/__tests__/integration/TasksScreenInteraction.test.tsx documentation/ROADMAP.md docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-04-s-ux-01e-compact-project-task-surface.md
git commit -m "feat(ux): roll out compact project task surface"
```

## Spec Coverage Check

- Compact/collapsible task surface: covered by Tasks 1 through 3
- Active-project-only grouping: covered by Tasks 1 and 2
- Preserve search, filters, drill-in, and create-task entry: covered by Tasks 3 and 4
- Roadmap-first closure evidence: covered by Task 4

## Placeholder Scan

- No `TBD` / `TODO`
- No implicit follow-up tasks hidden inside “refine later”
- Each step includes exact files, commands, and expected outcomes

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-04-s-ux-01e-compact-project-task-surface.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Minimal-interaction directive already established: continue inline unless blocked by a real execution issue or governance conflict.
