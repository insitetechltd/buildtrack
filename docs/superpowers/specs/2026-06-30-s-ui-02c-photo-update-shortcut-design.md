# S-UI-02C Photo Update Shortcut Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this design through an approved implementation plan. Do not start code changes directly from this document.

**Goal:** Convert the `Add Photos` task action into a draft-carried progress-update shortcut so selected photos return into the update submission flow, and allow photo-only updates only when at least one photo is attached.

**Architecture:** Reuse the existing update action-mode submission path in `CreateTaskScreen` as the single persistence path for photo-driven progress updates. Remove the current false-success `photos` end-state by routing photo selection returns into update action-mode with pre-attached draft photos. Keep persistence delayed until `Submit Update`, upload any local draft photos during submit before calling `addTaskUpdate(...)`, and loosen update validation only for the case where photo attachments exist.

**Tech Stack:** Expo-managed React Native, TypeScript, React Navigation, Zustand, NativeWind, Jest, `@testing-library/react-native`.

---

## Context

The `S-UI-02B` closure review surfaced a residual behavior gap in the task action flow:

- `TaskDetailScreen` exposes an `upload_photos` action from the task-detail adapter
- that action currently routes into `CreateTaskScreen` action-mode with `actionType="photos"`
- the `photos` action-mode lets users select and preview photos
- but the `Done` CTA only shows a success alert and exits without persisting anything

This creates a false-success flow where the UI acknowledges completion while the selected photos are not written to any update, comment, or task attachment record.

At the same time, the desired product direction is:

- preserve a draft-carried expectation for photo updates
- reduce friction so users are more likely to post field photo updates
- avoid broad redesign of comment or reject-task photo flows in the same slice

## Problem Statement

The current `Add Photos` action behaves like a terminal action but does not persist data. This causes:

- silent loss of selected photos when the user exits the screen
- duplicated action concepts (`photos` vs `update`) that split draft handling across multiple branches
- unnecessary friction because the quickest “photo update” path does not converge into the real update submit flow

The desired behavior is for `Add Photos` to act as a shortcut into a progress update draft with photos already attached, leaving persistence to the existing update submission action while making draft loss explicit rather than silent.

## Objectives

### Primary Objectives

- Replace the current false-success `photos` action-mode end-state with a draft-carried update shortcut.
- Route `upload_photos` so selected photos return into update action-mode with draft photos already attached.
- Preserve the existing single source of truth for persistence by using the normal `addTaskUpdate(...)` submit path.
- Preserve existing task vs subtask update semantics when the shortcut is used from task detail.
- Upload local draft photo objects to durable URLs during update submit before persisting the update payload.
- Allow photo-only updates only when at least one photo exists in the draft.
- Keep empty description + zero photos invalid.
- Prevent silent loss by warning before dismissing an update draft that contains unsaved photos or other unsaved changes.
- Freeze the new behavior with focused regression tests before implementation changes.
- Close the slice with a clean verification gate and checkpoint commit.

### Non-Objectives

- Do not redesign comment, reject, or reassign photo flows in this slice.
- Do not add durable persisted update drafts in AsyncStorage or Zustand for later recovery.
- Do not redefine task updates as immediate uploads on photo selection.
- Do not redesign the broader `UpdateProgressScreen` standalone route unless strictly required for the shortcut path.

## Proposed Behavior

### Target User Flow

1. User opens Task Detail.
2. User taps `Add Photos`.
3. User selects one or more photos.
4. App returns into update action-mode in `CreateTaskScreen` with:
   - the selected photos already attached to the draft
   - the existing update UI visible
   - the description field still present
   - no shortcut return into standalone `UpdateProgressScreen`
5. User may:
   - optionally type a description
   - optionally adjust completion percentage
   - submit the update
6. On submit:
   - any local selected photos are uploaded first
   - uploaded URLs are merged into the draft payload
   - the app persists the update through the same task/subtask-aware update semantics already used by update flows

### Cancel / Back Behavior

- If the user cancels photo selection or returns with zero new photos, the app should keep the user on their current origin flow without creating a new draft.
- If the user is already in update action-mode and reopens photo selection, returning photos should append to the existing draft photo list with duplicate assets deduped by draft attachment identity/URI. Removal remains an explicit per-photo action in the draft UI.
- If the user attempts to leave update action-mode with unsaved draft content (description changes, completion changes, or attached draft photos), the app should show a discard-confirmation prompt before exiting.
- If the picker is canceled, permission is denied, or navigation/photo-selection fails while re-entering from an already dirty update draft, the app should keep the user in the current update draft with existing draft content unchanged.

### Dirty Draft Baseline

Dirty-state detection should compare the current update draft against the initial update entry snapshot:

- initial description: empty string
- initial completion percentage: the task’s pre-existing completion percentage at entry
- initial photo attachment set:
  - for a shortcut-created draft, an empty attachment set before photo-selection results are applied
  - for re-entry from an already-open dirty update draft, the attachment set that existed before the user reopened photo selection

The draft is considered dirty if any of those values diverge afterward.

Discard protection should cover all user exit paths owned by the slice:

- header back
- navigation `goBack()` exits triggered by the screen flow
- Android hardware back / equivalent platform back handling where applicable

### Upload Failure Policy

- Update submit should be atomic at the UI level for this slice:
  - if any draft photo upload fails, do not call `addTaskUpdate(...)`
  - preserve the draft in place
  - surface an error that makes it clear the update was not submitted
  - let the user retry submit after the upload issue is resolved
- Partial upload success must not create a partial update record in this shortcut path.
- If uploads succeed but `addTaskUpdate(...)` fails afterward:
  - preserve the draft in place
  - promote the successfully uploaded photos into the draft as durable URLs
  - remove the corresponding local photo objects from the draft
  - on retry, reuse those durable URLs rather than uploading the same assets again

### Validation Rule

Update submission should be valid when either:

- `description.trim().length > 0`, or
- the merged draft attachment set contains at least one photo

For this slice, “merged draft attachment set” means the photos currently attached to the update draft regardless of source:

- local selected photo objects that have not yet been uploaded
- already-uploaded photo URLs already attached to the draft

Update submission should remain invalid when both are empty.

This rule applies only to the update submission branch. It does not imply that comments or other action modes become photo-only submit paths.

## Design Decisions

### Decision 1: Converge `Add Photos` into Update Action-Mode

`upload_photos` should no longer terminate in a standalone `photos` end-state. Instead, it should feed the update draft flow directly.

Design intent:

- reduce cognitive branching
- remove duplicate draft logic
- keep update persistence centralized

The simplest design-level implementation is:

- keep the navigation entry point from task detail
- use photo selection as the first step
- ensure the return target is update action-mode, not `photos`, `comment`, or standalone `UpdateProgress`

### Decision 2: Keep Persistence Deferred

Photo selection should not itself create a task update.

Rationale:

- matches the approved “draft-carried” expectation
- lets the user review or modify the update before submit
- avoids orphaned update records and hidden server writes

To preserve deferred persistence without data corruption:

- local `selectedPhotos` remain draft-only until submit
- submit must upload draft photo objects into durable URLs before `addTaskUpdate(...)`
- `addTaskUpdate(...)` continues to receive persisted photo references, not local device URIs

### Decision 3: Allow Photo-Only Updates

The update submission UI should allow a user to submit a progress update with no typed description when at least one photo is attached.

Rationale:

- lowers friction for field photo capture
- encourages more frequent update submissions
- keeps the data model stable by still creating a standard task update record

### Decision 4: Keep Scope Narrow

This slice should not turn every photo affordance into a new workflow. Only the `upload_photos` task action and the update action validation behavior should change.

This also means:

- the standalone `UpdateProgressScreen` route is not redefined in this slice
- the photo-update shortcut must explicitly normalize into `CreateTaskScreen` update action-mode instead of relying on the standalone update route
- the shortcut must preserve current task/subtask branching rather than flatten all submits into top-level task updates

### Decision 5: Explicitly Decommission the Terminal `photos` End-State

`actionType="photos"` should no longer behave as a submit-complete screen.

Accepted implementation outcomes for this slice:

- alias `photos` to update action-mode everywhere it is still received, or
- remove the distinct `photos` end-state and normalize all existing callers to `update`

The false-success “Done” path must not remain reachable after this slice closes, including stale callers or route params that still provide `actionType="photos"`.

If `actionType="photos"` is still encountered after the slice, it must resolve into the same update-draft flow and contract as `actionType="update"`.

## Impacted Areas

### Primary Files

- `src/screens/TaskDetailScreen.tsx`
- `src/screens/CreateTaskScreen.tsx`
- `src/navigation/AppNavigator.tsx`
- `src/__tests__/integration/CreateTaskScreen.test.tsx`
- `src/__tests__/integration/TaskDetailScreen.header.test.tsx` or a nearby task-detail integration harness if route freezing needs to be expanded
- `src/navigation/__tests__/photoShortcutRoutes.test.tsx` (new or equivalent focused navigator-level route suite)

### Likely Behavior Touchpoints

- task-detail action routing
- photo-selection wrapper return routing
- `subTaskId` propagation through the shortcut action-mode path
- action-mode draft hydration for `selectedPhotos` / `uploadedPhotoUrls`
- update submission validation and CTA behavior

## Migration Plan (Design-Level)

### Step 1: Freeze the Desired Behavior

Add failing regression coverage for:

- `upload_photos` converging into update draft behavior rather than a terminal photos-only success path
- update action-mode allowing submit with attached photos and an empty description
- update action-mode still blocking submit when both description and photos are empty
- returned photos hydrating into the update draft after the photo-selection round trip

### Step 2: Rewire the Shortcut Path

Adjust task-detail photo action routing and wrapper return logic so the shortcut always lands in the update draft branch.

This should eliminate the current behavior where a photos-only action screen can end successfully without persistence, including legacy or stale `actionType="photos"` entry paths.
The shortcut path must not route through standalone `UpdateProgressScreen`.
The shortcut path must explicitly preserve and propagate the active update-target `subTaskId` when launched from a subtask so the update action-mode branch has enough context to submit through subtask-aware update behavior.

Required contract clarification for this slice:

- the action-mode navigation/screen contract must carry a real update-target `subTaskId` (not just parent nesting metadata)
- `TaskDetailScreen`, `AppNavigator`, and the action-mode branch in `CreateTaskScreen` must all preserve that value through the shortcut path
- the submit branch must use that propagated update-target context to choose task vs subtask persistence correctly

### Step 3: Simplify Validation

Update submit validation so attached photos satisfy the minimum-content requirement.

This should be implemented in the existing update submit path rather than by introducing a second submit mechanism.

Completion-percentage-only changes without description and without photos remain invalid in this slice.

### Step 4: Preserve Task/Subtask Update Semantics

The shortcut path must carry enough context to persist updates correctly:

- if launched for a top-level task, submit through the task update path
- if launched for a subtask, submit through the subtask update path

The shortcut must not regress existing subtask update behavior.

### Step 5: Define Submit Sequencing

Implement submit sequencing so:

1. local draft photos upload first
2. any upload failure aborts submit and preserves the draft
3. only fully uploaded photo references are passed to `addTaskUpdate(...)`

### Step 6: Prevent Silent Draft Loss

Add explicit discard handling for unsaved update drafts so photo-driven updates cannot be abandoned without user confirmation.

### Step 7: Verify and Close

Run focused tests and `tsc --noEmit`, review the slice for navigation drift or false-success states, and create a closure commit only when the gate is green.

## Testing Strategy

### Required Coverage

- Task-detail action routing test confirming the photo action leads into the update draft path
- Create-task action-mode tests covering:
  - photo round-trip hydration into update draft
  - submit allowed with photos and empty description
  - submit blocked with no description and no photos
  - subtask shortcut submits through the existing subtask-aware update behavior
  - local draft photos uploaded before `addTaskUpdate(...)` receives the final payload
  - upload failure aborts submit and preserves the draft
  - `addTaskUpdate(...)` failure after successful uploads preserves the draft and reuses durable uploaded URLs on retry
  - discard confirmation appears when backing out of a dirty update draft
  - photo-picker cancel / zero-selection path does not create a new draft or false-success state
  - picker permission/error paths preserve existing dirty draft state
  - legacy `actionType="photos"` no longer reaches a false-success terminal branch
  - shortcut photo flows do not return through standalone `UpdateProgressScreen`
- non-regression coverage around the shared photo-return wrapper so `UpdateProgress` and `AddComment` return branches still behave after the shortcut routing changes

### Minimum Verification Gate

- `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand`
- `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand`
- `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/navigation/__tests__/photoShortcutRoutes.test.tsx --runInBand`
- any additional focused suite introduced for the slice
- `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit`

## Risks

- Navigation drift could return photo selection to the wrong screen or wrong action mode.
- Validation drift could accidentally allow empty/no-photo updates through the standard update flow.
- Wrapper-level param plumbing could drop `selectedPhotos` or `uploadedPhotoUrls` between navigators.
- The legacy `photos` action-mode branch could remain reachable and continue to imply false success if not fully converged.
- Submit sequencing could persist local device URIs instead of uploaded URLs if upload-on-submit is only partially wired.
- Re-entry behavior could unexpectedly replace or duplicate draft photos if append semantics are not implemented consistently.
- Error or permission-denied exits from photo selection could clear an existing draft if failure handling is not normalized.
- Draft cleanup omissions could cause stale photos to reappear on the next entry even after successful submit or confirmed discard.
- Task/subtask context could be dropped in the shortcut path and incorrectly post a subtask update as a task update.

## Definition Of Done

`S-UI-02C` is complete when:

- `upload_photos` acts as a shortcut into update draft behavior rather than a terminal photos-only action.
- selected photos survive the round trip and appear in the update draft UI.
- local draft photo objects are uploaded on submit and `addTaskUpdate(...)` receives durable photo references.
- shortcut submissions preserve existing task vs subtask persistence behavior.
- update submission is allowed with empty description only when at least one photo is attached.
- update submission remains blocked when both description and photos are empty.
- leaving a dirty update draft requires explicit discard confirmation.
- successful submit or confirmed discard clears the draft-carried photo state so stale photos do not reappear on the next entry.
- focused regression tests are green.
- `tsc --noEmit` is green.
- a checkpoint commit exists for the closed slice.

## Follow-On

Potential future improvements, intentionally out of scope for this slice:

- durable local drafts for partially composed updates
- explicit UI copy changes such as “Optional note”
- further simplification of comment/reject photo flows
- converging standalone `UpdateProgressScreen` and action-mode update UI if a later refactor is justified
