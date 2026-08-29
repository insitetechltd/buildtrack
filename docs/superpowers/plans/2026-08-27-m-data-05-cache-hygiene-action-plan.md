# M-DATA-05 — Client cache hygiene & bandwidth (action plan)

**Opened:** 2026-08-27 · **Restored:** 2026-08-29 (file was referenced in ROADMAP but missing from tree)  
**Does not block:** App Store / ENV Phase D / OPS-03  
**Prereq:** M-DATA-03 app-side · M-DATA-04 Closed

## Phase A (landed 2026-08-29)

1. **Kill SWR→force loop** in `fetchTasks` / `ByProject` / `ByUser` — background revalidate uses `{ background: true }` (mirror `projectStore.fetchProjects`).
2. **Stop always-force project/assignment polls** in `DataRefreshManager.triggerRefresh` — pass through `force`.
3. **List fetch without full activity history** — omit `task_activities` on list fetchers; `fetchTaskById` keeps full timeline. `reconcileFetchedTasks` preserves already-hydrated `activities`/`updates` when list payload is slim.

**Evidence:** `npm run test:tasks` PASS; `syncManagers` poll expects `force=false`; unit covers slim list + activity preserve.

## Phase B (after App Store / when free)

Logout / identity clear (coordinator, signed URLs, batches, upload-failures, `draft-media/`); 5d batch prune; delete legacy `buildtrack-tasks`.

## Phase C (defer / measure)

Project-scoped hot path; optional identity-bound slim disk index.

## Validation

- `npm run test:tasks` + `syncManagers` integration expectations for `force=false` on poll  
- Smoke: Dashboard after list refresh still shows detail timeline after open; poll does not hammer projects every 60s when fresh
