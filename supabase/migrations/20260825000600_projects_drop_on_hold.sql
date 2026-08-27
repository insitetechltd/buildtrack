-- Drop project status `on_hold` (product: remove On Hold; Active display → On-going).
-- Remap existing on_hold rows → active (still-open safest), then tighten CHECK.
--
-- HUMAN GATE: do NOT apply live without explicit GO.
-- App already stops offering on_hold in pickers/filters/labels before this apply.

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
