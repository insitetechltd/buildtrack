---
alwaysApply: false
description: Use this rule when editing task-management features, task screens, task stores, task navigation, or task-related Supabase integrations.
---
# Task Domain Rule

## Primary Files

- `src/state/taskStore.supabase.ts`
- `src/screens/TasksScreen.tsx`
- `src/screens/TaskDetailScreen.tsx`
- `src/screens/CreateTaskScreen.tsx`
- `src/screens/UpdateProgressScreen.tsx`
- `src/screens/AddCommentScreen.tsx`
- `src/screens/RejectTaskScreen.tsx`
- `src/navigation/AppNavigator.tsx`

## Domain Expectations

- Preserve current task workflow semantics: creation, assignment, acceptance, decline, progress updates, review submission, approval, rejection, comments, archive, cancel, delete, and subtask nesting.
- When updating task behavior, inspect both store logic and the screen flow that triggers it.
- Keep backend changes consistent with the current Supabase schema and activity/update model already present in the repository.
- Prefer incremental changes over replacing the task flow wholesale.

## Data Handling

- Reuse the existing task mapping and persistence helpers where possible.
- Be careful with optimistic updates, realtime refresh behavior, and cached persisted state.
- If a change affects task activities, comments, progress logs, or edit history, check for related documentation and migration notes in the repository before changing schema assumptions.

## Validation

- When task behavior changes, run or suggest the smallest targeted test or manual flow that covers the affected workflow.
