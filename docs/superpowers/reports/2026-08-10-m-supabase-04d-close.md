# M-SUPABASE-04d Close Report (2026-08-10)

## Summary

Closed **M-SUPABASE-04d** after Human GO: `GO → M-SUPABASE-04d live` (treated as authorization for index-health live apply; ROADMAP GO phrase equivalent).

Live `CREATE INDEX CONCURRENTLY IF NOT EXISTS` on production pooler session `:5432` for:

| Index | Table | Columns | Result |
|---|---|---|---|
| `idx_task_read_status_user_task` | `task_read_status` | `(user_id, task_id)` | **CREATED** (new) |
| `idx_project_locations_project_id` | `project_locations` | `(project_id)` | **already existed** (IF NOT EXISTS no-op NOTICE) |

Post-apply: both names present in `pg_indexes`; both `indisvalid=t` / `indisready=t`.

## Phase A (artefacts)

| Artefact | Path |
|---|---|
| Forward SQL | `supabase/migrations/20260810000100_msupabase04d_index_health.sql` |
| Phase A checklist | `docs/superpowers/reports/2026-08-10-m-supabase-04d-phase-a.md` |

## Phase B (production — pooler session `:5432`)

| Step | Result |
|---|---|
| Auth smoke `SELECT 1` | PASS |
| Apply statements individually (no transaction wrap) | PASS |
| `idx_task_read_status_user_task` | CREATE INDEX rc=0 |
| `idx_project_locations_project_id` | NOTICE already exists; rc=0 |
| `pg_indexes` target names | **2/2** present |
| Invalid-index check | none (`indisvalid`/`indisready` both true) |
| `~/.pgpass` | scrubbed after apply+verify |

Pre-apply inventory (session): `project_locations` already had `idx_project_locations_project_id`; `task_read_status` had PK only (no composite named index).

Note: PK on `task_read_status (user_id, task_id)` already covered the composite lookup; the named index is additive/explicit for Dashboard unread patterns and lagging tenants.

## Residual risks / follow-ons

- New `idx_task_read_status_user_task` starts at `idx_scan=0` until query planner uses it; PK may remain preferred for some plans — expected, not a close blocker.
- Duplicate coverage with PK is intentional for idempotent lagging-tenant rollout; no drop of PK.
- **NEXT STEP precedence:** (1) **M-SUPABASE-04c** retention / lifecycle schedule → (2) **M-SUPABASE-04b** after ~2026-09-07 cool-down. `S-UX-01P` remains deferred.

## Sign-off

| Role | Sign | Date |
|---|---|---|
| Human live GO | chat transcript (`GO → M-SUPABASE-04d live`) | 2026-08-10 |
| Live apply + 2/2 verify | Closed | 2026-08-10 |
