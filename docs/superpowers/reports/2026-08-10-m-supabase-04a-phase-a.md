# M-SUPABASE-04a — Realtime reconnect + publication audit (Phase A app + docs)

**Date:** 2026-08-10  
**Milestone:** WS-SUPABASE / M-SUPABASE-04a  
**Status:** App reconnect **shipped**; live publication SQL audit **DONE 2026-08-10 — 0/4 FAIL** (see live-audit report). Milestone **not Closed**.

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

**Live audit (2026-08-10):** executed on pooler session `:5432`. Result **0/4** — `supabase_realtime` has zero public table members. Evidence: `docs/superpowers/evidence/m-supabase-04a-publication-membership-redacted-20260810.md`. Report: `docs/superpowers/reports/2026-08-10-m-supabase-04a-live-audit.md`. Remediation SQL (NOT applied): `docs/superpowers/sql/20260810_msupabase04a_publication_add_tables.sql`.

## Close gate (remaining)

1. Human GO + apply ADD TABLE remediation → re-audit **4/4** (redacted appendix).
2. Manual: force socket close / background → foreground → channels resubscribe without app kill (log lines `[Realtime] Reconnecting` / `App foreground — soft resubscribe`).

No schema writes applied in the audit cycle (read-only only).
