# Form Tab Navigation Design

Date: 2026-07-02

## Goal

Standardize hardware-keyboard `Tab` behavior across all user-facing forms and modals so pressing `Tab` advances to the next editable field consistently, including in multiline fields such as task description, comments, and update notes.

## Problem

Current form behavior is inconsistent. In at least `CreateTaskScreen`, keyboard navigation does not reliably move focus to the next field, and similar inconsistencies are likely present across other user-facing forms and edit modals.

This creates three UX problems:

- keyboard users cannot predict what `Tab` will do from one form to another
- multiline inputs behave differently from single-line inputs in a way that slows structured form entry
- form completion flow is mixed up with shell/navigation behavior

## Approved Decisions

### 1. Canonical Tab Behavior

- `Tab` moves focus to the next editable text field in the active form.
- `Shift+Tab` moves focus to the previous editable text field where the platform event path supports modifier detection.
- Hidden, disabled, locked, read-only, or unmounted fields are skipped.
- Multiline fields do **not** capture `Tab` for indentation; they also advance to the next field.

### 2. Coverage Scope

This standard applies to all current **user-facing forms and modals** with editable text input, including:

- `CreateTaskScreen`
- `LoginScreen`
- `RegisterScreen`
- `CreateProjectScreen`
- `ProjectForm`
- `EditProjectModal`
- editable profile forms
- task action flows such as `UpdateProgressScreen`, `AddCommentScreen`, `RejectTaskScreen`, and `ReassignTaskScreen`
- user-facing admin and user-management edit flows that contain text entry

It also applies to modal and dialog forms, not just full-screen forms.

### 3. Bottom Bar Decision

The app-level bottom navigation bar with `Dashboard`, `Tasks`, `Create`, and `Reports` should **not** return as part of this work.

This is an explicit design decision:

- the previously removed bottom bar stays removed
- the simplified FAB-driven shell remains the preferred app-level experience
- form keyboard navigation must not depend on reintroducing app-level bottom navigation

### 4. Form vs Shell Navigation

`Tab` behavior is scoped to the **current form only**.

- `Tab` should move through the active form’s editable fields
- after the last editable field, focus should move to the form’s primary action when practical
- app-level shell controls such as FABs, profile triggers, and global navigation affordances must stay outside the normal text-entry tab sequence

### 5. Collapsible Card Body Decision

The shared card body used in task and dashboard summary cards should become **collapsible by default** rather than permanently expanded with placeholder content.

This is an explicit companion decision to the approved tab and bottom-navigation behavior:

- placeholder body copy such as `"Content is available and ready for composition"` should not be the default visible card experience
- card bodies should collapse completely when there is no meaningful rich content to show
- if photos or other meaningful rich content exist, the card may expose a collapsed affordance and expand on demand
- the app-level bottom navigation bar still stays removed in the intended UX direction; expandable card content must not be used as a reason to restore app-level navigation chrome
- form `Tab` behavior remains scoped to the active form only and does not traverse into card expansion or app-shell navigation

This preserves the refreshed styling while removing wasteful vertical spacing.

## Architecture

Implement a shared form-keyboard-navigation system with per-form field ordering.

### Shared Layer

Add a small reusable keyboard-navigation helper for React Native text inputs that:

- registers focusable text fields by form context
- stores ordering metadata
- resolves next and previous eligible fields
- skips non-focusable fields automatically
- provides a single handler for `Tab` and `Shift+Tab`

### Per-Form Layer

Each form or modal declares its ordered list of text-entry fields. Each participating input registers:

- field id
- input ref
- focusability state
- optional next/previous relationship if the form needs local overrides

This keeps the behavior shared while still letting forms with conditional sections or role-based fields define their own order safely.

## Interaction Rules

### Field Traversal

- `Tab` moves forward to the next registered editable field
- `Shift+Tab` moves backward when supported
- focus must not jump into chips, cards, picker triggers, or other non-text controls unless they are genuinely keyboard-editable controls in the same form contract

### Last Field Behavior

After the final editable field:

- focus should move to the primary submit/action control when that control is a sensible focus target
- otherwise, the field should blur cleanly

The goal is a predictable finish-to-submit flow, not indefinite cycling through unrelated controls.

### Multiline Behavior

Multiline fields such as:

- task description
- comments
- update notes

must still use `Tab` to advance focus. This is the approved behavior even though those fields are visually multiline.

### Conditional Fields

- A field only participates in the tab order when visible and editable.
- If a field becomes hidden or disabled while focused, focus should move to the next valid field.
- If a section is collapsed or not currently active, its fields are skipped rather than auto-expanded by keyboard traversal.

## Card Body Rules

These rules apply to shared task/project summary cards that currently use the container-card body region.

### Default Body State

- if no meaningful rich content exists, the card body is fully collapsed
- cards should not reserve body spacing purely for placeholder text
- metadata-first cards should remain compact by default

### Expandable Media State

- if uploaded photos or other meaningful media exist, the card may render a collapsed media affordance
- expanding the card should reveal only meaningful content such as photo thumbnails or media preview content
- collapsed cards should remain visually compact even when expandable

### Screen Targets

This decision specifically applies to the current regressions observed in:

- `DashboardScreen` project summary cards
- `TasksScreen` task cards using `ContainerCard`

The intended effect is:

- tighter dashboard project-summary formatting
- no wasteful spacing caused by placeholder container body content
- support for showing task-creation photos through an expandable/collapsible card body when that data exists

## Return Key Behavior

The `Return` or `Enter` key should keep platform-appropriate input semantics and should not replace the `Tab` standard.

Rules:

- intermediate single-line fields should use `next`-style return key behavior when appropriate
- the final meaningful field may use `done` or `submit` when appropriate
- `Tab` remains the guaranteed field-to-field traversal rule across forms

This keeps keyboard traversal deterministic without overloading return-key semantics.

## Bottom Action Bar Behavior

For screens that have a persistent form action area, such as a primary bottom action bar:

- the primary action may become the final focus target after the last editable field
- the bottom action area must not interrupt normal mid-form text traversal
- app-level navigation must not appear in the form tab order

This preserves a clean completion flow:

`field 1 -> field 2 -> field 3 -> primary form action`

not:

`field 1 -> field 2 -> app navigation -> field 3`

## Out Of Scope

This design does **not** require:

- reintroducing a global bottom navigation bar
- changing the simplified app shell away from FAB-driven access
- making non-text controls behave like text inputs
- redesigning form layout beyond what is necessary to support consistent keyboard traversal

This design also does not require:

- keeping placeholder container-card body copy visible when no content exists
- permanently expanding dashboard/task summary cards just to reserve space for possible future media

## Implementation Targets

The likely implementation work should cover:

- a shared keyboard-navigation helper or hook
- focused adoption in `CreateTaskScreen` first because the inconsistency is already visible there
- rollout across all user-facing forms and modals listed in scope
- targeted tests for forward traversal, multiline traversal, and last-field-to-primary-action behavior
- explicit exclusion of app-shell controls and non-text controls from normal text-field tab order, including FABs, profile triggers, picker triggers, and global navigation affordances
- final-field handling that moves focus to the primary form action or blurs cleanly, without making the bottom action area an interrupting mid-form tab stop
- container-card body behavior that collapses by default and expands only when meaningful media exists
- task-card support for uploaded-photo display in an expandable body
- dashboard project-summary contraction so cards stay compact when no rich body content exists

## Testing Requirements

Implementation should verify:

- `Tab` advances through the expected field order in each covered form
- multiline fields also advance correctly
- disabled/hidden fields are skipped
- the final field moves to the primary form action or blurs cleanly
- modal forms behave the same way as full-screen forms
- the removed app-level bottom bar is not reintroduced and is not part of focus traversal
- FABs, profile triggers, picker triggers, and other non-text shell controls are not included in the normal text-field tab sequence
- bottom action bars act only as final form-completion targets where appropriate, not as intermediate tab stops during text entry
- dashboard summary cards do not render wasteful placeholder body spacing
- task cards collapse body content when no meaningful content exists
- task cards can reveal uploaded photos through the approved expandable body behavior when photo data exists

## Risks And Guardrails

### Risks

- conditional field visibility may create broken focus chains if ordering is not dynamic
- React Native keyboard event differences may limit modifier handling such as `Shift+Tab` on some platforms
- some older screens may rely on one-off local input refs that conflict with a shared pattern

### Guardrails

- keep the shared helper small and explicit
- let forms opt into the shared registry incrementally
- preserve existing submission and validation behavior
- do not mix shell-navigation changes into this work

## Recommended Next Step

Write an implementation plan that:

1. introduces the shared form-keyboard navigation utility
2. applies it to `CreateTaskScreen` as the first visible proof point
3. rolls it out across the remaining user-facing forms and modals
4. adds focused regression tests for keyboard traversal behavior
