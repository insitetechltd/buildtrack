# TaskDetailScreen Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the `TaskDetailScreen` to use the new UI Contracts and View Adapter architecture while maintaining strict legacy parity.

**Architecture:** We will extract all state, formatting, and conditional business logic (like Accept/Decline visibility) into `useTaskDetailViewAdapter.ts`. The adapter will return UI Contracts (`TaskDetailScreenViewAdapterOutput`). A mapper (`taskDetailMappers.ts`) will translate these to Primitive components. Finally, `TaskDetailScreen.tsx` will be rewritten as a dumb presentation layer.

**Tech Stack:** React Native, Expo, Zustand, Jest, React Native Testing Library.

---

### Task 1: Enhance View Adapter Contracts

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`

- [ ] **Step 1: Write the failing test (Contract definition)**
There are no tests for types, but we define the exact interfaces needed for the banners, activity feed, and assignments.

- [ ] **Step 2: Implement the contract extensions**
Add explicit types for the banners, activities, and subtasks to `TaskDetailScreenViewAdapterOutput`.

```typescript
// Add to src/ui/contracts/viewAdapters.ts

export interface TaskDetailBannerModel extends PrimitiveReadyItemBase {
  id: string;
  type: 'submitted_for_review' | 'review_required' | 'approved' | 'declined' | 'rejected';
  title: string;
  subtitle?: string;
  iconName: string;
  colorScheme: 'amber' | 'green' | 'red';
}

export interface TaskDetailActivityModel extends PrimitiveReadyItemBase {
  id: string;
  userId: string;
  userName: string;
  activityType: string;
  timestamp: string;
  description: string;
  reason?: string;
  completionPercentage?: number;
  statusToken?: StatusSemanticToken;
  statusLabel?: string;
  photos: string[];
}

export interface TaskDetailAssigneeModel {
  id: string;
  name: string;
  phone?: string;
  isCurrentUser: boolean;
}

// Update TaskDetailScreenViewAdapterOutput to include:
// banners: TaskDetailBannerModel[];
// activities: TaskDetailActivityModel[];
// assigners: TaskDetailAssigneeModel[];
// assignees: TaskDetailAssigneeModel[];
// childTasks: TasksScreenRowItem[];
```

- [ ] **Step 3: Commit**
```bash
git add src/ui/contracts/viewAdapters.ts
git commit -m "feat: enhance TaskDetail contracts for modernization"
```

### Task 2: Create the TaskDetail View Adapter

**Files:**
- Create: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Test: `src/__tests__/integration/TaskDetailAdapter.test.ts`

- [ ] **Step 1: Write the failing test**
```typescript
import { renderHook } from '@testing-library/react-hooks';
import { useTaskDetailViewAdapter } from '../../../src/ui/viewAdapters/useTaskDetailViewAdapter';

// Mock dependencies...
describe('useTaskDetailViewAdapter', () => {
  it('should return loading state initially', () => {
    // Test implementation
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx jest src/__tests__/integration/TaskDetailAdapter.test.ts`
Expected: FAIL (file doesn't exist)

- [ ] **Step 3: Write minimal implementation**
Extract the logic from `TaskDetailScreen.tsx` into `useTaskDetailViewAdapter.ts`.

```typescript
// Implement useTaskDetailViewAdapter hook.
// Key extractions:
// 1. String(id) matching for isAssignedToMe and isTaskCreator.
// 2. Banner visibility rules (submitted_for_review, approved, declined, rejected).
// 3. Action Items logic (Accept/Decline vs Approve/Reject vs Update Progress).
// 4. Activity feed parsing and flattening.
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npx jest src/__tests__/integration/TaskDetailAdapter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/__tests__/integration/TaskDetailAdapter.test.ts
git commit -m "feat: implement useTaskDetailViewAdapter"
```

### Task 3: Create Task Detail Mappers

**Files:**
- Create: `src/ui/mappers/taskDetailMappers.ts`

- [ ] **Step 1: Implement the mappers**
```typescript
import type { TaskDetailActionItem } from "../contracts/viewAdapters";
import type { ButtonPrimitiveContract } from "../contracts/primitives";

export function mapActionItemToButtonProps(item: TaskDetailActionItem): ButtonPrimitiveContract {
  return {
    primitiveId: item.id,
    label: item.label,
    icon: item.icon,
    isDisabled: item.isDisabled,
    density: item.density,
    structuralState: item.structuralState,
    onPress: () => {}, // Bound at the UI layer
  };
}
// Add mappers for Banners, Activities, etc.
```

- [ ] **Step 2: Commit**
```bash
git add src/ui/mappers/taskDetailMappers.ts
git commit -m "feat: add task detail mappers"
```

### Task 4: Refactor TaskDetailScreen

**Files:**
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Rewrite TaskDetailScreen**
Replace the 2500 lines of complex state logic with the adapter and primitives.

```tsx
import React from "react";
import { View, ScrollView } from "react-native";
import { useTaskDetailViewAdapter } from "@/ui/viewAdapters/useTaskDetailViewAdapter";
// ... imports

export default function TaskDetailScreen(props: TaskDetailScreenProps) {
  const { output, actions } = useTaskDetailViewAdapter({
    taskId: props.taskId,
    subTaskId: props.subTaskId
  });

  // Render using primitives mapping...
  return (
    <View>
       {/* Render Banners */}
       {/* Render Details */}
       {/* Render Activities */}
       {/* Render Actions (Accept/Decline, etc) bound to `actions.acceptTask`, etc. */}
    </View>
  );
}
```

- [ ] **Step 2: Update existing regression test**
Modify `TaskDetailAcceptanceUI.test.tsx` to query the new Primitive UI structure if necessary, ensuring the Interaction Binding Checks remain green.

- [ ] **Step 3: Run test to verify it passes**
Run: `npx tsc --noEmit && npx jest src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/screens/TaskDetailScreen.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
git commit -m "refactor: modernize TaskDetailScreen to use View Adapter"
```
