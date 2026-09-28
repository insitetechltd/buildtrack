-- DORMANT — DO NOT APPLY (product decision 2026-08-27).
-- Location: supabase/migrations_dormant/ (not on db push / greenfield / apply-migrations path).
-- See supabase/migrations_dormant/README.md.
--
-- Intent (when revived): drop project status `on_hold` from DB CHECK after remapping
-- existing rows → `active`. Product UI already removed On Hold; Active displays as
-- "On-going". App normalizes legacy `on_hold` → `active` in
-- `src/ui/contracts/projectStatus.ts`.
--
-- Why parked: keep the CHECK slot reserved in case we need a fifth project status
-- later (reuse `on_hold` slug or replace with a new product meaning). Tightening
-- the CHECK now would burn the slot and force another migration to reopen it.
--
-- To revive: Tristan GO → move into supabase/migrations/ (or apply by hand) →
-- run remap + drop/add CHECK below → update app types / normalizeProjectStatus
-- if the slot gets a new meaning (not silent On Hold).
--
-- Live DEV (2026-08-27): CHECK still allows planning|active|on_hold|completed|cancelled;
-- zero rows currently on `on_hold`.

-- 1) Remap legacy rows
UPDATE public.projects
SET status = 'active'
WHERE status = 'on_hold';

-- 2) Replace CHECK (drop + add — Postgres has no ALTER CHECK content)
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check
  CHECK (status = ANY (ARRAY[
    'planning'::text,
    'active'::text,
    'completed'::text,
    'cancelled'::text
  ]));
