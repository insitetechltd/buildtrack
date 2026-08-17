# DMS Infrastructure Investigation

**Date:** 2026-08-17  
**Status:** Closed (docs) — decision recorded for roadmap  
**Spec:** `docs/superpowers/specs/2026-08-06-web-admin-and-dms-product-spec.md`  
**Commercial link:** company data pool (Taskr evidence + DMS) — see commercial-release-week R6 amendment discussion / canvas `r6-data-driven-tiers`

---

## Verdict

**Continue on Supabase for the document database and Phase 2 DMS.**

Postgres + RLS + Storage already power Taskr. The DMS register (folders, revisions, ACLs, audit, RFI/submittal metadata) is a **relational + object-storage** problem that fits the same stack. Do **not** introduce a second document database for mid-market GC scope.

Move blobs off Supabase Storage **only** if later evidence shows egress/cost or single-object size ceilings that Pro/Team cannot meet — and even then keep **metadata in Postgres**.

---

## What “document database” means here

| Layer | What it stores | Recommended home |
|-------|----------------|------------------|
| **Register / control** | documents, revisions, folders, ACLs, audit, RFI, submittals | **Supabase Postgres** |
| **Blobs** | PDF / DWG / Office / images | **Supabase Storage** (`buildtrack-documents`) |
| **Field evidence** | task / update / project-unattached photos | Existing `buildtrack-files` |
| **Quota** | company bytes across both buckets | **Postgres rollup** (new) |

Taskr and DMS are two writers into one **company data pool**. Billing meters GB; apps do not get separate storage products.

---

## Infrastructure to add (net-new)

### A. Postgres schema (Human Gate before live apply)

From the product spec — approximate tables:

- `documents`, `document_revisions`, `document_folders`, `document_folder_acls`, `document_audit_log`
- Later: RFI + submittal tables (M-DMS-03/04)
- Optional: `notifications` for web bell + digest

**Hard requirements:**

- RLS on every table; project + folder ACL helpers
- Audit / transition tables **INSERT-only** for authenticated roles
- Indexes on `(project_id, …)`, ACL join keys, `file_hash_sha256`, revision uniqueness
- Realtime publication only where UI needs live register updates (optional; not day-1)

**Reuse:** `companies`, `projects`, `users`, `project_user_assignments`, existing permission helpers (`user_has_project_access`, role ranks).

### B. Storage

| Item | Action |
|------|--------|
| Bucket `buildtrack-documents` | Create private; company/project path RLS (mirror `buildtrack-files` pattern) |
| Path convention | `{companyId}/{projectId}/{documentId}/{revisionIndex}-{sanitizedName}` |
| Global / bucket file size | Raise above today’s **50 MB** on `buildtrack-files` (`file_size_limit = 52428800` post-03c). Spec target **500 MB**; Pro allows up to **500 GB** global — set bucket cap deliberately (e.g. 500 MB–2 GB) |
| Large uploads | **TUS resumable** (`tus-js-client` / Uppy) for files ≳6 MB; direct storage hostname |
| Signed URLs | Same pattern as D2 cutover (TTL hours, not public bucket) |
| Dedup | Client SHA-256 → warn if revision hash matches |

### C. Company usage rollup (shared with Taskr / R6)

- Periodic or trigger-maintained `company_storage_usage` (or equivalent) = Σ `size_bytes` from task files + document revisions (+ storage.objects if needed for orphans)
- Enforce soft/hard caps per plan (Growth 10 GB / Unlimited 100 GB proposal — commercial SoT may still be amending)
- Promote-to-document must **not double-count** bytes

### D. App / API modules

- `src/api/documentService.ts` (+ later rfi/submittal services)
- Zustand stores for paginated registers
- Web shell screens under `src/screens/web/…` (Expo Web or separate web router — decide in M-WEB-01)
- PDF preview: `react-pdf` / PDF.js on web; download-first for unsupported MIME

### E. Edge / ops

- Edge Function for email digest (Resend/SendGrid TBD) — M-WEB / M-DMS-02+
- Hosted web URL **locked:** `https://app.insiteworks.co`. Deploy target = EAS Hosting or Vercel (not Supabase Storage) — not required for schema spike
- Runbook: bucket create, RLS, size limits, backup posture (hot retain aligns with 04c; cold = 04e later)
- Observability: upload failure rates, signed-URL errors, quota near-limit

### F. Search (phased)

| Phase | Approach |
|-------|----------|
| M-DMS-01 | Metadata filters + `ilike` / `pg_trgm` on title, number, tags |
| M-DMS-02 | Stronger FTS (`tsvector`) on metadata; optional extracted text later |
| Later only | External search (Meilisearch/Typesense) or embeddings if register &gt; mid-market needs |

Do **not** block M-DMS-01 on vector search.

---

## Supabase fit vs limits

### Fits well (stay)

- Auth + RLS shared with Taskr (single SoT for who can see which project)
- Immutable revision rows + audit log in Postgres
- Private Storage + signed URLs (already proven on `buildtrack-files`)
- Resumable uploads for large drawings/PDFs
- Mid-market quotas (10–100 GB class) within Pro Storage pricing envelope
- One engineering team, one client (`src/api/supabase.ts`)

### Watch / harden (still Supabase)

| Risk | Mitigation |
|------|------------|
| **Egress** (many downloads of large PDFs) | CDN + short-lived signed URLs; cache; later optional R2 front for hot public-ish assets **without** moving register DB |
| **50 MB bucket cap today** | Raise for documents bucket; TUS for large files |
| **RLS complexity on folder ACLs** | Helper SQL functions; index ACL tables; avoid deep recursive policy without benchmarks |
| **Hot retain forever (04c)** | Company GB metering + data packs; 04e cold archive for churned/expired |
| **No native Glacier on hosted Storage** | Already known — 04e operator copy-out |
| **Full-text inside binary PDFs** | Out of Phase 2; metadata-first; extract pipeline later |
| **DWG/BIM compare** | Preview/download only in Phase 2; Autodesk-class compare is Phase 3+ / partner |

### When to reconsider (not now)

| Trigger | Alternative | Keep in Supabase? |
|---------|-------------|-------------------|
| Sustained multi-TB / brutal egress economics | **Cloudflare R2** or **S3** for blobs only; Postgres stays SoT for register | **Yes — metadata** |
| Enterprise CDE / ISO program requirements beyond our audit log | Partner CDE or dedicated doc control vendor | Maybe hybrid link-out |
| Real-time multi-GB BIM collaboration | Autodesk / ACC integration — not replace Postgres register | Link, don’t fork DB |
| Search quality fails at scale | Meilisearch/Typesense beside Postgres | **Yes — metadata source** |

**Anti-pattern:** standing up Mongo/Firestore/SharePoint as a second system of record for documents while Taskr stays on Supabase. That splits auth, billing GB, and promote-from-task flows.

---

## Alternatives considered (summary)

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Supabase Postgres + Storage** | Shared auth/RLS, already in prod, TUS, mid-market cost | Egress + no Glacier; PDF text extract DIY | **Choose** |
| Postgres + **R2/S3** blobs | Cheaper egress at scale | Two upload paths; sync orphan risk | Defer until cost evidence |
| **SharePoint / Google Drive** as DMS | Familiar UI | No construction revision/RFI model; weak project isolation walls | Reject as SoT |
| **Procore/ACC** embed | Instant parity | Kills wedge; pricing/lock-in | Reject |
| Dedicated DMS SaaS API | Faster features | Dual billing, dual identity | Reject for Phase 2 |

---

## Delivery order (roadmap)

Aligned with spec §8; registered in `documentation/ROADMAP.md` Order **15.x**:

1. **M-DMS-00** — this investigation (Closed)
2. **M-WEB-01 / 02** — admin + project web shells (prereq for usable DMS UX)
3. **M-DMS-01** — schema + register + upload + revisions + audit
4. **M-DMS-02** — folders/ACL + search + CSV
5. **M-DMS-03 / 04** — RFI / Submittals
6. **M-WEB-03** — reports / branding
7. **M-QA-04** — web E2E
8. **M-DMS-DATA** — company GB rollup shared with Taskr (can idle-parallel after M-DMS-01 schema has `file_size_bytes`)

**Wave 2** = second product release (after first commercial ship). Not week-rank R2 (RC rebuild). Do not schedule as active focus until commercial RC is out; Pipeline is fine for design/schema dry-run artefacts. Live DDL still requires Human Gate.

---

## Open decisions (non-blocking for Pipeline)

1. Expo Web vs separate React web router for `/a` and `/p` routes  
2. Email provider (Resend vs SendGrid)  
3. Exact bucket `file_size_limit` (500 MB vs 2 GB)  
4. Lock commercial GB ladder (10 / 100 + packs) into R6 SoT when user accepts  

---

## References

- Product spec: `docs/superpowers/specs/2026-08-06-web-admin-and-dms-product-spec.md`
- Web plan stub: `docs/superpowers/plans/2026-08-06-ws-web-01-and-02-web-admin-shell-and-project-workspace.md`
- Storage SoT: `buildtrack-files` private + signed URLs (M-SUPABASE-03c); retention policy (M-SUPABASE-04c)
- Supabase Storage limits: Pro max upload up to 500 GB global; TUS resumable for large files  
