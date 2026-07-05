# Task Detail Correction Design

**Date:** 2026-07-05  
**Scope:** Follow-up correction pass for Task Detail after simplifying the screen into a fixed hero plus one unified chronological thread.

## Goal

Refine Task Detail into the simplest understandable operational surface:

- one stationary hero card at the top
- one compact merged info card below the hero that scrolls with the page
- no separate delegation card outside the hero/info area
- no separate subtasks card
- one chronological work thread that includes both task and subtask progress
- photo-forward thread entries with tight metadata
- fresh photo-update forms after every submission

This remains a focused correction pass to the existing Task Detail redesign, not a new independent product slice.

## Approved Direction

The approved direction is now:

- dynamic bottom-nav camera behavior on Task Detail remains
- no dedicated top camera shortcut
- no visible `Progress update` button
- text-only updates still go through comment for now
- back from the camera/update flow returns to Task Detail
- the top hero card stays fixed
- the hero card keeps task identity and quick status context only
- the hero no longer tries to carry full delegation/details/description content by itself
- a single merged info card sits directly under the hero and scrolls with the page
- the merged info card combines description, delegation, and compact task details
- the lower delegation section is removed entirely
- the separate evidence section is removed entirely
- the separate subtasks card is removed entirely
- the work thread becomes the main body of the page
- the work thread includes both parent-task and subtask updates in one chronological flow
- newest-first thread order remains
- approved layout is **Option A**
- metadata stays aligned to the thread rail in this order: **Date, user, %**
- each thread entry contains media and comment/detail content
- subtask updates are represented as normal thread entries with lightweight subtask context
- photo-update form must reset fully after submit so reopening starts fresh

## Design Decisions

### 1. Dynamic Camera Behavior

When Task Detail is the active screen:

- the bottom navigation camera button remains context-sensitive
- activating it routes directly into the same-task photo update flow
- the dedicated Task Detail top camera button remains removed
- backing out of the camera/update flow returns to Task Detail rather than the dashboard

When Task Detail is not the active screen:

- the bottom navigation camera retains its normal global capture behavior

#### Reasoning

- preserves the camera workflow already approved
- keeps the top area free of duplicate update affordances
- keeps photo updates tightly attached to the task context

### 2. Sticky Hero Card

The top hero card is the only stationary element at the top of the page.

Approved behavior:

- hero remains fixed while the page content scrolls underneath it
- remove the low-value project-label string above the title
- let the title remain the first strong line
- let quick chips carry status / completion / urgent context
- remove the `Next step` card entirely
- do not place long description or detailed ownership rows directly inside the hero
- keep critical state as a compact flag/badge in the hero title area

#### Reasoning

- the hero should stay stable and easy to parse
- sticky elements must remain lightweight or they consume too much visual space
- the hero’s job is identity and top-level status, not full detail payload

### 3. Scrolling Merged Info Card

Directly below the sticky hero, there should be a single compact card that scrolls with the page.

Approved behavior:

- one merged info card only
- combine:
  - description
  - delegation
  - compact task details
- remove the separate lower delegation card
- do not split this into multiple stacked cards

Suggested order inside the card:

1. description
2. delegation
3. compact details such as due date / reference / supporting metadata

#### Reasoning

- one merged card is calmer than several stacked informational cards
- delegation still matters, but does not need its own separate section anymore
- scrolling info preserves detail without making the sticky region too heavy

### 4. Remove Evidence and Subtasks Sections

The standalone evidence section and standalone subtasks section are both removed entirely.

Approved behavior:

- no pinned evidence section
- no separate active-entry stage
- no separate subtasks card below the thread
- no secondary narrative surface for progress storytelling

#### Reasoning

- separate sections fragment the user’s understanding of progress
- evidence and subtasks both belong in the actual progress narrative
- a single update flow is easier to read than multiple competing blocks

### 5. Unified Chronological Work Thread

The work thread becomes the main progress body of Task Detail.

Approved behavior:

- newest-first order remains
- parent-task activity and subtask activity are merged into one chronological thread
- each entry is self-contained
- thread point / rail carries the tight metadata row
- card body carries media and comment/detail content

This is the approved **Option A** direction.

#### Reasoning

- progress is easiest to understand when the user sees one chronological narrative
- splitting parent-task and subtask updates makes causality harder to follow
- folding subtask updates into the same thread gives a clearer sense of real progress

### 6. Thread Entry Layout

Each work-thread entry should use the following structure.

#### Metadata rail row

Aligned with the thread point:

- Date
- user
- %

This order is mandatory.

The metadata row should remain visually tight and label-light.

#### Entry card body

Inside the card:

- one large lead photo at the top when photos exist
- a small thumbnail strip when more than one photo exists
- the comment/detail below the media, if present

The card should not repeat the metadata row inside the body.

#### Parent-task entry

- renders as a normal work-thread card
- no extra card chrome required

#### Subtask entry

- renders as a normal work-thread card within the same chronological thread
- includes lightweight subtask context such as subtask title or a subtle subtask marker
- should not feel like a separate section or nested timeline

#### Text-only entry

- no fake evidence placeholder
- no large empty photo block
- just the compact thread card with detail/comment content if present

#### Document/PDF entry

- compact document tile inside the thread card
- detail/comment below if present
- still uses the same Date / user / % rail metadata

#### Photo display behavior

- the lead photo should display the full image rather than cropping important content away
- the default in-thread photo treatment should prefer full-image visibility within the card bounds
- tapping the lead photo or any thumbnail should open a true full-photo viewer
- the full-photo viewer should display the image at full available size with contain/fit behavior, not the constrained thread-card presentation
- the user should be able to see the entire selected image after tapping it

#### Reasoning

- metadata belongs to the timeline structure
- media and details belong to the card body
- subtask work should feel like part of the same story, not a different module
- field teams often need to inspect the full image, not just a cropped preview
- the current card-only photo treatment hides important detail when the image aspect ratio is tall or wide

### 7. Information Density

The entire page should be simpler and denser than the previous redesign.

Approved behavior:

- remove large sectional labels such as `Photo evidence`
- remove redundant descriptive helper copy
- reduce padding inside thread cards and secondary informational surfaces
- keep comments/details as the only longer text blocks
- let media dominate photo updates
- keep the merged info card compact and quiet

#### Reasoning

- the previous design still had too many blocks competing for attention
- the target direction is simple, operational, and fast to scan

### 8. Action Hierarchy

The action hierarchy remains fully inline:

- no promoted primary footer CTA
- visible inline secondary actions remain lower in the screen
- `Edit task details` appears only for the creator

This part of the prior correction direction remains unchanged.

### 9. Photo Update Form Reset

The photo-update form must reset completely after a successful submission.

Approved behavior:

- clear selected photos
- clear comment text
- clear progress/update value back to a fresh default state
- clear any draft data associated with the just-submitted update
- reopening photo update should never show the previous submission’s data

#### Reasoning

- carrying the previous update forward is a correctness bug, not just a visual bug
- repeated update actions must always start from a fresh form state

## Final Screen Structure

Approved Task Detail order:

1. sticky hero card
2. scrolling merged info card
3. newest-first unified work thread
4. visible inline secondary actions

Explicit removals from the current version:

- no separate Task Detail top camera button
- no standalone large `Mark critical` section
- no project-label string above the task title
- no visible `Progress update` button
- no `Next step` card in the hero
- no lower delegation section
- no evidence section
- no separate subtasks card

## Interaction Rules

### Camera

- Task Detail active: bottom-nav camera routes to same-task photo update flow
- leaving the camera/update flow via back returns to Task Detail
- any other screen: bottom-nav camera retains global capture behavior

### Sticky Hero

- fixed at the top of the page
- no project-label string above the title
- title is the first strong line
- no `Next step` card
- compact status/context only

### Merged Info Card

- scrolls with the page
- contains description, delegation, and compact details
- replaces the old lower delegation section

### Work Thread

- newest first
- metadata aligns to the thread rail
- metadata order is Date, user, %
- entry card body contains media + detail/comment
- includes both parent-task and subtask activity in one chronological thread
- no separate evidence section above the thread
- no separate subtasks card below the thread

### Photo Update Form

- successful submit resets all draft state
- reopening update starts from a fresh form

### Edit Permissions

- `Edit task details` appears only for the creator of the task
- non-creators must not see this action

## Non-Goals

This correction pass does **not** include:

- a new batch capture review flow
- a new photo annotation model
- a redesign of the global bottom navigation outside the existing camera-context behavior
- a new hidden action menu or bottom sheet pattern
- changes to broader Activity or Tasks information architecture

## Validation Targets

The correction is only complete if all of the following are true:

1. Task Detail no longer renders a separate top camera button
2. bottom-nav camera uses task-detail context when Task Detail is active
3. back from the camera/update flow returns to Task Detail
4. hero no longer renders the top project-label string
5. hero no longer renders a `Next step` card
6. hero remains the only sticky card at the top of the page
7. one merged info card renders below the hero and scrolls with the page
8. the lower delegation section is removed entirely
9. no visible `Progress update` button remains
10. no promoted primary footer CTA appears on Task Detail
11. the evidence section is removed entirely
12. the separate subtasks card is removed entirely
13. the work thread is the only progress surface
14. work thread is newest-first
15. thread metadata aligns to the rail in the order Date, user, %
16. photo entries render one large photo with a smaller thumbnail strip when applicable
17. subtask updates render as normal chronological thread entries with lightweight subtask context
18. in-thread lead photos preserve full-image visibility rather than aggressively cropping
19. tapping a thread photo opens a full-photo viewer that shows the entire selected image
20. detail/comment content renders inside the thread card body
21. text-only entries do not render fake photo placeholders
22. photo update form reopens in a clean state after submit
23. `Edit task details` is visible for task creators only

## Implementation Notes

This correction should be planned and executed as a focused follow-up to the current Task Detail redesign work. It should reuse the existing camera-routing behavior and as much of the current thread data model as possible, while rebalancing the screen structure into:

- one sticky hero card
- one scrolling merged info card
- one unified chronological work thread

The thread implementation must also support full-photo inspection from within the thread itself. The lead image should be preview-first but uncropped where possible, and tapping any photo must open a full-photo viewer.

The most important conceptual change is that Task Detail should no longer separate subtask progress from the main progress narrative. Subtask activity belongs inside the same work thread as parent-task activity.

## Implementation Status

This spec supersedes the previous correction state. The earlier implementation established a thread-only layout, but a new follow-up correction is now required to:

- keep only the hero card sticky
- introduce one scrolling merged info card under the hero
- combine description, delegation, and compact details into that merged card
- remove the separate subtasks card entirely
- merge subtask progress/activity into the main chronological work thread

Any future implementation plan should treat this updated spec as the source of truth.
