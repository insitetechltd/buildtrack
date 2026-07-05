# Task Detail Correction Design

**Date:** 2026-07-05  
**Scope:** Follow-up correction pass for Task Detail after rejecting the separate evidence-stage model.

## Goal

Refine Task Detail into a simpler, tighter operational surface:

- no separate evidence section
- no duplicate delegation section below the hero
- one clear update surface: the work thread
- photo-forward thread entries with tight metadata
- cleaner visual density and less duplicated chrome
- fresh photo-update forms after every submission

This is still a focused correction pass to the existing Task Detail redesign, not a new independent product slice.

## Approved Direction

The approved direction is now:

- dynamic bottom-nav camera behavior on Task Detail remains
- no dedicated top camera shortcut
- no visible `Progress update` button
- text-only updates still go through comment for now
- back from the camera/update flow returns to Task Detail
- compact hero with no project-label string above the title
- no `Next step` card in the hero
- delegation lives only in the hero
- the lower delegation section is removed entirely
- visible inline secondary actions remain
- creator-only visibility for `Edit task details` remains
- the separate evidence section is removed entirely
- the work thread becomes the only update surface
- newest-first thread order remains
- approved layout is **Option B**
- metadata aligns with the thread rail in this order: **Date, user, %**
- each thread entry contains media and comment only
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

### 2. Hero and Delegation

The hero remains compact and continues to own task identity and ownership.

Approved behavior:

- remove the low-value project-label string above the title
- let the title remain the first strong line
- let the first status chip carry quick task-state context
- remove the `Next step` card entirely
- keep delegation only inside the hero
- remove the lower delegation section entirely
- keep critical state as a compact flag/badge in the hero title area

#### Reasoning

- the screen should have one clear ownership surface
- duplicated delegation below the media/thread area weakens hierarchy
- hero = task identity + ownership remains a clear, stable model

### 3. Remove the Evidence Section

The standalone evidence section is removed entirely.

Approved behavior:

- no pinned evidence section
- no separate active-entry stage
- no staged photo surface above the work thread
- all update storytelling happens through the work thread itself

#### Reasoning

- the separate evidence surface is visually heavy and not pleasing in this product context
- the screen becomes easier to understand when there is only one update narrative
- removing the extra section frees vertical space and reduces duplication

### 4. Work Thread as the Only Update Surface

The work thread becomes the sole update narrative on Task Detail.

Approved behavior:

- newest-first order remains
- each entry is self-contained
- thread point / rail carries the tight metadata row
- card body carries media and comment content only

This is the approved **Option B** direction.

#### Reasoning

- the thread already feels structurally right
- aligning metadata to the rail improves scannability
- keeping media + comment in the card makes each update visually tight

### 5. Thread Entry Layout

Each work-thread entry should use the following structure.

#### Metadata rail row

Aligned with the thread point:

- Date
- user
- %

This order is mandatory.

The metadata row should be visually tight and label-light.

#### Entry card body

Inside the card:

- one large lead photo at the top when photos exist
- a small thumbnail strip when more than one photo exists
- the comment below the media, if present

The card should not repeat the metadata row inside the body.

#### Photo-bearing entry

- one large photo at the top
- small thumbnail strip below if more than one
- compact spacing
- comment below if present

#### Text-only entry

- no fake evidence placeholder
- no large empty photo block
- just the compact thread card with comment content if present

#### Document/PDF entry

- compact document tile inside the thread card
- comment below if present
- still uses the same Date / user / % rail metadata

#### Reasoning

- metadata belongs to the timeline structure
- media and comments belong to the card body
- this split produces a calmer, tighter thread layout

### 6. Information Density

The work thread should be much tighter than the current design.

Approved behavior:

- remove large sectional labels such as `Photo evidence`
- remove redundant descriptive helper copy
- reduce padding inside thread cards
- keep comments as the only longer text block
- let media dominate photo updates

#### Reasoning

- the current design is still visually padded and repetitive
- the target direction is compact, operational, and easy to scan

### 7. Action Hierarchy

The action hierarchy remains fully inline:

- no promoted primary footer CTA
- visible inline secondary actions remain lower in the screen
- `Edit task details` appears only for the creator

This part of the prior correction direction remains unchanged.

### 8. Photo Update Form Reset

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

1. compact task hero with delegation
2. newest-first work thread
3. subtasks
4. visible inline secondary actions

Explicit removals from the current version:

- no separate Task Detail top camera button
- no standalone large `Mark critical` section
- no project-label string above the task title
- no visible `Progress update` button
- no `Next step` card in the hero
- no lower delegation section
- no evidence section

## Interaction Rules

### Camera

- Task Detail active: bottom-nav camera routes to same-task photo update flow
- leaving the camera/update flow via back returns to Task Detail
- any other screen: bottom-nav camera retains global capture behavior

### Hero

- no project-label string above the title
- title is the first strong line
- no `Next step` card
- delegation exists only in the hero
- no lower delegation card remains

### Work Thread

- newest first
- metadata aligns to the thread rail
- metadata order is Date, user, %
- entry card body contains media + comment only
- no separate evidence section above the thread

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
6. delegation is rendered only inside the hero
7. the lower delegation section is removed entirely
8. no visible `Progress update` button remains
9. no promoted primary footer CTA appears on Task Detail
10. the evidence section is removed entirely
11. the work thread is the only update surface
12. work thread is newest-first
13. thread metadata aligns to the rail in the order Date, user, %
14. photo entries render one large photo with a smaller thumbnail strip when applicable
15. comments render inside the thread card body
16. text-only entries do not render fake photo placeholders
17. photo update form reopens in a clean state after submit
18. `Edit task details` is visible for task creators only

## Implementation Notes

This correction should be planned and executed as a focused follow-up to the current Task Detail redesign work. It should reuse the current screen, camera-routing behavior, and thread data model where possible, while removing the separate evidence-stage concept entirely.

The most important conceptual change is that Task Detail should no longer split update storytelling across an evidence section and a thread. The work thread alone becomes the update surface.

## Implementation Status

This spec supersedes the previous correction state. The earlier implementation established a compact hero and a staged evidence-first model, but a new follow-up correction is now required to:

- remove the lower delegation section entirely
- remove the evidence section entirely
- move to a thread-only update model
- implement Option B with rail metadata ordered as Date, user, %
- reset the photo-update form fully after every submit

Any future implementation plan should treat this updated spec as the source of truth.
