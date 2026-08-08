# M-SUPABASE-02a / 02b Close Report (2026-08-08)

## Summary

Closed P0 milestones **M-SUPABASE-02a** (7-table anon RLS block) and **M-SUPABASE-02b** (`public.users.id` → `auth.users` FK NOT VALID + `users_self_write`) after Rule 1 Gate 1 live-SQL unblocked via Option A.

## Gate 1 (Rule 1)

- Method: Option A pooler `aws-1-ap-south-1.pooler.supabase.com:6543`
- Script: `WS_SUPABASE_01_READONLY_AUDIT.sql`
- Evidence (7/7 redacted): `docs/superpowers/evidence/m-supabase-02a-02b-gate1-redacted-20260808.md`
- Sections present: PUBLIC_TABLES, TASK_LOCATION_COLUMNS, PROJECT_LOCATIONS_TABLE_EXISTS, PROJECT_LOCATIONS_COLUMNS, TASK_LOCATION_JSON_TYPES, TASK_LOCATION_ON_SITE_POPULATION, TASK_LOCATION_LABEL_CANDIDATES
- Credentials: used via `~/.pgpass` only; scrubbed after apply. No secrets in git-tracked files.

### Headline anon SELECT (pre-fix)

| table | anon rows |
|---|---:|
| companies | 5 |
| users | 29 |
| projects | 19 |
| tasks | 97 |
| task_activities | 257 |
| task_read_status | 2073 |
| project_locations | 0 |

Also confirmed: `users.id → auth.users` FK **missing**; live helpers `user_has_project_access` / related **absent**.

## 02a close

- Migration: `supabase/migrations/20260808000100_msupabase02a_anon_block_seven_tables.sql`
- Applied live: REVOKE ALL FROM anon; ENABLE RLS; restrictive `anon_block_all` on all 7; interim authenticated policies on tables that previously had no auth policies (helpers absent on tenant).
- Close proof: anon SELECT → **permission_denied** on all 7 tables.

## 02b close

- Migration: `supabase/migrations/20260808000200_msupabase02b_users_fk_and_self_write.sql`
- Applied live: constraint `users_id_fkey_auth_users` … `ON DELETE CASCADE NOT VALID` (VALIDATE deferred).
- Policy `users_self_write` FOR INSERT TO authenticated WITH CHECK (`id = auth.uid()`).
- Signup parity harness: **N/A** this cycle (no matching parity test under `src/__tests__/parity`).

## Residual risks

- Interim authenticated `USING (auth.uid() IS NOT NULL)` policies are broader than greenfield project-scoped policies; replace when helpers land on-tenant.
- FK remains NOT VALID until a future VALIDATE pass (orphans possible until then).
- `location_on_site` already exists on live `tasks` (Gate 1); 03b still required for remaining deferred columns / multi-tenant parity — **do not start 03b Phase B without Human Schema Review Gate**.

## Hard stop

Next session: **M-SUPABASE-03b Phase A only** (artefacts, no live writes) → Human Schema Review Gate → Phase B only after written GO.
