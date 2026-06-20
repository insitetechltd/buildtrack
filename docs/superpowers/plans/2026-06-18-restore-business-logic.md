# Restore Business Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore missing legacy business logic (section filters, subtask grouping, card interactivity) to the modern task view adapters without compromising the primitive UI boundaries.

**Architecture:** Use the existing `ResponsibilityToken` from the Accountability Engine to implement the "Inbox/Outbox/My Work" section filters. Use the existing `buildTaskTree` helper to establish subtask indentation metadata on the view contract. Inject `onPress` callbacks into the view adapter contract to restore task detail navigation.

**Tech Stack:** React Native, Expo, Zustand, Jest

---

### Task 1: Contract Extensions

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/components/primitives/container/ContainerCard.tsx`
- Modify: `src/ui/mappers/tasksMappers.ts`

- [ ] **Step 1: Extend TasksScreenRowItem Contract**
Update `TasksScreenRowItem` to include `indentationLevel` and `onPress`.
```typescript
export interface TasksScreenRowItem extends PrimitiveReadyItemBase {
  id: string;
  taskId: string;
  title: string;
  // ... existing fields ...
  projectName: string;
  isOverdue: boolean;
  indentationLevel?: number;
  onPress?: () => void;
}
```

- [ ] **Step 2: Update ContainerPrimitiveContract and Mapper**
Update `ContainerPrimitiveContract` to support optional indentation and a press callback.
```typescript
// in src/ui/contracts/primitives.ts
export interface ContainerPrimitiveContract {
  primitiveId: string;
  // ...
  indentationLevel?: number;
  onPress?: () => void;
}

// in src/ui/mappers/tasksMappers.ts
export function mapTaskRowToContainerCardProps(data: TasksScreenRowItem): ContainerPrimitiveContract {
  return {
    primitiveId: data.id,
    testId: data.id,
    density: data.density,
    indentationLevel: data.indentationLevel,
    onPress: data.onPress,
    // ... rest of mapping
  }
}
```

- [ ] **Step 3: Update ContainerCard to Apply Indentation and Pressable**
```tsx
export default function ContainerCard({ contract, className }: ContainerCardProps) {
  // ... existing resolution
  const marginClass = contract.indentationLevel === 1 ? 'ml-6' : contract.indentationLevel === 2 ? 'ml-10' : '';
  
  const CardView = contract.onPress ? Pressable : View;

  return (
    <CardView
      testID={resolvedTestId}
      onPress={contract.onPress}
      // ... accessibility props
      className={cn(
        "border bg-white",
        densityClasses.shell,
        stateClasses.shell,
        marginClass,
        className,
      )}
    >
      {/* existing children */}
    </CardView>
  );
}
```

### Task 2: Restore Section Filters via Accountability Engine

**Files:**
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
- Test: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts` (Create if missing, or update `TasksScreen.test.tsx`)

- [ ] **Step 1: Write the failing test**
Create/update a test ensuring that when `projectFilterStore.sectionFilter` is "inbox", only tasks assigned to the user by someone else are returned in the adapter output.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test` on the adapter test.

- [ ] **Step 3: Implement filter logic in adapter**
```typescript
// inside useTasksViewAdapter.ts useMemo
const sectionFilter = projectFilterStore.sectionFilter;

const filteredTasks = tasks.filter((task) => {
  // 1. Project filter
  if (selectedProjectId && task.projectId !== selectedProjectId) return false;
  
  // 2. Section filter logic via ResponsibilityToken / ActorRelationship
  const token = getResponsibilityToken(task, currentUserId);
  const isAssignedToUser = (task.assignedTo ?? []).includes(currentUserId);
  const isOriginator = task.assignedBy === currentUserId && !isAssignedToUser;

  if (sectionFilter === "inbox") {
    // Assigned to me by others
    if (!isAssignedToUser || task.assignedBy === currentUserId) return false;
  } else if (sectionFilter === "outbox") {
    // Assigned by me to others
    if (!isOriginator) return false;
  } else if (sectionFilter === "my_tasks") {
    // Self assigned
    if (!isAssignedToUser || task.assignedBy !== currentUserId) return false;
  } else if (sectionFilter === "my_work") {
    // Inbox + my_tasks
    if (!isAssignedToUser) return false;
  }

  // Handle 'reviewing' specific status filter inversion
  if (projectFilterStore.statusFilter === "reviewing") {
      if (sectionFilter === "inbox" && token !== "AWAITING_APPROVAL") return false;
  }

  return true;
});
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test`

### Task 3: Restore Subtask Grouping

**Files:**
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
- Test: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`

- [x] **Step 1: Write the failing test**
Ensure that given a parent and a child task, the adapter output returns them consecutively with the child having `indentationLevel: 1`.

- [x] **Step 2: Run test to verify it fails**

- [x] **Step 3: Implement tree building in adapter**
Instead of mapping `searchedTasks` directly, use the store's tree building logic.
```typescript
import { buildTaskTree } from "@/state/taskStore.supabase";

// Inside the useMemo, after filtering:
const tree = buildTaskTree(searchedTasks);

// Flatten the tree into an array, tracking indentation
const flatTasks: Array<{task: Task, level: number}> = [];
function flattenNode(node: any, level: number = 0) {
  flatTasks.push({task: node.task, level});
  (node.children || []).forEach(child => flattenNode(child, level + 1));
}
tree.forEach(node => flattenNode(node, 0));

const rows: TasksScreenRowItem[] = flatTasks.map(({task, level}) => {
  // ... existing mapping
  return {
    // ...
    indentationLevel: level > 0 ? level : undefined,
  }
});
```

- [x] **Step 4: Run test to verify it passes**

### Task 4: Restore Interactivity

**Files:**
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
- Modify: `src/screens/TasksScreen.tsx`

- [ ] **Step 1: Update adapter to accept onPress callback**
```typescript
// useTasksViewAdapter.ts
export interface TasksViewAdapterProps {
  onNavigateToTaskDetail?: (taskId: string) => void;
}

export function useTasksViewAdapter(props?: TasksViewAdapterProps): TasksViewAdapterHookResult {
  // ...
  const rows: TasksScreenRowItem[] = flatTasks.map(({task, level}) => {
    return {
      // ...
      onPress: props?.onNavigateToTaskDetail ? () => props.onNavigateToTaskDetail(task.id) : undefined,
    }
  });
}
```

- [ ] **Step 2: Update TasksScreen to pass the callback**
```tsx
// TasksScreen.tsx
const { output, searchInput, setSearchQuery, visibility, actions } = useTasksViewAdapter({
  onNavigateToTaskDetail: props.onNavigateToTaskDetail
});
```

- [ ] **Step 3: Verify TypeScript Compilation**
Run `npx tsc --noEmit` to ensure the contract changes propagate safely.
