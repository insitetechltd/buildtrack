# M-SUPABASE-03a Close Report (2026-08-10)

## Summary

Closed **M-SUPABASE-03a** after Human GO: `you have GO for M-SUPABASE-03a and 03c live apply`.

## Phase A (artefacts)

- Forward: `supabase/migrations/20260809000100_msupabase03a_role_column_integrity.sql`
- Checklist: `docs/superpowers/reports/2026-08-09-m-supabase-03a-phase-a-schema-review.md`
- Commit (artefacts): `93584af`

## Live deltas applied with artefact (production-discovered)

| Item | Action |
|---|---|
| Legacy `users_role_check` IN (`admin`,`manager`,`worker`) | Dropped before normalize (blocked `manager`→`supervisor`) |
| Missing `user_system_permission` / `user_is_company_admin` | Dual-path helpers added in migration §5a (live uses `role` only; no `system_permission` column) |

## Phase B (production — pooler session `:5432`)

- Normalize: `manager` → `supervisor` (**3** rows); final dist: worker 23 / supervisor 3 / admin 3
- CHECK `users_role_allowed_values` present (expanded F-004 vocabulary)
- CHECK `upa_category_allowed_values` present (alongside pre-existing UPA category CHECK)
- Trigger `users_guard_role_column_writes` enabled
- Invalid role probe: `UPDATE … role='totally_invalid'` → **check_violation** (PASS)
- Anon SELECT on 7 core tables: **ok=0 denied=7** (02a intact)

## Residual risks

- Authenticated non-admin JWT role-write deny (42501) not exercised with a live JWT in this cycle (SQL-console path bypasses via `auth.uid() IS NULL`)
- App code that still writes DB role=`manager` will now fail CHECK until callers use `supervisor` (aligns with S-UX-01K2 ranks)

## Sign-off

| Role | Sign | Date |
|---|---|---|
| Human live GO | chat transcript phrase (03a+03c) | 2026-08-10 |
| Live apply | Closed | 2026-08-10 |
