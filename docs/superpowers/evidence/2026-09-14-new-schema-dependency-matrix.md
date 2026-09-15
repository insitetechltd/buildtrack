# NEW vs OLD schema dependency matrix

- Captured: 2026-09-14 UTC
- App SHA: `4286566` (at audit start; re-verify at cutover)
- Refs: DEV `zusulknbhaumougqckec` (OLD evolved) · PROD `jcnzjigxgkzhjsaekoqz` (NEW greenfield)
- Plan: PROD NEW SoT Harden — Phase 0
- Rule: no “unused / safe to drop” claim without a row in this matrix

## Pair scoreboard

| Pair | OLD | NEW | Verdict | Blockers |
|---|---|---|---|---|
| ACL | `users.role` | `users.system_permission` | **dual-path required** | `authStore.updateUser`, `userStore.createUser/updateUser` write `role` only |
| UPA role | `category` | `project_role` | **dual-path required** | App SoT OK; Maestro seed OLD-only |
| UPA time | `assigned_at` | `created_at` | **dual-path required** | Helper OK; legacy `projectStore.ts` dead |
| Assignees | `assigned_to` (+ primary/delegated) | `task_assignments` | **dual-path required** | Create has junction fallback; **reads/updates OLD-only** |
| Status | `current_status` + flags | `tasks.status` | **dual-path required** | Create strips; **updateTask dual-writes without evolved strip** |
| Files/stars | `attachments` / `starred_by_users` | `task_files` / `task_stars` | **OLD still SoT (blocker)** | Zero production writes to NEW tables |
| Metadata | `accepted*`, `decline_reason`, unread flags | mostly unused on NEW | **OLD / dual-path** | Update path unprotected |

## Pair 1 — ACL (`role` ↔ `system_permission`)

| File | Symbol | Class | Path |
|---|---|---|---|
| `src/state/authStore.ts` | `normalizeAuthUser` | read | dual-path |
| `src/state/authStore.ts` | `updateUser` → `{ role }` | write | **OLD only — PROD blocker** |
| `src/state/userStore.supabase.ts` | `mapSupabaseUser` | read | dual-path |
| `src/state/userStore.supabase.ts` | `createUser` / `updateUser` | write | **OLD only — PROD blocker** |
| `src/state/taskStore.supabase.ts` | archive `select(name, role, system_permission)` | read | fragile both-cols |
| `src/types/buildtrack.ts` | `getUserSystemPermission` | read | dual-path |
| `supabase/functions/invite-user/index.ts` | upsert/load seats/caller | read/write | dual-path |
| `supabase/functions/billing-subscription-status/index.ts` | caller load | read | dual-path (both-first fragile) |
| `supabase/functions/cancel-subscription/index.ts` | caller load | read | dual-path (both-first fragile) |
| `supabase/functions/create-checkout-session/index.ts` | caller ACL | read | dual-path |
| `supabase/functions/stripe-webhook/index.ts` | `detectUserAdminColumns` | write | dual-path |
| `src/state/authStore.supabase.ts` | legacy | read/write | **dead** (not imported) |

## Pair 2 — UPA role (`category` ↔ `project_role`)

| File | Symbol | Class | Path |
|---|---|---|---|
| `src/state/projectStore.supabase.ts` | `insertUserProjectAssignmentRow` / `updateUserProjectAssignmentCategoryRow` | write | dual-path |
| `src/state/projectStore.supabase.ts` | `readAssignmentCategory` | read | dual-path |
| `scripts/maestro/ensure-dual-user-project-data.cjs` | seed insert | write | **OLD only** |
| `supabase/functions/owner-tenant-read/index.ts` | member lists | read | dual-path |

## Pair 3 — UPA timestamp (`assigned_at` ↔ `created_at`)

| File | Symbol | Class | Path |
|---|---|---|---|
| `src/state/userProjectAssignmentQuery.ts` | `selectActiveUserProjectAssignments` | order | dual-path |
| `src/state/projectStore.ts` | `.order('assigned_at')` | order | **dead** legacy store |

## Pair 4 — Assignees

| File | Symbol | Class | Path |
|---|---|---|---|
| `src/state/taskDeferredSchemaCompat.ts` | `buildSupabaseTaskInsertPayload` | write | OLD |
| `src/state/taskStore.supabase.ts` | `createTask` strip → `task_assignments` | write | dual-path (create only) |
| `src/state/taskStore.supabase.ts` | `updateTask` / `assignTask` / `triageTask` | write | **OLD only** |
| `src/state/taskStore.supabase.ts` | `fetchListableTasksAssignedToUser` `.contains(assigned_to)` | filter | **OLD only** |
| `src/state/taskQueryPredicates.ts` | `isTaskAssignedToUser` | filter | OLD |
| Edge `owner-tenant-read` | assignee filters | filter | OLD |
| `src/__tests__/parity/adapters/taskWrite.adapter.ts` | `writeAssignees` | test-only | dual-path |

## Pair 5 — Status

| File | Symbol | Class | Path |
|---|---|---|---|
| `buildSupabaseTaskInsertPayload` | status + current_status + accepted | write | dual |
| `createTask` | evolved strip | write | dual (create) |
| `updateTask` / `addTaskUpdate` | both status cols | write | **PROD risk — no evolved strip** |
| `taskQueryPredicates.taskEffectiveStatus` | `status ?? current_status` | read | dual |

## Pair 6 — Files / stars

| File | Symbol | Class | Path |
|---|---|---|---|
| `taskStore` create/update/toggleStar | attachments / starred_by_users | write/read | **OLD SoT** |
| `src/api/fileUploadService.ts` | storage upload | write | storage only; no `task_files` |
| migrations `task_files` / `task_stars` | DDL | schema | NEW unused by app |

## Pair 7 — Metadata (`accepted_by/at`, `decline_reason`, unread flags)

Written on accept/decline/edit-notify via `updateTask` without evolved strip → PROD PGRST204 risk. `location` jsonb dead write in SoT (superseded by `location_on_site`).

## Cross-checks

- Owner contract (`documentation/owner-task-query-contract.md`): Taskr SoT still documents OLD assignee arrays until Human Gate — **conflicts with PROD NEW**; cutover must update contract.
- Parity adapter proves NEW write pattern exists but is **test-only**.
- Prior QA (`.cache/dual-env-qa-20260914/`) = input only, not substitute for this matrix.

## Phase 0 gate (for Human review)

**Cutover is justified:** PROD is intentional NEW; app lag is the defect.

**Must fix before PROD P01–P08 GO (no OLD columns on PROD):**

1. ACL dual-write (`system_permission` fallback)
2. Assignee read/write via `task_assignments` when `assigned_to` missing
3. Status/update evolved-column strip (or NEW-only writes)
4. Attachments/stars: NEW tables or strip-without-losing evidence (activity photos / storage paths)
5. Ban both-column ACL SELECTs in Edge billing/cancel

**Do not** re-add `accepted` / `assigned_to` / `role` to PROD as stabilize strategy.
