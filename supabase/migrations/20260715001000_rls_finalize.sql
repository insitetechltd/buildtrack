-- 010_rls_finalize.sql
-- Ensure anon has zero table privileges; service_role retains full access for seeds/admin.

do $$
declare
  t text;
begin
  foreach t in array array[
    'companies',
    'users',
    'projects',
    'user_project_assignments',
    'tasks',
    'task_assignments',
    'task_activities',
    'task_read_status',
    'task_stars',
    'project_locations',
    'task_files'
  ]
  loop
    execute format('revoke all on table public.%I from anon', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end
$$;

-- Compatibility views for gradual app cutover (read-only aliases).
-- NEW parity adapters prefer native columns; these help interim queries.

create or replace view public.v_task_assignee_ids as
select
  ta.task_id,
  array_agg(ta.user_id order by ta.created_at) filter (where ta.is_active) as assigned_to
from public.task_assignments ta
group by ta.task_id;

comment on view public.v_task_assignee_ids is
  'Compatibility: relational assignees as uuid[] for interim reporting';
