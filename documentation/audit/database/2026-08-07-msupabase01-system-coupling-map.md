# WS-SUPABASE-01 System Coupling Map — App → Supabase

**Date:** 2026-08-07
**Classification:** M-SUPABASE-01 deliverable A — inspection-only, 0-writes
**Live DB audit:** skipped; code-path only (Assumption A1 — no `~/.pgpass`)
**Predecessor input (superseded as reference):** `2026-07-12-supabase-technical-audit.md` historical
**Source-of-truth framing:** aligned to `documentation/SOURCE_OF_TRUTH.md`: stores use a Hybrid model — Supabase DB is the final persistence authority; app-layer Zustand caches are *cache authorities* for read performance, invalidated by Realtime `postgres_changes` events, with optimistic writes followed by rollback on error.

---

## § authStore.supabase.ts

### Coupling arrows
| Arrow | Table / subsystem | Operations used | RLS context |
| --- | --- | --- | --- |
| Login | `supabase.auth.signInWithPassword` | Sign in → session | Uses GoTrue `auth.users` table under the hood; authenticates as `authenticated` role on success |
| Session | `supabase.auth.getSession` | Read current session | Read-only client |
| Sign-out | `supabase.auth.signOut` | Destroy session | Client auth reset |
| First-run profile create (sign-up flow inside authStore line ~234–260) | `public.users` INSERT | Insert role + company_id + is_pending after signup | authenticated role; RLS on `public.users` MUST allow insert-by-self or signup flow breaks |
| Profile hydrate after login (line ~131, ~297, ~483, ~544) | `public.users` SELECT by auth.uid() | Read row, map role → systemPermission (worker → member fallback per role-analysis migration complete) | authenticated role, RLS `using (auth.uid() = id)` expected |
| Profile update (line ~354–388) | `public.users` UPDATE by id | Set role / company_id; map systemPermission ↔ role (bidirectional) | authenticated role, must be same user OR company admin |

### Source-of-truth claim
**Hybrid.** `auth.users` (GoTrue) = absolute authority for session / password / email. `public.users` = authority for role / company_id / is_pending / profile fields. authStore writes role changes to `public.users` first, then refreshes the local cache; RealtimeSyncManager **users channel UPDATE events** invalidate the Zustand cache on remote changes.

---

## § userStore.supabase.ts

### Coupling arrows
| Arrow | Table | Operations | RLS context |
| --- | --- | --- | --- |
| `fetchUsers()` / `fetchUsersByCompany()` | `public.users` SELECT + LEFT JOIN `companies(id, name, created_at)` | Read rows; map snake_case `is_pending` → camelCase `isPending` | authenticated, RLS on users + companies (user must have company visibility) |
| `setUser()` (accept invite, line ~164–195) | `public.users` UPDATE by id | Set `is_pending: false` + role fields | authenticated; inviter must be company_admin OR update-by-self |
| `updateUser()` mutations (lines 306, 323, 360, 400, 453, 500) | `public.users` UPDATE by id | Role, personal fields, company membership | authenticated role with company_admin gating expected in RLS |
| Realtime subscription (NOT in userStore — delegated to RealtimeSyncManager `users` channel, event=`UPDATE` only) | postgres_changes → `public.users` table | Push invalidation → re-run fetchUsers; UPDATE only because insert/delete handled via auth flows | Channel `users-changes`; payload → `useUserStore.getState().fetchUsers()` direct invalidation |

### Source-of-truth claim
**DB authority.** Users row changes are written once to Supabase; local Zustand users slice is a read-through cache invalidated by Realtime `users-changes` UPDATE events and by each write call's post-success `fetchUsers()`.

---

## § projectStore.supabase.ts

### Coupling arrows
| Arrow | Table(s) | Operations | Dedup model |
| --- | --- | --- | --- |
| `fetchProjects()` / `fetchProjectsByCompany()` / `fetchProjectsByUser()` / `fetchProjectById()` | `public.projects` SELECT; by-user route joins through `user_project_assignments`; dedup via `buildResourceKey(scope, id)` with per-resource `projectQueryMeta { hasFetchedOnce, isInitialLoading, entityVersion }` | No re-fetch if `hasFetchedOnce=true` + cached data present; `forceRefresh` bypasses |
| `fetchProjectUserAssignments(projectId)` | `public.user_project_assignments` SELECT by project_id | Dedup via `assignmentQueryMeta(assignments-project-<id>)` per-resource metadata — same pattern as projects; deduped at line ~845–921 `fetchUserProjectAssignments` |
| `createProject()` / `updateProject()` / `updateUserProjectCategory()` | `public.projects` INSERT/UPDATE; `public.user_project_assignments` INSERT/UPDATE/category column | Write-then-invalidate pattern; updates trigger `hasFetchedOnce reset to stale` on the affected resource keys |
| Realtime delegation (RealtimeSyncManager `projects` channel, event=`*`=INSERT/UPDATE/DELETE) | postgres_changes → `public.projects` | Remote INSERT → fetchProjectById fresh; remote UPDATE soft-fetch by id; remote DELETE evict |

### Source-of-truth claim
**Hybrid with optimistic dedupe-once-per-resource semantics.** Per the post-`ui-buttons-unresponsive` fix in commit `fc2807b`: identity-changing `store`/`get()` objects were stripped from useEffect deps; per-resource `{ projectQueryMeta / assignmentQueryMeta }` with `hasFetchedOnce + isInitialLoading` prevents the over-render loop that was the root cause. DB writes are authoritative; cache is stale'd explicitly after writes and by Realtime events.

---

## § taskStore.supabase.ts

### Coupling arrows
| Arrow | Table(s) | Operations | Compatibility layer trigger points |
| --- | --- | --- | --- |
| `fetchTasksByProject()` / `fetchTasksByUser()` / `fetchTasksByAssignee()` / `fetchTaskById()` | `public.tasks` SELECT; JOIN `task_activities` per task (to build `updates` array back from activities, 1:many); also fetches `project_locations` candidates for create/edit | — |
| `createTask()` (line ~1446–1569) | `public.tasks` INSERT `.select().single()` | **Deferred-schema compat trigger point 1:** full payload first → if error code 42703 or PGRST204 mentions any of the 6 redesign fields in `DEFERRED_TASK_CREATE_SCHEMA_FIELDS` (see findings backlog entry F-003), retry with stripped payload `stripDeferredTaskSchemaFields(fullInsertPayload)`. |
| `updateTask()` (line ~1880–1960) | `public.tasks` UPDATE by id, arbitrary fields | **Deferred-schema compat trigger point 2:** first attempt includes any set of the 6 camelCase runtime fields → pre-clean via `stripDeferredTaskRuntimeFields(cleanUpdates)` into snake_case; if getDeferredTaskSchemaField() returns non-null, retry with `stripDeferredTaskSchemaFields(updateData)` — and if the entire update was compatibility-only, mark as skipped (lines 1955–1957). |
| `addTaskUpdate()` / `addSubTaskUpdate()` / legacy `updateTaskStatus()` | `public.task_activities` INSERT; `public.tasks` UPDATE for status/completion_percentage side-effect | — |
| `task_read_status` writes (lines 835–841 cleanup loop & elsewhere) | `public.task_read_status` upsert | Mark task as "read by user" |
| `task_files` references (indirect via fileUploadService) | `public.task_files` insert metadata rows AFTER uploader returns public URL | storage bucket `buildtrack-files` is the authority for bytes; task_files holds FKs |
| Realtime delegation (RealtimeSyncManager, two channels) | Channel `tasks-changes`: postgres_changes `public.tasks` event=* (INSERT/UPDATE/DELETE); Channel `task-activities-changes`: postgres_changes `public.task_activities` event=INSERT only | INSERT/UPDATE soft-fetch by task id; DELETE evict; activity INSERT → fetchTaskById to refresh `updates` array join |

### Source-of-truth claim
**DB authority with hybrid optimistic + Realtime invalidation.** Task writes commit to Supabase first; cache is invalidated. RealtimeSyncManager tasks channel re-fetches on remote change. The **6 redesign metadata fields (primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags, location_on_site)** are the exception: if tenant schema is pre-migration, they are WRITTEN LOCALLY to cache but SILENTLY DROPPED on the retry-write path — i.e., for those 6 fields, the local cache is *temporarily authoritative until the follow-on migration M-SUPABASE-03b lands*.

---

## § fileUploadService / uploads (storage + metadata)

### Coupling arrows
| Arrow | Target | Operations |
| --- | --- | --- |
| `uploadFile()` line ~99 | Supabase Storage bucket `buildtrack-files` (name used literally), storage path: `<companyId>/<entityType>s/<entityId>/<uniqueName>` | Base64→decode→`.upload()`; options: `cacheControl: 'public, max-age=31536000, immutable'`? (uses default); `contentType` inferred from file mime |
| `getFileUrl()` / `getPublicUrl()` line ~114–116, 190–192 | Storage bucket `buildtrack-files` `.getPublicUrl(storagePath)` | Returns full public URL — assumes bucket is PUBLIC or RLS allows anon read; see findings F-001/F-002 |
| `deleteFile()` line ~167–169 | Storage `.remove([storagePath])` | Requires authenticated role + bucket policies |
| `uploadFileWithVerification()` + `verifyUpload()` | After upload → `fetch(publicUrl)` check HTTP 200 round-trip | Health-check only, no DB mutation |
| **Metadata rows (IMPLICIT coupling back to taskStore):** After upload, `fileAttachment` records with `storage_path/public_url/uploaded_by/created_at` → inserted into task metadata. Current code uses `fileAttachment` objects stored in task `updates[].photos[]` as inline JSON in task_activities.photos array, NOT a separate `uploads` table (see DATABASE_ARCHITECTURE.md for the design intent; actual implementation uses inline JSON array in task_activities) |

### Source-of-truth claim
**Storage bucket authority for bytes; task_activities authority for attachment links.** There is no `public.uploads` metadata table in the current ground-truth schema (grep across taskStore for `from('uploads')` → 0 results). Attachment records live as inline JSON in `task_activities.photos[]`. Bucket `buildtrack-files` MUST have correct public-read or signed-URL policy depending on sensitivity — currently the code reads via public URLs.

---

## § RealtimeSyncManager postgres_channels — 4-channel subscription map

**Source file:** `src/utils/RealtimeSyncManager.tsx`

| Channel / React useEffect hook | postgres_changes event filter | Table listened | Payload → store action | Confidence: does the Supabase dashboard `postgres_changes` publication actually emit for this table+event? |
| --- | --- | --- | --- | --- |
| `tasks-changes` (line 119–184) | `event: '*'` (INSERT/UPDATE/DELETE) | `public.tasks` | INSERT/UPDATE → `taskStore.fetchTaskById(payload.new.id)` force refresh; UPDATE soft_delete branch with `deleted_at IS NOT NULL` path → evict locally; DELETE → `taskStore.softDelete(id)` local evict | UNKNOWN pending live-SQL (assume yes on 2026 tenant; Unknown on older tenant schemas). See F-005. |
| `task-activities-changes` (line 186–221) | `event: 'INSERT' only` | `public.task_activities` | On new activity → `fetchTaskById(taskId)` to refresh the joined updates array and work-thread timeline | UNKNOWN pending live-SQL. See F-005. |
| `projects-changes` (line 223–260) | `event: '*'` (INSERT/UPDATE/DELETE) | `public.projects` | INSERT/UPDATE → fetchProjectById + project list refresh; DELETE → local evict | UNKNOWN pending live-SQL. See F-005. |
| `users-changes` (line 270–298) | `event: 'UPDATE' only` (not INSERT/DELETE — insert/delete are auth-managed so this channel skips them) | `public.users` | UPDATE → `fetchUsers()` full refresh + `refreshUser(userId)` if it's the current user | UNKNOWN pending live-SQL. See F-005. |

### Source-of-truth claim
**Realtime is an invalidation authority, not a state authority.** All 4 channels call back into `use<Name>Store.getState().fetchXxx()`, which then hits the DB select path to refresh the Zustand slice — the postgres_changes payload never directly writes values into the store. It's a signal-only invalidation. If the publication is misconfigured (i.e., the dashboard postgres_changes publication does not include all 4 tables), stale state will persist until the next manual reload. Run Gate 1 live-SQL pass (or Dashboard SQL Editor equivalent) to confirm publication membership.
