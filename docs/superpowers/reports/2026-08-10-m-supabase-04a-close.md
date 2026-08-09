# M-SUPABASE-04a Close Report (2026-08-10)

## Summary

Closed **M-SUPABASE-04a** after Human GO: `you have GO for M-SUPABASE-04a publication ADD TABLE`.

Live `ALTER PUBLICATION supabase_realtime ADD TABLE` for `public.tasks`, `public.task_activities`, `public.projects`, `public.users` on production pooler session `:5432`. Post-apply membership audit **4/4 PASS**.

## Already shipped (app)

| Item | Evidence |
|---|---|
| Exponential backoff + AppState soft resubscribe | commit `5d7b4e4` (`RealtimeSyncManager` + `realtimeReconnect`) |

## Phase A artefacts (pre-GO)

| Artefact | Path |
|---|---|
| RO audit SQL | `docs/superpowers/sql/20260810_msupabase04a_publication_membership_audit.sql` |
| Remediation SQL | `docs/superpowers/sql/20260810_msupabase04a_publication_add_tables.sql` |
| Pre-apply evidence (0/4) | `docs/superpowers/evidence/m-supabase-04a-publication-membership-redacted-20260810.md` |
| Live audit report (not closed) | `docs/superpowers/reports/2026-08-10-m-supabase-04a-live-audit.md` |

## Phase B (production — pooler session `:5432`)

| Step | Result |
|---|---|
| Auth smoke `SELECT 1` | PASS |
| `ALTER PUBLICATION … ADD TABLE` (4) | PASS (rc=0) |
| Post-apply checklist | **4/4** `in_publication = t` |
| Replica identity | left `default` on all 4 (no unsafe change) |
| `~/.pgpass` | scrubbed after apply+audit |

Post-apply evidence: `docs/superpowers/evidence/m-supabase-04a-publication-membership-post-apply-redacted-20260810.md`.

Repo SoT migration copy: `supabase/migrations/20260810000200_msupabase04a_publication_add_tables.sql`.

## Cross-check vs RealtimeSyncManager

| Table | Client mask | Publication member |
|---|---|---|
| tasks | `*` | yes |
| task_activities | `INSERT` | yes |
| projects | `*` | yes |
| users | `UPDATE` | yes |

## Residual risks / follow-ons

- Optional manual reconnect proof (force socket close / background→foreground → `[Realtime] Reconnecting`) not required for close; app path already shipped.
- Replica identity remains `default`; escalate to `FULL` only if UPDATE payloads lack needed `old` fields.
- **NEXT STEP precedence:** (1) optional **M-SUPABASE-04d** live GO (`you have GO for M-SUPABASE-04d live apply`) → (2) **M-SUPABASE-04c** retention schedule → (3) **M-SUPABASE-04b** after ~2026-09-07 cool-down.

## Sign-off

| Role | Sign | Date |
|---|---|---|
| Human live GO | chat transcript phrase (04a publication ADD TABLE) | 2026-08-10 |
| Live apply + 4/4 verify | Closed | 2026-08-10 |
