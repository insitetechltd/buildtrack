# CreateTaskScreen Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize `CreateTaskScreen` by extracting its massive internal state, complex validation, AI assistant integration, and draft persistence logic into a standalone View Adapter, leaving the UI layer purely presentational using primitive components.

**Architecture:** 
- Extract form state, draft persistence (`AsyncStorage`), photo uploads, and user assignments into `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`.
- Define the contract `CreateTaskScreenViewAdapterOutput` in `src/ui/contracts/viewAdapters.ts`.
- Refactor `src/screens/CreateTaskScreen.tsx` to consume the adapter and map the output to UI Primitives.
- Note: `CreateTaskScreen.tsx` currently contains an embedded `TaskActionScreen` which handles legacy routes for `update`, `photos`, `comment`, `reassign`. We will preserve this embedded component as-is within the file to avoid breaking legacy navigation routing, but we will fully modernize the main `CreateTaskScreen` export.

**Tech Stack:** React Native, Expo, Zustand, Supabase, AsyncStorage.

---

### Task 1: Define View Adapter Contracts

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`

- [ ] **Step 1: Add CreateTask Form Models**

```typescript
// Append to src/ui/contracts/viewAdapters.ts
export interface CreateTaskFormModel {
  title: string;
  description: string;
  taskReference: string;
  billingStatus: string;
  priority: string;
  category: string;
  dueDate: Date;
  assignedTo: string[];
  projectId: string;
  attachments: any[]; // Or Attachment type
}

export interface CreateTaskScreenViewAdapterOutput {
  readiness: {
    isSubmitting: boolean;
    isLoadingUsers: boolean;
    isUploading: boolean;
  };
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
  aiAssistant: {
    textInput: string;
    showSuggestionPreview: boolean;
    acceptedFields: Record<string, boolean>;
    isProcessing: boolean;
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts
git commit -m "feat: add CreateTaskScreenViewAdapterOutput contract"
```

### Task 2: Create View Adapter implementation

**Files:**
- Create: `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`

- [ ] **Step 1: Implement useCreateTaskViewAdapter**

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTaskStore } from '../../state/taskStore.supabase';
import { useAuthStore } from '../../state/authStore';
import { useProjectStoreWithCompanyInit } from '../../state/projectStore.supabase';
import { useFileUpload } from '../../utils/useFileUpload';
import { usePhotoSelection } from '../../utils/usePhotoSelection';
import { useTaskLLMAssistant } from '../../hooks/useTaskLLMAssistant';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CreateTaskScreenViewAdapterOutput, CreateTaskFormModel } from '../contracts/viewAdapters';

export interface UseCreateTaskViewAdapterProps {
  editTaskId?: string;
  parentTaskId?: string;
  parentSubTaskId?: string;
  clearForm?: boolean;
}

export function useCreateTaskViewAdapter({
  editTaskId,
  parentTaskId,
  parentSubTaskId,
  clearForm
}: UseCreateTaskViewAdapterProps) {
  // 1. Setup states matching CreateTaskScreenViewAdapterOutput
  // 2. Setup AI Assistant
  // 3. Setup File Upload
  // 4. Setup Draft Persistence logic
  // 5. Setup submit logic
  
  // (Subagent should carefully extract the state logic from CreateTaskScreen.tsx here)
  
  return {
    output: {
      readiness: { isSubmitting: false, isLoadingUsers: false, isUploading: false },
      formData: {} as CreateTaskFormModel,
      errors: {},
      pickers: {
        showDatePicker: false,
        showUserPicker: false,
        showPriorityPicker: false,
        showCategoryPicker: false,
        showBillingStatusPicker: false,
        showProjectPicker: false,
      },
      aiAssistant: {
        textInput: '',
        showSuggestionPreview: false,
        acceptedFields: {},
        isProcessing: false,
      }
    },
    actions: {
      updateField: (field: string, value: any) => {},
      togglePicker: (picker: string, show: boolean) => {},
      submit: async () => {},
      // other actions
    }
  };
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/viewAdapters/useCreateTaskViewAdapter.ts
git commit -m "feat: create useCreateTaskViewAdapter"
```

### Task 3: Refactor CreateTaskScreen to use Adapter

**Files:**
- Modify: `src/screens/CreateTaskScreen.tsx`

- [ ] **Step 1: Replace internal state with View Adapter**
Replace all the `useState`, `useEffect`, `useCallback`, and persistence logic in `CreateTaskScreen` with a single call to `useCreateTaskViewAdapter`. Leave `TaskActionScreen` intact at the bottom of the file.

- [ ] **Step 2: Wire up UI to actions**
Ensure text inputs, pickers, and buttons use the `actions` returned by the adapter.

- [ ] **Step 3: Run iOS build**

```bash
npm run ios
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/CreateTaskScreen.tsx
git commit -m "refactor: modernize CreateTaskScreen with View Adapter"
```

### Task 4: Add Verification Test

**Files:**
- Create: `src/__tests__/integration/CreateTaskScreen.test.tsx`

- [ ] **Step 1: Write integration test**
Write a basic render test for the adapter binding to ensure the screen mounts and actions are accessible.

- [ ] **Step 2: Run test**

```bash
npm test src/__tests__/integration/CreateTaskScreen.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/integration/CreateTaskScreen.test.tsx
git commit -m "test: add CreateTaskScreen adapter integration test"
```
