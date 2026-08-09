# M-SUPABASE-04a — Live publication audit report (NOT Closed)

**Date:** 2026-08-10  
**Milestone:** WS-SUPABASE / M-SUPABASE-04a  
**Status:** Live RO audit **complete** — membership **0/4 FAIL**. Milestone **NOT Closed**.

---

## Already shipped (app) — commit `5d7b4e4`

| Item | Path |
|---|---|
| Exponential backoff helper | `src/utils/realtimeReconnect.ts` |
| Unit tests | `src/utils/__tests__/realtimeReconnect.test.ts` |
| Resubscribe on `CHANNEL_ERROR` / `CLOSED` / `TIMED_OUT` | `src/utils/RealtimeSyncManager.tsx` |
| Soft resubscribe on AppState foreground | same |

## Live audit (2026-08-10, after signed-URL cutover `a2757e7`)

| Item | Result |
|---|---|
| Auth smoke `SELECT 1` session `:5432` | PASS |
| SQL artefact | `docs/superpowers/sql/20260810_msupabase04a_publication_membership_audit.sql` |
| Redacted evidence | `docs/superpowers/evidence/m-supabase-04a-publication-membership-redacted-20260810.md` |
| `supabase_realtime` membership | **0 tables** |
| Expected checklist (tasks / task_activities / projects / users) | **0/4** |
| `postgres_changes` publication name | absent (tenant uses `supabase_realtime`) |
| `~/.pgpass` | scrubbed after audit |

## Cross-check vs RealtimeSyncManager

Client listens: `tasks *`, `task_activities INSERT`, `projects *`, `users UPDATE`.  
Publication is table-level only — none of the four public tables are members → channels are deaf for postgres_changes.

## Close gate (remaining)

1. **Human GO** for `ALTER PUBLICATION supabase_realtime ADD TABLE` (4 tables) — danger-gate schema write.
2. Re-run RO audit → **4/4** redacted appendix.
3. Manual: force socket close / background → foreground → `[Realtime] Reconnecting` / `App foreground — soft resubscribe` (app path already shipped).

## Residual risk

Until ADD TABLE lands, Realtime invalidation is a no-op on this tenant; stores stay stale until pull-to-refresh / navigation remount fetch.
