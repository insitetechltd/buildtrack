# Photo Screens Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize `PhotoSelectionScreen` and `PhotoAnnotationScreen` to use the View Adapter architecture, extracting all camera/library integration, upload loops, and IMGLY editor logic out of the React components.

**Architecture:** We will extract all state (selected photos, uploading status, enlarged photo index) and complex actions (launching camera, launching IMGLY editor, uploading to Supabase) into two new hooks: `usePhotoSelectionViewAdapter.ts` and `usePhotoAnnotationViewAdapter.ts`. The screens will become pure presentation layers. 

**Tech Stack:** React Native, Expo Image Picker, IMGLY Editor, Jest, React Native Testing Library.

---

### Task 1: Enhance View Adapter Contracts

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`

- [ ] **Step 1: Implement the contract extensions**
Add explicit types for the Photo Selection specific models.

```typescript
// Add to src/ui/contracts/viewAdapters.ts

export interface SelectablePhotoModel extends PrimitiveReadyItemBase {
  id: string;
  uri: string;
  annotatedUri?: string;
  fileName: string;
  isAnnotated: boolean;
}

export interface PhotoSelectionScreenViewAdapterOutput {
  screenId: "PhotoSelectionScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  photos: SelectablePhotoModel[];
  enlargedPhotoIndex: number | null;
  isUploading: boolean;
  isAnnotating: boolean;
}

export interface PhotoAnnotationScreenViewAdapterOutput {
  screenId: "PhotoAnnotationScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  isLoading: boolean;
}
```

- [ ] **Step 2: Commit**
```bash
git add src/ui/contracts/viewAdapters.ts
git commit -m "feat: enhance contracts for Photo Screens modernization"
```

### Task 2: Create the Photo Selection View Adapter

**Files:**
- Create: `src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts`

- [ ] **Step 1: Write the minimal implementation**
Extract the logic from `PhotoSelectionScreen.tsx` into `usePhotoSelectionViewAdapter.ts`. Ensure it handles the props (`onPhotosUploaded`, `onPhotosSelected`, `uploadImmediately`, etc.) exactly as the legacy screen did.

```typescript
// Implement usePhotoSelectionViewAdapter hook.
// Key extractions:
// 1. `handleAddPhotos` (ImagePicker for Camera and Library).
// 2. `createPinnedPhoto` cache pinning.
// 3. `handleAnnotatePhoto` (IMGLY Editor invocation).
// 4. `handleUploadPhotos` (Supabase upload loop).
```

- [ ] **Step 2: Write a basic test (or verify compilation if mocking ImagePicker is too complex)**
Run: `npx tsc --noEmit` to ensure the hook is strictly typed.

- [ ] **Step 3: Commit**
```bash
git add src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts
git commit -m "feat: implement usePhotoSelectionViewAdapter"
```

### Task 3: Refactor PhotoSelectionScreen

**Files:**
- Modify: `src/screens/PhotoSelectionScreen.tsx`

- [x] **Step 1: Rewrite PhotoSelectionScreen**
Replace the state management in `PhotoSelectionScreen.tsx` with `usePhotoSelectionViewAdapter`. 
*CRITICAL:* Maintain the exact layout, enlarged photo overlay, and `SafeAreaView` wrapping from the legacy screen. 

- [x] **Step 2: Verify Compilation**
Run: `npx tsc --noEmit`
Expected: PASS

- [x] **Step 3: Commit**
```bash
git add src/screens/PhotoSelectionScreen.tsx
git commit -m "refactor: modernize PhotoSelectionScreen to use View Adapter"
```

### Task 4: Modernize PhotoAnnotationScreen

**Files:**
- Create: `src/ui/viewAdapters/usePhotoAnnotationViewAdapter.ts`
- Modify: `src/screens/PhotoAnnotationScreen.tsx`

- [x] **Step 1: Create usePhotoAnnotationViewAdapter**
Extract the `openEditor` function, IMGLY logic, and `isLoading` state into the adapter.

- [x] **Step 2: Refactor PhotoAnnotationScreen**
Consume the adapter. The screen should now just be a dumb UI showing the `ActivityIndicator` based on the adapter's `output.isLoading`.

- [x] **Step 3: Verify Compilation**
Run: `npx tsc --noEmit`
Expected: PASS

- [x] **Step 4: Commit**
```bash
git add src/ui/viewAdapters/usePhotoAnnotationViewAdapter.ts src/screens/PhotoAnnotationScreen.tsx
git commit -m "refactor: modernize PhotoAnnotationScreen to use View Adapter"
```
