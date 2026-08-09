# M-SUPABASE-04a — Live publication membership audit (redacted)

**Date:** 2026-08-10  
**Method:** Option A pooler session `:5432` host `aws-1-ap-south-1.pooler.supabase.com`  
**SQL:** `docs/superpowers/sql/20260810_msupabase04a_publication_membership_audit.sql` (+ follow-up RO probes)  
**Credentials:** ephemeral `~/.pgpass` (smoke `SELECT 1` PASS); scrubbed after audit. No secrets in this file.

## Smoke

| Check | Result |
|---|---|
| `SELECT 1` (session `:5432`) | PASS |

## Query 1 — `pg_publication_tables` for `supabase_realtime` / `postgres_changes`

| pubname | schemaname | tablename |
|---|---|---|
| _(empty)_ | — | — |

**Row count:** 0

## Query 2 — Expected 4-table checklist

| expected_table | in_publication |
|---|---|
| projects | **f** |
| task_activities | **f** |
| tasks | **f** |
| users | **f** |

**Score:** **0/4** FAIL

## Query 3 — Publications present (names only)

| pubname | puballtables | pubinsert/update/delete/truncate |
|---|---|---|
| `supabase_realtime` | f | t/t/t/t |
| `supabase_realtime_messages_publication` | f | t/t/t/t |

Note: no publication named `postgres_changes` on this tenant.

## Follow-up RO probes (redacted)

### All publication memberships

Only `supabase_realtime_messages_publication` has members — `realtime.messages_YYYY_MM_DD` partitions (7 rows observed for Aug 6–12 window). **`supabase_realtime` has 0 tables.**

### Expected base tables exist

| table_name | replica_identity |
|---|---|
| projects | default |
| task_activities | default |
| tasks | default |
| users | default |

### `supabase_realtime` table count

`0`

## Cross-check vs `RealtimeSyncManager`

| Table | Client event mask (code) | In `supabase_realtime`? |
|---|---|---|
| `tasks` | `*` | **NO** |
| `task_activities` | `INSERT` | **NO** |
| `projects` | `*` | **NO** |
| `users` | `UPDATE` | **NO** |

Code contract (event filters) lives in `src/utils/RealtimeSyncManager.tsx`; publication membership is table-level only. Without ADD TABLE, channels subscribe but receive **0** postgres_changes events → stale Zustand until manual reload (F-009 / coupling-map warning confirmed live).

## Outcome

| Gate | Status |
|---|---|
| Live RO audit executed | PASS |
| 4/4 tables in publication | **FAIL (0/4)** |
| App reconnect shipped (`5d7b4e4`) | PASS (code) |
| **M-SUPABASE-04a Closed** | **BLOCKED** — remediation GO required |

## Remediation (NOT applied — needs Human GO)

Read-only audit only this cycle. Proposed write (session `:5432`):

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.tasks,
  public.task_activities,
  public.projects,
  public.users;
```

Optional follow-up: re-run audit SQL → expect 4/4 `in_publication = t`. Replica identity left `default` (PK present); escalate to `FULL` only if UPDATE payloads lack `old` fields in practice.

**GO phrase (suggested):** `you have GO for M-SUPABASE-04a publication ADD TABLE`
