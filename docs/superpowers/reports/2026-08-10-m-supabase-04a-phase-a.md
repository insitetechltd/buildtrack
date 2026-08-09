# M-SUPABASE-04a — Realtime reconnect + publication audit (Phase A app + docs)

**Date:** 2026-08-10  
**Milestone:** WS-SUPABASE / M-SUPABASE-04a  
**Status:** App reconnect **shipped**; live publication SQL audit **pending** (`~/.pgpass` absent this cycle)

---

## Shipped (app)

| Item | Path |
|---|---|
| Exponential backoff helper | `src/utils/realtimeReconnect.ts` |
| Unit tests | `src/utils/__tests__/realtimeReconnect.test.ts` |
| Resubscribe on `CHANNEL_ERROR` / `CLOSED` / `TIMED_OUT` | `src/utils/RealtimeSyncManager.tsx` |
| Soft resubscribe on AppState foreground | same |

Backoff: 1s → 2s → 4s … cap 30s; resets to 0 on any `SUBSCRIBED`. Intentional teardown skips reconnect.

## Publication membership (read-only)

Artefact: `docs/superpowers/sql/20260810_msupabase04a_publication_membership_audit.sql`

Expected tables in `supabase_realtime` / `postgres_changes`:

| Table | Client event mask |
|---|---|
| `tasks` | `*` |
| `task_activities` | `INSERT` |
| `projects` | `*` |
| `users` | `UPDATE` |

**This cycle:** live SELECT skipped — no `~/.pgpass` and no Dashboard paste. Run the audit SQL in Dashboard when convenient; paste **redacted** row counts / table names only.

## Close gate (remaining)

1. Live audit: 4/4 tables in publication (redacted appendix).
2. Manual: force socket close / background → foreground → channels resubscribe without app kill (log lines `[Realtime] Reconnecting` / `App foreground — soft resubscribe`).

No schema writes in this milestone.
