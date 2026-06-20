# UpdateProgressScreen Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the `UpdateProgressScreen` to use the new UI Contracts and View Adapter architecture while maintaining strict legacy parity for photo handling, upload retries, and slider progress.

**Architecture:** We will extract all form state, photo selection/upload handling, percentage calculations, and sub-task routing logic into `useUpdateProgressViewAdapter.ts`. The adapter will expose a clean set of actions and primitive-ready models. A mapper file will translate these to Primitive components. `UpdateProgressScreen.tsx` will become a pure presentation layer.

**Tech Stack:** React Native, Expo, Zustand, Jest, React Native Testing Library.

---

### Task 1: Enhance View Adapter Contracts

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`

- [ ] **Step 1: Implement the contract extensions**
Add explicit types for the Update Progress specific models (Photo items, slider state, failed uploads) to `src/ui/contracts/viewAdapters.ts`.

```typescript
// Add to src/ui/contracts/viewAdapters.ts

export interface UpdateProgressPhotoModel extends PrimitiveReadyItemBase {
  id: string;
  uri: string;
  isUploaded: boolean;
  isFailed: boolean;
  errorMessage?: string;
  onRemove: () => void;
  onRetry?: () => void;
}

export interface UpdateProgressFormModel {
  description: string;
  completionPercentage: number;
  previousPercentage: number;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface UpdateProgressScreenViewAdapterOutput {
  screenId: "UpdateProgressScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  form: UpdateProgressFormModel;
  photos: UpdateProgressPhotoModel[];
  scalarMetrics: {
    totalPhotos: number;
    failedPhotos: number;
  };
}
```

- [ ] **Step 2: Commit**
```bash
git add src/ui/contracts/viewAdapters.ts
git commit -m "feat: enhance contracts for UpdateProgressScreen modernization"
```

### Task 2: Create the UpdateProgress View Adapter

**Files:**
- Create: `src/ui/viewAdapters/useUpdateProgressViewAdapter.ts`
- Create: `src/__tests__/integration/UpdateProgressAdapter.test.ts`

- [ ] **Step 1: Write the failing test**
Create `src/__tests__/integration/UpdateProgressAdapter.test.ts` to verify the hook initializes correctly and handles photo state.

```typescript
import { renderHook } from '@testing-library/react-hooks';
import { useUpdateProgressViewAdapter } from '../../../src/ui/viewAdapters/useUpdateProgressViewAdapter';

// Mock dependencies...
describe('useUpdateProgressViewAdapter', () => {
  it('should return loading state initially without task', () => {
    // Test implementation
  });
});
```

- [ ] **Step 2: Write minimal implementation**
Extract the logic from `UpdateProgressScreen.tsx` into `useUpdateProgressViewAdapter.ts`.

```typescript
// Implement useUpdateProgressViewAdapter hook.
// Key extractions:
// 1. `useFocusEffect` and `useEffect` logic for merging `selectedPhotos` and `uploadedPhotoUrls`.
// 2. Form state (`updateForm`) and `failedUploadsInSession` tracking.
// 3. `handleAddPhotos` navigation logic.
// 4. `uploadPhotoObjects` and `handleRetryUpload` API wrappers.
// 5. `handleSubmitUpdate` logic (status calculation, store update, fallback navigation).
```

- [ ] **Step 3: Run test to verify it passes**
Run: `npx jest src/__tests__/integration/UpdateProgressAdapter.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/ui/viewAdapters/useUpdateProgressViewAdapter.ts src/__tests__/integration/UpdateProgressAdapter.test.ts
git commit -m "feat: implement useUpdateProgressViewAdapter"
```

### Task 3: Create Update Progress Mappers

**Files:**
- Create: `src/ui/mappers/updateProgressMappers.ts`

- [ ] **Step 1: Implement the mappers**
Map the adapter output to the standard UI primitives.

```typescript
import type { UpdateProgressPhotoModel } from "../contracts/viewAdapters";
// ... imports

export function mapPhotoModelToImageProps(model: UpdateProgressPhotoModel) {
  return {
    primitiveId: model.id,
    uri: model.uri,
    status: model.isFailed ? 'error' : model.isUploaded ? 'success' : 'pending',
    errorMessage: model.errorMessage,
    onRemove: model.onRemove,
    onRetry: model.onRetry,
  };
}
// Note: May need to add an ImagePrimitiveContract to primitives.ts if it doesn't exist, or just use raw RN Image + View for now if primitives don't cover it.
```

- [ ] **Step 2: Commit**
```bash
git add src/ui/mappers/updateProgressMappers.ts
git commit -m "feat: add update progress mappers"
```

### Task 4: Refactor UpdateProgressScreen

**Files:**
- Modify: `src/screens/UpdateProgressScreen.tsx`

- [x] **Step 1: Rewrite UpdateProgressScreen**
Replace the state management in `UpdateProgressScreen.tsx` with `useUpdateProgressViewAdapter`. 
*CRITICAL:* Maintain the exact layout, `Slider` component, and `SafeAreaView` wrapping from the legacy screen. The photo gallery must still horizontally scroll.

```tsx
import React from "react";
import { View, ScrollView, Text, TextInput, Pressable, Image } from "react-native";
import { useUpdateProgressViewAdapter } from "@/ui/viewAdapters/useUpdateProgressViewAdapter";
// ... imports

export default function UpdateProgressScreen(props: UpdateProgressScreenProps) {
  const { output, actions } = useUpdateProgressViewAdapter(props);

  // Render using adapter output...
}
```

- [x] **Step 2: Verify Compilation**
Run: `npx tsc --noEmit`
Expected: PASS

- [x] **Step 3: Commit**
```bash
git add src/screens/UpdateProgressScreen.tsx
git commit -m "refactor: modernize UpdateProgressScreen to use View Adapter"
```
