-- 009_storage_policies.sql
-- Private buildtrack-files bucket; path convention companyId/...

insert into storage.buckets (id, name, public, file_size_limit)
values ('buildtrack-files', 'buildtrack-files', false, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

-- Drop legacy permissive policies if present.
drop policy if exists "Authenticated users can upload files" on storage.objects;
drop policy if exists "Authenticated users can view files" on storage.objects;
drop policy if exists "Authenticated users can update files" on storage.objects;
drop policy if exists "Authenticated users can delete files" on storage.objects;
drop policy if exists "Public Access" on storage.objects;

create policy storage_objects_select_own_company
  on storage.objects for select to authenticated
  using (
    bucket_id = 'buildtrack-files'
    and not public.user_is_pending(auth.uid())
    and (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
  );

create policy storage_objects_insert_own_company
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'buildtrack-files'
    and not public.user_is_pending(auth.uid())
    and (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
  );

create policy storage_objects_update_own_company
  on storage.objects for update to authenticated
  using (
    bucket_id = 'buildtrack-files'
    and not public.user_is_pending(auth.uid())
    and (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
  )
  with check (
    bucket_id = 'buildtrack-files'
    and (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
  );

create policy storage_objects_delete_own_company
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'buildtrack-files'
    and not public.user_is_pending(auth.uid())
    and (
      (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
      or public.user_system_permission(auth.uid()) = 'admin'
    )
  );
