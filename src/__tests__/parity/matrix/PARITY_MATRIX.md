# OLD vs NEW Database Parity Matrix

Source of truth for behavioral parity cells.  
Status after a run: `PASS` | `FAIL` | `SKIP` | `DELTA` | `KNOWN_OLD` | `PENDING`

**Target:** `PARITY_TARGET=old` freezes golden baseline; `PARITY_TARGET=new` must match (modulo documented `DELTA`).

---

## A. Schema presence (read-only)

| ID | Check | OLD expected | NEW expected | Status |
|----|-------|--------------|--------------|--------|
| S-01 | Tables: companies, users, projects, user_project_assignments, tasks, task_activities | present | present | PENDING |
| S-02 | `task_read_status` | present | present | PENDING |
| S-03 | `project_locations` | present | present | PENDING |
| S-04 | `roles` | present if used | present or DELTA | PENDING |
| S-05 | Redesign cols and/or `task_assignments` | cols OR `assigned_to[]` | relational preferred | PENDING |
| S-06 | Anon SELECT on `tasks` | baseline record (may succeed) | must fail → `DELTA-SEC` | PENDING |
| S-07 | RLS enabled flags inventory | inventory | all client tables ON | PENDING |

## B. Auth & profile

| ID | Actor | Operation | Assert | Status |
|----|-------|-----------|--------|--------|
| A-01 | Tristan | login email/password | session + users row | PENDING |
| A-02 | phone-mapped | login via phone→email | same as authStore | PENDING |
| A-03 | Pending | login | blocked / PENDING_APPROVAL | PENDING |
| A-04 | Tristan | session restore cold | initialize recovers user | PENDING |
| A-05 | Tristan | change password | old fails, new works | PENDING |
| A-06 | Tristan | update profile name | users reflects | PENDING |
| A-07 | — | auth↔public.users sync | no orphans | PENDING |
| A-08 | Admin | approve Pending | is_pending=false | PENDING |
| A-09 | Admin | reject Pending | auth + users gone | PENDING |

## C. Companies / projects / assignments

| ID | Actor | Operation | Assert | Status |
|----|-------|-----------|--------|--------|
| P-01 | Admin | create company | row exists | PENDING |
| P-02 | Admin | create project | row + creator | PENDING |
| P-03 | Admin | assign Herman to Harbor | UPA active | PENDING |
| P-04 | Admin | remove Herman | inactive or deleted per OLD | PENDING |
| P-05 | Admin | update project_role/category | value sticks | PENDING |
| P-06 | Tristan | fetchProjects | Harbor + Penthouse | PENDING |
| P-07 | Herman | fetchProjects | Harbor only (isolation) | PENDING |
| P-08 | Tristan | setSelectedProject | last_selected_project_id | PENDING |
| P-09 | Tristan | workspace bootstrap offline | local fallback | PENDING |

## D. Task lifecycle

| ID | Actor | Operation | Assert | Status |
|----|-------|-----------|--------|--------|
| T-01 | Tristan | createTask on Harbor | status new; activities | PENDING |
| T-02 | Herman | acceptTask | accepted/in_progress per OLD | PENDING |
| T-03 | Herman | declineTask | declined + reason | PENDING |
| T-04 | Herman | addTaskUpdate progress | activity + % | PENDING |
| T-05 | Herman | submitTaskForReview | submitted_for_review | PENDING |
| T-06 | Tristan | acceptTaskCompletion | approved | PENDING |
| T-07 | Tristan | rejectTaskCompletion | rejected + reason | PENDING |
| T-08 | Tristan | reassign/assignTask | assignees updated | PENDING |
| T-09 | Tristan | cancelTask | soft cancel | PENDING |
| T-10 | Tristan | archiveTask | archived fetch | PENDING |
| T-11 | Tristan | soft delete | hidden from active | PENDING |
| T-12 | Tristan | updateTask metadata | round-trip | PENDING |
| T-13 | Herman | createTask | match OLD allow/deny | PENDING |
| T-14 | Admin | createTask | match OLD allow/deny | PENDING |

## E. Subtasks / tree

| ID | Operation | Assert | Status |
|----|-----------|--------|--------|
| U-01 | createSubTask / nested | parent/nesting/root | PENDING |
| U-02 | updateSubTaskStatus | independent status | PENDING |
| U-03 | accept/decline/reject subtask | lifecycle parity | PENDING |
| U-04 | deleteSubTask | soft/cascade matches OLD | PENDING |

## F. Activities & ledger

| ID | Operation | Assert | Status |
|----|-----------|--------|--------|
| L-01 | fetchTaskById | chronological activities | PENDING |
| L-02 | fetchTasksByProject | activities scoped to task IDs | PENDING |
| L-03 | trackTaskEdit / notify | unread semantics | PENDING |
| L-04 | addAssignerComment | comment visible | PENDING |

## G. Read status & stars

| ID | Operation | Assert | Status |
|----|-----------|--------|--------|
| R-01 | markTaskAsRead | task_read_status upsert | PENDING |
| R-02 | getUnreadTaskCount | same count formula | PENDING |
| R-03 | toggle star | starred includes user | PENDING |
| R-04 | Accept clears star | match OLD | PENDING |

## H. Locations

| ID | Operation | Assert | Status |
|----|-----------|--------|--------|
| O-01 | ensureProjectLocation | unique label per project | PENDING |
| O-02 | fetchProjectLocations | Harbor list | PENDING |
| O-03 | createTask with location_on_site | persists | PENDING |

## I. Storage

| ID | Operation | Assert | Status |
|----|-----------|--------|--------|
| F-01 | uploadFile special chars | object exists | PENDING |
| F-02 | getFileUrl / retrieve | bytes readable | PENDING |
| F-03 | deleteFile | object gone | PENDING |
| F-04 | path prefix companyId/... | convention held | PENDING |

## J. Roles catalog

| ID | Operation | Assert | Status |
|----|-----------|--------|--------|
| C-01 | fetchRoles | match OLD emptiness | PENDING |
| C-02 | create/update/delete role | if OLD supports else SKIP | PENDING |

## K. Realtime / refresh

| ID | Operation | Assert | Status |
|----|-----------|--------|--------|
| Z-01 | second fetch after mutation | sees new status | PENDING |
| Z-02 | forceRefresh by project | data matches DB | PENDING |

## L. Permission matrix

| Op | Admin | Tristan | Herman | Pending | Anon | Status |
|----|-------|---------|--------|---------|------|--------|
| L-HARBOR Read Harbor tasks | Y | Y | Y | N | N* | PENDING |
| L-PENT Read Penthouse tasks | Y | Y | N | N | N* | PENDING |
| L-APPROVE Approve completion | Y? | Y | N | N | N | PENDING |
| L-REJECT Reject user | Y | N | N | N | N | PENDING |
| L-CPROJ Create project | Y | ? OLD | N | N | N | PENDING |

\* Anon: OLD may allow (`DELTA-SEC`); NEW must deny.

## Documented intentional deltas

| ID | Description |
|----|-------------|
| DELTA-SEC | Anon unrestricted SELECT blocked on NEW |
| DELTA-ADMIN | Client `auth.admin` → Edge Function; same end state |
| DELTA-FETCH | Global fetchTasks may become project-scoped; assert active-project data |

## Cell ownership

| Range | Owner area |
|-------|------------|
| S-* | Schema probes |
| A-* | Auth ops |
| P-* | Project ops |
| T-*, U-*, L-* | Task ops |
| R-*, O-*, F-*, C-*, Z-* | Supporting ops |
| L-* permission rows | Isolation matrix |
