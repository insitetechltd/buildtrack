# Task Detail Inline Square Photo Design

## Goal

Make inline work-thread photos on the Task Detail screen render inside a square frame so portrait and landscape images share a consistent footprint and no longer show uneven empty borders. Keep the full-screen viewer unchanged so users can still inspect each image at its original aspect ratio.

## Scope

In scope:

- Inline photo surfaces inside the work thread in `TaskActivityTimeline`
- Swipe paging behavior for inline photos
- Inline photo layout and image fit behavior
- Test coverage for the inline thread photo contract

Out of scope:

- Full-screen modal viewer layout and image fit
- Other task-detail photo surfaces outside the inline thread
- Data shape, upload behavior, or photo URL resolution

## Current Problem

The inline work-thread photo surface currently computes a dynamic aspect ratio per activity and renders the image with `resizeMode="contain"`. This keeps the full image visible, but it also exposes empty space around images with differing orientations or source sizes. As a result:

- portrait photos can appear tall and narrow relative to neighboring entries
- landscape photos can appear wide and shallow
- mixed image sets produce inconsistent visual rhythm
- visible empty borders make the gallery feel unfinished

## Decision

Use a fixed square frame for inline work-thread photos only, and render the image with `cover` inside that frame.

This means:

- inline photos become visually consistent regardless of source orientation
- the inline thread acts as a cropped preview surface
- the full-screen viewer remains the place to see the original uncropped image

## Alternatives Considered

### 1. Square frame with `contain`

Pros:

- preserves the full photo inline
- requires only a small layout change

Cons:

- does not solve the visible border problem
- still produces empty space for mismatched orientations

Rejected because it does not meet the primary visual goal.

### 2. Square frame with blurred backdrop

Pros:

- keeps the full image visible
- softens the border problem

Cons:

- adds implementation complexity
- introduces extra visual styling that may distract from the work thread
- creates a more decorative treatment than the current product direction needs

Rejected because it is more complex than necessary for this problem.

### 3. Square frame with `cover`

Pros:

- removes the inline border problem
- creates consistent card geometry across mixed photo orientations
- keeps implementation local and simple

Cons:

- crops some edges from portrait and landscape images in the inline preview

Accepted because it solves the stated problem while preserving original-aspect viewing in the modal.

## UI Design

### Inline Thread Photo Surface

The photo shell in `TaskActivityTimeline` becomes a fixed square:

- use `aspectRatio: 1`
- keep the existing rounded corners and swipe surface behavior
- keep the full-width card footprint within the thread entry

The inline image inside the swipe surface changes to:

- `resizeMode="cover"`
- full width and full height of the square frame

This makes every inline thread photo read as a uniform square preview regardless of source orientation.

### Full-Screen Viewer

The full-screen photo viewer remains unchanged:

- keep the modal gallery paging behavior
- keep `resizeMode="contain"`
- keep the original-aspect presentation

This preserves a clean separation between preview behavior and inspection behavior.

## Component Impact

### `src/components/taskDetail/TaskActivityTimeline.tsx`

This is the primary implementation target.

Changes:

- remove the inline dependency on dynamic lead-photo aspect ratios for sizing
- replace the inline photo shell aspect ratio with a fixed square
- switch inline image fit from `contain` to `cover`
- keep gallery index tracking, swipe paging, modal opening, and modal viewer behavior unchanged

The existing image-size lookup logic may remain temporarily if needed for compatibility, but the square layout should no longer depend on it for inline rendering. If it becomes unused after the change, it should be removed as part of implementation to keep the file focused.

### `src/components/taskDetail/TaskDetailEvidenceStrip.tsx`

No change in this slice. The accepted scope is inline thread only.

## Behavior Contract

After the change:

- every activity thread entry with photos renders the inline gallery inside a square shell
- swiping inline photos still pages between images inside that square shell
- tapping an inline photo still opens the full-screen modal viewer
- the modal viewer still displays the selected photo using original-aspect `contain`
- portrait and landscape images share the same inline visual footprint

## Error Handling

This change does not introduce new external failure modes. If an image fails to load, the current React Native image behavior remains in effect. The design does not depend on remote image dimension discovery for inline sizing, which reduces layout sensitivity to missing image metadata.

## Testing Strategy

Update the focused unit coverage for `TaskActivityTimeline` to lock the new contract:

- assert the inline photo shell uses square sizing
- assert inline thread photos use `resizeMode="cover"`
- assert the modal viewer continues to use `resizeMode="contain"`
- assert swipe pagination still changes the selected inline photo and opens the correct modal image

Existing acceptance tests for the thread and modal viewer should remain valid, with only expectation changes where the old aspect-ratio-aware inline shell was explicitly asserted.

## Risks

### Cropping Sensitivity

Some images may lose edge detail in the inline preview because `cover` crops to fill the square. This is acceptable because the full-screen modal remains available for full image inspection.

### Test Drift

Current tests explicitly assert the old aspect-ratio-aware inline shell and `contain` fit. Those expectations must be updated to reflect the new contract.

## Acceptance Criteria

- Inline work-thread photos render inside a square frame.
- Inline work-thread photos use `cover`.
- Full-screen modal photos continue to use original-aspect `contain`.
- Swipe behavior and modal open behavior remain unchanged.
- No other task-detail photo surfaces are modified in this slice.
