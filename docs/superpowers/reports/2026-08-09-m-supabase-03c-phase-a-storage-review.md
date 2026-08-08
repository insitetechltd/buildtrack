# M-SUPABASE-03c Phase A — Storage bucket policy artefacts

**Date:** 2026-08-09  
**Milestone:** WS-SUPABASE / M-SUPABASE-03c  
**Status:** Phase A artefacts complete — **AWAITING HUMAN GO for live apply / client signed-URL cutover**  
**GO phrase required:** `you have GO for M-SUPABASE-03c live apply`

---

## Findings (code-path)

| Item | Evidence |
|---|---|
| Greenfield intent | `supabase/migrations/20260715000900_storage_policies.sql` inserts `buildtrack-files` with **`public = false`** + company-folder RLS |
| App runtime | `src/api/fileUploadService.ts` still uses **`getPublicUrl()`** after upload and in `getFileUrl` |
| Risk | If live bucket is private, public URLs 403 and photos break; if public, company isolation relies only on path obscurity |

---

## Decisions (Schema / product review)

| ID | Question | Phase A recommendation |
|---|---|---|
| D1 | Public vs private bucket | **Keep private** (match greenfield). Do not flip to public without explicit product acceptance. |
| D2 | Client URL strategy if private | Refactor `fileUploadService.ts` to `createSignedUrl(path, { expiresIn: TTL })` with configurable TTL (default 3600s). |
| D3 | Live apply of ensure-private SQL | Only after GO phrase; inspect live `storage.buckets.public` first. |

---

## Artefacts

- Forward ensure-private: `supabase/migrations/20260809000200_msupabase03c_storage_bucket_policy.sql`
- Ops checklist extended in `documentation/audit/database/SUPABASE_OPERATIONS_RUNBOOK.md` (M-03c section)
- **Client signed-URL refactor is deferred until live bucket flag is confirmed + GO** (no silent cutover)

---

## Pre-apply inspect (RO)

```sql
select id, name, public, file_size_limit
from storage.buckets
where id = 'buildtrack-files';

select policyname, cmd, roles
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
```

---

## Close gate (after GO + optional signed-URL ship)

1. Bucket `public = false` (or documented public exception).
2. Fresh Expo session: upload + display returns HTTP 200 via signed URL (or accepted public URL).
3. Anon cannot list/read objects outside policy.

---

## Sign-off

| Role | Sign | Date |
|---|---|---|
| Human storage decision D1/D2 | _pending_ | |
| Live apply GO | _pending — requires phrase above_ | |
