-- 006_task_activities.sql
-- Append-only activity ledger.

create table public.task_activities (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  activity_type text not null
    check (activity_type in (
      'progress_update',
      'status_change',
      'metadata_edit',
      'assignment',
      'creation',
      'cancellation',
      'review_submission',
      'review_acceptance',
      'review_rejection',
      'assigner_comment',
      'photo_upload',
      'delegation'
    )),
  timestamp timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb,
  description text,
  completion_percentage integer
    check (
      completion_percentage is null
      or (completion_percentage >= 0 and completion_percentage <= 100)
    ),
  notifications_sent boolean not null default false,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_task_activities_task_timestamp
  on public.task_activities (task_id, timestamp desc);

create index idx_task_activities_type
  on public.task_activities (activity_type);

alter table public.task_activities enable row level security;
revoke all on table public.task_activities from anon;
-- Append-only for clients.
grant select, insert on table public.task_activities to authenticated;
grant select, insert, update, delete on table public.task_activities to service_role;

create policy task_activities_select
  on public.task_activities for select to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          public.user_has_project_access(auth.uid(), t.project_id)
          or public.user_system_permission(auth.uid()) = 'admin'
        )
    )
  );

create policy task_activities_insert
  on public.task_activities for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.user_has_project_access(auth.uid(), t.project_id)
        and not public.user_is_pending(auth.uid())
    )
  );
