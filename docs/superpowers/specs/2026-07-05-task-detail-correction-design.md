# Task Detail Correction Design

**Date:** 2026-07-05  
**Scope:** Refinement pass for Task Detail after the sticky-hero simplification, focused on readability, stronger containment, contextual quick actions, balanced navigation spacing, and better photo handling.

## Goal

Refine Task Detail into a more legible and operational mobile screen:

- hero stays fixed but no longer feels like a floating overlay
- scrollable content lives in a bounded region below the hero and above the bottom nav
- hero no longer repeats delegation
- merged info card remains the single task-context card
- all small typography becomes meaningfully readable on a phone
- quick actions become contextual to task state
- bottom navigation spacing becomes visually balanced
- in-thread photos preserve the full image and full-screen mode supports swipe browsing

This remains a focused correction pass to the existing Task Detail redesign, not a new independent product slice.

## Approved Direction

The approved direction is now:

- dynamic bottom-nav camera behavior on Task Detail remains
- no dedicated top camera shortcut
- no visible `Progress update` button
- text-only updates still go through comment for now
- back from the camera/update flow returns to Task Detail
- the hero card remains the only fixed top card
- delegation is removed from the hero entirely
- the hero card keeps title and quick status/progress context only
- the merged info card remains directly under the hero and continues to scroll with content
- the merged info card contains description, delegation, and compact details
- the lower delegation section remains removed
- the separate evidence section remains removed
- the separate subtasks card remains removed
- the work thread remains the main progress body
- the work thread includes both parent-task and subtask updates in one chronological flow
- newest-first thread order remains
- metadata remains aligned to the thread rail in this order: **Date, user, %**
- small/secondary text throughout Task Detail should increase by two size steps
- the scrollable area should begin below the hero and end above the bottom nav so content never scrolls behind the hero
- the bottom navigation should use equal visual spacing between Activity, Camera, and Tasks
- a new **Quick Actions** row should sit below the merged info card and above the thread
- quick actions are contextual by state:
  - before acceptance: `Accept`, `Reject`
  - active work: `Photo Update`, `Add Comment`, `Add Subtask`
  - review / approval states:
    - contributor state: `Submit for Review`, `Add Comment`, `Photo Update`
    - approver/reviewer state: `Approve`, `Reject`, `Add Comment`
- lower-frequency actions remain in a separate lower `Other actions` area
- thread photos should preserve the full image in-card without cropping top or bottom
- tapping any thread photo opens a full-screen viewer
- full-screen photo viewer supports left/right swiping through all photos for that same thread entry
- photo-update form must still reset fully after submit so reopening starts fresh

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
- keeps photo updates tightly attached to task context
- allows the camera icon to remain semantically photo-first rather than a generic creation menu

### 2. Fixed Hero Card

The hero remains the only fixed top card, but it must become lighter and more anchored.

Approved behavior:

- hero is fixed below the screen header
- hero no longer includes delegation
- hero keeps:
  - title
  - quick status chips
  - progress/completion context
  - critical marker if applicable
- hero no longer renders project label above the title
- hero no longer renders `Next step`

#### Reasoning

- fixed regions must remain concise or they feel heavy
- removing delegation avoids duplication with the merged info card
- the hero’s role is identity + live status, not detailed context

### 3. Bounded Scroll Region

The scrolling content should no longer move behind the hero.

Approved behavior:

- the hero is outside the main scrollable content region
- a bounded scroll container begins below the hero
- that scroll container ends above the bottom navigation bar
- the merged info card, quick actions, work thread, and lower actions live inside this bounded scroll region

#### Reasoning

- the current sticky treatment feels like the hero is floating over content
- seeing thread text scroll behind the hero weakens containment
- a bounded content region creates a cleaner, more intentional mobile layout

### 4. Scrolling Merged Info Card

Directly below the fixed hero, there should be one compact merged card that scrolls with content.

Approved behavior:

- one merged info card only
- combine:
  - description
  - delegation
  - compact task details
- do not split this into multiple stacked cards

Suggested order inside the card:

1. description
2. delegation
3. compact details such as due date / reference / supporting metadata

#### Reasoning

- one merged card is calmer than several stacked cards
- delegation remains important, but belongs in the info card rather than the hero
- this preserves detail without making the fixed top region too heavy

### 5. Typography and Readability

All small and secondary text on Task Detail should become more readable.

Approved behavior:

- increase all small text by roughly two size steps
- typical mapping:
  - `text-xs` → approximately `text-base`
  - `text-sm` → approximately `text-lg`
- use color and weight, not tiny size, to create hierarchy
- tiny uppercase helper text should remain readable rather than decorative

#### Reasoning

- current small fonts are too small for comfortable reading on a phone
- readability is more important than squeezing information density
- hierarchy should come from contrast, spacing, and weight, not unreadable text

### 6. Quick Actions Row

The top action surface should become a contextual Quick Actions row.

Approved behavior:

- place `Quick Actions` below the merged info card and above the work thread
- keep it inside the bounded scroll region
- do not make it sticky
- this row holds only high-frequency, highly relevant actions

#### State logic

##### Before acceptance

Show:

- `Accept`
- `Reject`

##### Active work

Show:

- `Photo Update`
- `Add Comment`
- `Add Subtask`

##### Review / approval

Contributor state shows:

- `Submit for Review`
- `Add Comment`
- `Photo Update`

Approver / reviewer state shows:

- `Approve`
- `Reject`
- `Add Comment`

#### Reasoning

- the most relevant actions should be near the top of the content area
- quick actions should match the user’s immediate task state
- a camera button should remain photo-first rather than becoming a disguised generic action switcher

### 7. Lower-Frequency Actions

Lower-frequency or administrative actions should remain separated from Quick Actions.

Approved behavior:

- keep a separate lower `Other actions` area beneath the thread
- place actions such as:
  - `Edit task`
  - `Reassign`
  - other lower-frequency or admin actions

#### Reasoning

- keeps the top action row honest and lightweight
- prevents frequent execution actions from being mixed with admin/edit actions

### 8. Unified Chronological Work Thread

The work thread remains the main progress body of Task Detail.

Approved behavior:

- newest-first order remains
- parent-task activity and subtask activity stay merged into one chronological thread
- each entry is self-contained
- thread point / rail carries the tight metadata row
- card body carries media and comment/detail content
- subtask entries include lightweight subtask context

#### Reasoning

- progress is easiest to understand when the user sees one chronological narrative
- separating subtask progress weakens causality

### 9. Thread Entry Layout

Each work-thread entry should use the following structure.

#### Metadata rail row

Aligned with the thread point:

- Date
- user
- %

This order is mandatory.

The metadata row should remain visually tight but now with larger readable type.

#### Entry card body

Inside the card:

- one large lead photo at the top when photos exist
- a small thumbnail strip when more than one photo exists
- the comment/detail below the media, if present

The card should not repeat the metadata row inside the body.

#### Parent-task entry

- renders as a normal work-thread card

#### Subtask entry

- renders as a normal work-thread card within the same chronological thread
- includes lightweight subtask context such as subtask title and a subtle `Subtask` marker
- does not create a nested or separate thread

#### Text-only entry

- no fake evidence placeholder
- no large empty photo block
- just the compact thread card with detail/comment content if present

#### Document/PDF entry

- compact document tile inside the thread card
- detail/comment below if present
- still uses the same Date / user / % rail metadata

### 10. Photo Display Behavior

#### In-thread display

- the lead photo should span the available card width
- the lead photo should always be tall enough to display the whole image without cropping the top or bottom
- preserve the full image within the in-thread card using fit/contain-style behavior rather than aggressive crop/cover behavior

#### Full-screen viewer

- tapping the lead photo or any thumbnail should open a true full-screen viewer
- the full-screen viewer opens on the selected photo
- the full-screen viewer displays the image using contain/fit behavior
- the user can swipe left and right to browse other photos from the same thread entry
- the viewer should not jump across different thread entries
- include a clear close affordance or tap-to-dismiss behavior

#### Reasoning

- field users often need the full photo, not a cropped preview
- cropping top or bottom can hide critical evidence
- full-screen mode should behave like a lightweight gallery, not a static single-image modal

### 11. Bottom Navigation Balance

The bottom navigation should feel spatially balanced.

Approved behavior:

- Activity, Camera, and Tasks use three equal visual slots
- the camera may remain visually emphasized, but spacing must still be equalized
- Activity and Tasks should not appear pushed away from the camera

#### Reasoning

- the current bar feels imbalanced because the center camera visually distorts spacing
- equal slot spacing produces a calmer and more intentional navigation rhythm

### 12. Photo Update Form Reset

The photo-update form must still reset completely after a successful submission.

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

1. screen header
2. fixed hero card
3. bounded scroll region containing:
   - merged info card
   - Quick Actions
   - newest-first unified work thread
   - lower `Other actions`

Explicit removals from the current version:

- no separate Task Detail top camera button
- no standalone large `Mark critical` section
- no project-label string above the task title
- no visible `Progress update` button
- no `Next step` card in the hero
- no delegation inside the hero
- no lower delegation section
- no evidence section
- no separate subtasks card

## Interaction Rules

### Camera

- Task Detail active: bottom-nav camera routes to same-task photo update flow
- leaving the camera/update flow via back returns to Task Detail
- any other screen: bottom-nav camera retains global capture behavior

### Hero

- fixed at the top below the screen header
- compact task identity and quick status only
- no delegation

### Scroll Region

- begins below the hero
- ends above the bottom nav
- no thread content scrolls behind the hero

### Merged Info Card

- scrolls with content
- contains description, delegation, and compact details

### Quick Actions

- lives below the merged info card and above the work thread
- changes by task state and user role

### Work Thread

- newest first
- metadata order is Date, user, %
- includes both parent-task and subtask activity
- photo entries display the full image in-card
- tapping a photo opens a swipeable full-screen gallery for that entry’s photos

### Bottom Navigation

- Activity, Camera, and Tasks are equally spaced

### Edit Permissions

- `Edit task details` appears only for the creator or proper permission holders
- non-creators must not see edit-only actions unless role permits them

## Non-Goals

This correction pass does **not** include:

- a new batch capture review flow
- a new photo annotation model
- a new hidden action menu or bottom sheet pattern
- broader rearchitecture of Activity or Tasks information architecture

## Validation Targets

The correction is only complete if all of the following are true:

1. Task Detail no longer renders a separate top camera button
2. bottom-nav camera uses task-detail context when Task Detail is active
3. back from the camera/update flow returns to Task Detail
4. hero no longer renders the top project-label string
5. hero no longer renders a `Next step` card
6. hero no longer renders delegation
7. hero remains the only fixed top card
8. scrollable content begins below the hero and does not move behind it
9. one merged info card renders below the hero inside the bounded scroll region
10. the lower delegation section is removed entirely
11. no visible `Progress update` button remains
12. no promoted primary footer CTA appears on Task Detail
13. the evidence section is removed entirely
14. the separate subtasks card is removed entirely
15. the work thread remains the main progress surface
16. work thread is newest-first
17. thread metadata aligns to the rail in the order Date, user, %
18. all small/secondary Task Detail text is increased by roughly two size steps
19. quick actions appear below the info card and above the thread
20. quick actions change correctly by pre-acceptance, active work, and review/approval states
21. lower-frequency actions remain in a separate lower action area
22. Activity, Camera, and Tasks appear equally spaced in the bottom nav
23. in-thread lead photos preserve full-image visibility without cropping top or bottom
24. tapping a thread photo opens a full-screen viewer
25. the full-screen viewer supports left/right swiping across that entry’s photos
26. text-only entries do not render fake photo placeholders
27. photo update form reopens in a clean state after submit

## Implementation Notes

This correction should be planned and executed as a focused follow-up to the current Task Detail redesign work. It should reuse the existing camera-routing behavior and unified thread model where possible, while refining:

- the fixed hero into a lighter status-only card
- the content layout into a truly bounded scroll region
- the action model into a contextual quick-actions row
- the photo viewer into a swipeable gallery for each thread entry
- the bottom navigation into an equal-slot layout

The most important conceptual change is that Task Detail should now feel like a fixed-top operational shell with a clean, contained mobile content region beneath it, rather than a sticky overlay with content moving behind it.

## Implementation Status

This spec supersedes the previous sticky-hero simplification state. A new follow-up correction is now required to:

- remove delegation from the hero
- raise all small text to readable mobile sizes
- move from sticky overlay behavior to a true bounded scroll region
- add contextual Quick Actions by task state and role
- rebalance bottom navigation spacing
- make full-screen photo viewing swipeable across an entry’s photos

Any future implementation plan should treat this updated spec as the source of truth.
