# M-SUPABASE-04a — Post-apply publication membership audit (redacted)

**Date:** 2026-08-10  
**Method:** Option A pooler session `:5432` host `aws-1-ap-south-1.pooler.supabase.com`  
**SQL apply:** `docs/superpowers/sql/20260810_msupabase04a_publication_add_tables.sql`  
**SQL audit:** `docs/superpowers/sql/20260810_msupabase04a_publication_membership_audit.sql`  
**Credentials:** ephemeral `~/.pgpass` (smoke `SELECT 1` PASS); scrubbed after apply+audit. No secrets in this file.  
**Human GO:** `you have GO for M-SUPABASE-04a publication ADD TABLE`

## Smoke

| Check | Result |
|---|---|
| `SELECT 1` (session `:5432`) | PASS |

## Apply

| Step | Result |
|---|---|
| `ALTER PUBLICATION supabase_realtime ADD TABLE` (4 tables) | **PASS** (`ALTER PUBLICATION`, rc=0) |

## Query 1 — `pg_publication_tables` for `supabase_realtime` / `postgres_changes`

| pubname | schemaname | tablename |
|---|---|---|
| supabase_realtime | public | projects |
| supabase_realtime | public | task_activities |
| supabase_realtime | public | tasks |
| supabase_realtime | public | users |

**Row count:** 4

## Query 2 — Expected 4-table checklist

| expected_table | in_publication |
|---|---|
| projects | **t** |
| task_activities | **t** |
| tasks | **t** |
| users | **t** |

**Score:** **4/4** PASS

## Query 3 — Publications present (names only)

| pubname | puballtables |
|---|---|
| `supabase_realtime` | f |
| `supabase_realtime_messages_publication` | f |

Note: no publication named `postgres_changes` on this tenant (unchanged).

## Replica identity (unchanged)

| table_name | replica_identity |
|---|---|
| projects | default |
| task_activities | default |
| tasks | default |
| users | default |

No `REPLICA IDENTITY FULL` change required this cycle (PK present; escalate only if UPDATE `old` payloads lack fields in practice).

## Cross-check vs `RealtimeSyncManager`

| Table | Client event mask (code) | In `supabase_realtime`? |
|---|---|---|
| `tasks` | `*` | **YES** |
| `task_activities` | `INSERT` | **YES** |
| `projects` | `*` | **YES** |
| `users` | `UPDATE` | **YES** |

Code contract: `src/utils/RealtimeSyncManager.tsx`. Publication membership is table-level; event filters remain client-side.

## Outcome

| Gate | Status |
|---|---|
| Live apply (ADD TABLE) | PASS |
| Post-apply audit 4/4 | **PASS** |
| App reconnect shipped (`5d7b4e4`) | PASS (code) |
| **M-SUPABASE-04a Closed** | **YES** |
