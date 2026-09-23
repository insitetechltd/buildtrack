-- F6 / Stage B follow-on (Human GO 2026-09-22): drop authenticated_interim open doors.
--
-- Context: M-SUPABASE-02a added interim ALL policies (`auth.uid() IS NOT NULL`) when
-- helpers were absent. DEV≡PROD now has `user_has_project_access` + scoped policies
-- (`tasks_*_project_access`, `projects_select_assigned`, etc.). The interim policies
-- OR-allow every authenticated JWT past those walls (F6 FAIL RLS-open).
--
-- Scope: DROP interim only. Do not recreate. Do not touch anon_block_all.
-- users DELETE has no non-interim replacement — intentional (no authenticated user delete).
--
-- Apply: DEV pooler first, then PROD. Prove: npm run test:dual-env:p-matrix (F6 PASS).
-- Rollback: restore policies from 20260808000100_msupabase02a_anon_block_seven_tables.sql
--   interim CREATE POLICY blocks (emergency only — re-opens F6 leak).

BEGIN;

DROP POLICY IF EXISTS companies_authenticated_interim ON public.companies;
DROP POLICY IF EXISTS projects_authenticated_interim ON public.projects;
DROP POLICY IF EXISTS tasks_authenticated_interim ON public.tasks;
DROP POLICY IF EXISTS task_activities_authenticated_interim ON public.task_activities;
DROP POLICY IF EXISTS users_authenticated_select_interim ON public.users;
DROP POLICY IF EXISTS users_authenticated_update_interim ON public.users;
DROP POLICY IF EXISTS users_authenticated_delete_interim ON public.users;

COMMIT;
