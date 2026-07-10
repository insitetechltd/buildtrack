# Task Title Expansion And Photo-Centric Thread Design

Date: 2026-07-10
Status: Drafted for review

## Objective

Refine task readability across two key surfaces:

1. allow long task titles to expand inline when pressed
2. redesign Task Detail work-thread entries so photo-bearing updates feel meaningfully photo-centric

This slice is presentation-only. It should not change task data, navigation targets, or workflow semantics.

## User-Approved Decisions

- Full task title should expand inline when pressed.
- This applies in both places:
  - Task Detail header title
  - task list row title
- Expansion should happen in place, not in a modal, tooltip, or toast.
- For the work-thread entry structure:
  - the user icon and user name should sit outside the content area
  - they should align off the timeline dot / rail
  - timestamp should sit on the right in that same outer row
- No shared rounded wrapper should encapsulate both the photo block and the information below it.
- When photos exist, the photo should take materially larger real estate on the right.
- Additional photos should be represented as a swipeable gallery rather than only as small thumbnails.
- Creation photos only should appear on the first `Created by` thread event.
- The photo count label should sit above the photo, not beside it.
- Photo interaction should be swipe-first rather than arrow-first.
- Entry metadata should be reorganized into two lines:
  - line 1: actor name left, status badge right
  - line 2: timestamp left, completion percent right

## Scope

In scope:

- Task Detail header title interaction
- shared task-row title interaction in the task list surface
- Task Detail work-thread entry structure and photo emphasis
- targeted regression tests for both behaviors

Out of scope:

- changing task data contracts beyond what is minimally required for presentation
- changing Task Detail actions, timeline ordering, or update semantics
- changing task title text itself
- changing non-task list screens unless they already reuse the same row-card component

## Part 1: Inline Title Expansion

### Target Surfaces

Inline title expansion applies to:

- the Task Detail header title
- task titles rendered through the shared task-list row-card surface

### Interaction Model

Default state:

- title is visually truncated using the current one-line or clamped presentation

On press:

- title expands inline
- full task title becomes visible in the same layout region
- no modal or overlay appears

### Behavior Choice

Approved direction is the simplest interaction:

- one-way expand

That means:

- tap once to expand
- title remains expanded for that rendered item until the component rerenders or unmounts

Why:

- lowest-risk implementation
- minimal new state
- avoids unnecessary collapse logic

### Task Detail Header Title

Current state:

- header title is single-line and ellipsized

Target state:

- the title text itself becomes pressable
- collapsed: single-line
- expanded: multiline, full title visible
- badge row remains below and reflows naturally

Important constraint:

- only the title text should own the expand interaction
- back button, profile trigger, and header badge interactions must remain unaffected

### Task List Row Title

Current state:

- task-row title is clamped inside the shared row-card component

Target state:

- only the title text becomes pressable for expand-in-place
- the row itself still handles navigation when the rest of the card is pressed
- expanded title increases the row height naturally
- subtitle, meta row, and badge remain intact below

Important constraint:

- tapping the title should expand the title, not navigate immediately into the task
- tapping outside the title should preserve the current card press behavior

## Part 2: Photo-Centric Work-Thread Entry

### Current Problem

The current thread entry already has a strong photo block, but the user wants the layout to feel more editorial and less boxed.

Specifically:

- actor identity should not live inside the content container
- photo and narrative should not be wrapped together as one contained card
- when photos exist, the image should feel like a primary storytelling element

### Approved Structure

Each work-thread entry uses a two-part composition:

1. outer actor row aligned with the timeline rail
2. open content area below

### Outer Actor Row

This row sits outside the content area.

Contents:

- timeline dot / rail on the far left
- actor avatar
- actor name
- status badge aligned on the far right of the first metadata line
- timestamp aligned on the far right
- completion percentage aligned on the far right of the second metadata line

Rules:

- actor identity must visually align with the rail
- timestamp must remain outside the photo/text area
- this row should establish ownership and time context before the content block
- metadata order is locked to:
  - first line: actor name left, status badge right
  - second line: timestamp left, completion percent right

### Open Content Area

The content area below the actor row should not be enclosed in a shared rounded card that wraps both image and text together.

Instead, it should read as open stacked thread content:

- photo block when photos exist
- supporting text block below

This creates a more editorial, timeline-native feeling.

### No-Photo State

When no photos exist:

- keep the outer actor row
- show the update text below as open content
- avoid adding a decorative wrapper that exists only for consistency

The no-photo state should remain compact and easy to scan.

### Photo State

When photos exist:

- keep the outer actor row unchanged
- use an asymmetric content split below
- allow the photo area to take materially larger real estate on the right
- place supporting narrative to the left

This creates a clear shift into a photo-centric presentation without changing the meaning of the entry.

### Photo Layout

Approved visual direction:

- right-heavy photo layout

Structure:

- left side: narrative text
- right side: dominant lead photo
- additional photos represented as a swipeable gallery sequence
- photo-count caption directly above the photo block

The lead photo should:

- be significantly larger than the current supporting-thumbnail feel
- read as the primary visual
- indicate that more photos are available via swipe affordance or carousel cues

The additional photos should:

- be reachable by horizontal swipe
- not rely only on small static thumbnail stacks
- not require the user to depend on small arrow controls as the primary interaction

### Photo Count Caption

The photo count label should not consume its own text column beside the image.

Approved direction:

- render the count as a compact caption directly above the photo block
- example: `Added 2 photos`
- keep it visually attached to the photo, not the narrative column

This reduces wasted horizontal space and reinforces that the photo area is the primary content.

### Text Block

The supporting text block should sit beside or below the photo according to the approved right-heavy composition.

Its purpose is to communicate:

- event headline
- supporting narrative / detail text

It should remain subordinate to the lead photo when photos exist.

### Creation Photos Only

Creation-time photos should anchor to the first `Created by` thread event.

This rule means:

- photos imported during task creation appear on the first `Created by` event
- later photos remain attached to their own later update events
- no intentional duplication is introduced across the thread

This preserves timeline truth while ensuring the story starts with the creation evidence.

## Component Direction

### Shared Row Card

The task-list title expansion work should ideally reuse the existing shared row-card component rather than inventing a separate card only for title expansion.

Expected direction:

- add local UI state for title expansion inside the shared card renderer
- scope the press interaction to the title text only

### Task Detail Header

The Task Detail header already uses a custom `titleNode`.

Expected direction:

- make the title text itself pressable
- maintain the current badge row below it

### Task Activity Timeline

The work-thread redesign should be concentrated inside the Task Detail timeline component.

Expected direction:

- preserve ordering, gallery open behavior, and timeline identity
- reorganize the entry structure around:
  - outer actor row
  - open photo/text composition
- support swipe-first photo browsing inside the entry when multiple photos exist
- attach creation-time photos to the first `Created by` event only

## Testing Plan

Update targeted tests to assert:

### Title Expansion

- Task Detail title starts collapsed
- pressing the Task Detail title expands it inline
- task-list row title starts clamped
- pressing the task-list row title expands it inline
- pressing the task-list title does not trigger row navigation
- pressing the card outside the title still triggers row navigation

### Work-Thread Layout

- actor row is outside the photo/text content area
- actor name and timestamp render in the outer row
- first metadata line renders actor name left and status badge right
- second metadata line renders timestamp left and completion percent right
- photo-bearing entries render the dominant right-side image treatment
- photo-count caption renders above the photo block
- additional-photo affordance remains present for multi-photo entries
- swipe interaction changes photos directly within the entry
- no shared wrapper encloses both the photo and the text block together
- no-photo entries remain compact and open
- creation-time photos appear on the first `Created by` event only

## Risks

- title expansion may cause unexpected reflow in dense list rows
- nested pressables in the shared row card can accidentally conflict with row navigation
- the open thread layout may require careful spacing so it does not feel visually loose
- larger photo treatment may overwhelm the text if proportions are too aggressive
- swipe interaction inside the thread could conflict with tap-to-open viewer behavior if not scoped carefully
- creation-photo mapping could surface the wrong photos on the first event if creation provenance is inferred incorrectly

## Mitigations

- keep title expansion state local and minimal
- scope title press targets carefully and stop propagation where needed
- verify layout with focused visual regression tests
- keep the actor row stable so the content area can change without harming scanability
- keep swipe gestures scoped to the photo area only
- use explicit creation-photo provenance where available; otherwise implement conservative mapping rules

## Acceptance Criteria

- Pressing the Task Detail header title expands the full title inline.
- Pressing a truncated task-list title expands the full title inline.
- Task-list title expansion does not break row navigation outside the title press target.
- Work-thread entries place avatar and actor name outside the content area aligned off the timeline rail.
- Timestamp appears on the right of the outer actor row.
- First metadata line shows actor name left and status badge right.
- Second metadata line shows timestamp left and completion percent right.
- Photo-bearing entries use a right-heavy photo-centric layout.
- The photo count label appears above the photo, not beside it.
- Additional photos are represented as swipeable gallery content with swipe as the primary interaction.
- Creation-time photos appear on the first `Created by` event only.
- No shared wrapper encloses both the photo block and the information below it.
