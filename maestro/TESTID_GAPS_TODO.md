# Maestro testID Gap Inventory — M-QA-03 FOUNDATION

This file catalogs every non-`id:` selector used in the two M-QA-03 critical Maestro journeys. Each entry is a missing `testID` to add (S-UX-01I gates implementation — no screen edits yet; track for post-gate delivery).

Priority scale:
- **P0**: breaks Maestro flows or makes them flaky on text/i18n changes. Required pre-M-QA-03-close.
- **P1**: text/string-match-only. Reliable today but breaks on copy tweaks or localization.

| Location (File:Line) | Screen / Surface | Current Selector (what Maestro used) | Proposed testID | Priority |
|---|---|---|---|---|
| journey-projectswitch-create-taskdetail-update.yaml:7 | Dashboard / empty-project-copy | text: `"Select a project to view the active project summary and queue overview."` | `dashboard-empty-state__no_project_selected` | P1 |
| journey-projectswitch-create-taskdetail-update.yaml:10 | ProfileMenu entry | text: `"Change Project"` | `profile-menu__change_project` | P0 |
| journey-projectswitch-create-taskdetail-update.yaml:12 | ProjectPicker row A | text regex: `.*Project A.*` (fallback text match) | `project-picker__row-project-a` (or generic: `project-picker__row-${projectId}`) | P0 |
| journey-projectswitch-create-taskdetail-update.yaml:14 (also 28,46) | ProjectPicker row B | text regex: `.*Project B.*` | `project-picker__row-project-b` (patterned) | P0 |
| journey-projectswitch-create-taskdetail-update.yaml:23 (also journey-login-switch-projects.yaml equivalent) | ProjectPicker row C | text regex: `.*Project C.*` | `project-picker__row-project-c` (patterned) | P0 |
| journey-projectswitch-create-taskdetail-update.yaml:67 | CreateTask form result | text regex: `${".*" + output.taskTitle + ".*"}` title match on create form | `create-task__field_title--preview` | P1 |
| journey-projectswitch-create-taskdetail-update.yaml:95 | TasksList screen row tap | text regex: `.*<taskTitle>.*` (no testID row wrapper) | `tasks-list__row-${taskId}` (or `tasks-list__row_0` for first visible) | P0 |
| journey-projectswitch-create-taskdetail-update.yaml:103 | TaskDetail header title | text regex: `.*<taskTitle>.*` header copy | `task-detail__header_title` | P1 |
| journey-projectswitch-create-taskdetail-update.yaml:110 | UpdateProgress title | text: `"Progress Update"` (screen heading) | `update-progress__screen_title` | P1 |
| journey-projectswitch-create-taskdetail-update.yaml:118 | UpdateProgress description-preview | text regex: `.*<progressNote>.*` inline value | `update-progress__description--preview` | P1 |
| journey-projectswitch-create-taskdetail-update.yaml:129 | UpdateProgress photo-picker prompt | text: `"Choose how you want to add photos"` (sheet title) | `photo-picker__sheet_title` | P1 |
| journey-projectswitch-create-taskdetail-update.yaml:132 | UpdateProgress photo-picker cancel | text: `"Cancel"` | `photo-picker__cancel` | P1 |
| journey-projectswitch-create-taskdetail-update.yaml:139 | UpdateProgress success toast | text regex: `.*Progress update added successfully!.*` | `update-progress__success_message` | P1 |
| journey-projectswitch-create-taskdetail-update.yaml:142 | UpdateProgress success toast confirm | text: `"OK"` | `update-progress__success_confirm` | P0 |
| journey-projectswitch-create-taskdetail-update.yaml:53 / CreateTask flow | CreateTask success confirm | text button "OK" (if shown instead of `create-task__submit-success-confirm`) | `create-task__submit-success_confirm_alt` (alias check) | P1 |
| journey-login-switch-projects.yaml:8, 18, 29, 40 | ProfileMenu project switch entry | text: `"Change Project"` (shared) | `profile-menu__change_project` (shared, listed above) | P0 |
| journey-login-switch-projects.yaml:12, 22, 32, 44 | ProjectPicker row taps A/B/C | text regex matchers (shared) | `project-picker__row-${id}` (shared) | P0 |
| (shared across flows) | ProjectPicker root container (asserting list rendered) | `id:project-picker__root` already exists per journey 4 — OK | — | — |
| (shared) | Login submit, Dashboard root, Tasks tab pressable, camera FAB, createTask-title, create-task submit-inline, tasks-search input, task-detail quick-action-update_progress, update-progress submit, detail bottom action bar | ALL already `id:` selectors per flows — OK | — | — |

## Notes

- All project row selectors should converge on a patterned `project-picker__row-${projectId}` so flows can use `id:` instead of project-name text which changes per sandbox seed.
- The `"Change Project"` entry point in ProfileMenu/HeaderPopover is the single highest-impact missing testID (P0 shared across 3 flows currently).
- Toast/success messages (`OK`, `Progress update added successfully!`) are P1 because strings are stable today; they become P0 if we ever localize.
- CreateTask success block in `task-core-live-create.yaml` already exposes `create-task__submit-success-confirm` — align any alternate success modal surface to that same id.
