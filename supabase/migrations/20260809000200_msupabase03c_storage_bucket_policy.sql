-- M-SUPABASE-03c Phase A — buildtrack-files bucket policy inspect + ensure private
-- ROLLOUT: artefacts only. NO LIVE PRODUCTION APPLY without explicit written Human GO:
--   "you have GO for M-SUPABASE-03c live apply"
--
-- Greenfield baseline (20260715000900_storage_policies.sql): bucket public=false
--   with company-scoped authenticated policies.
-- App today still calls getPublicUrl() in fileUploadService.ts — Decision D1 below
--   must choose signed-URL refactor vs accept public bucket (not recommended).
--
-- This migration:
--   1) Ensures bucket row exists with public=false (idempotent upsert)
--   2) Does NOT rewrite object policies (already defined in 009) — live inspect first
--
-- Close gate after live GO + client signed-URL path (if private confirmed):
--   fresh Expo session → photo display 200 / SignedURL 200.

insert into storage.buckets (id, name, public, file_size_limit)
values ('buildtrack-files', 'buildtrack-files', false, 52428800)
on conflict (id) do update
set public = false,
    file_size_limit = coalesce(storage.buckets.file_size_limit, excluded.file_size_limit);

-- Read-only inspect helpers (run manually; comments only):
--   select id, name, public, file_size_limit from storage.buckets where id = 'buildtrack-files';
--   select policyname, cmd, roles from pg_policies
--     where schemaname = 'storage' and tablename = 'objects'
--     order by policyname;
