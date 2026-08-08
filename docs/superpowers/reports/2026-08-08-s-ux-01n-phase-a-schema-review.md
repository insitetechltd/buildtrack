# S-UX-01N Phase A — project_containers Schema Review

**Status:** Phase A artefacts only — **NO LIVE WRITES** until Human GO.  
**Date:** 2026-08-08  
**Slice:** WS-UX / M-UX-01 / S-UX-01N (D3 containers catalogue)

## Artefacts

| File | Role |
|------|------|
| `supabase/migrations/20260808110000_sux01n_project_containers.sql` | Forward CREATE TABLE + RLS |
| `supabase/migrations/20260808110001_sux01n_project_containers_ROLLBACK.sql` | Guarded rollback (default dry-run) |

## Design

- Table: `project_containers` (project-scoped; mirrors `project_locations`)
- Hierarchy: `parent_id` NULL = top-level area; non-null = shallow sub-container
- Task columns stay **text** (`container_id` / `sub_container_id`) per 03b Decision D1 — store UUID strings
- App UX: progressive disclosure — picker hidden until project has containers **or** user expands “Organize by area”

## Decisions (Human)

| ID | Decision | Options | Choice |
|----|----------|---------|--------|
| N1 | Catalogue table name | (A) `project_containers` **RECOMMENDED** / (B) bare `containers` | _ |
| N2 | Live apply tenants | (A) Parity first then prod / (B) Prod only | _ |
| N3 | Soft FK (text ids) vs ALTER to UUID FK | (A) Keep text ids for now **RECOMMENDED** / (B) Bundle D2 UUID upgrade | _ |

## Human GO line (live apply)

Sign **only** when ready:

> I have reviewed this checklist (N1–N3). **you have GO for S-UX-01N containers live apply**.

Signer: ______________  Date: ______________

Until that exact phrase appears in chat (or signed above), agents remain **Phase A ONLY** (migration files + app code that degrades when the table is absent).

**GO RECORDED (2026-08-08):** chat transcript contained `you have GO for S-UX-01N containers live apply`. Live apply + close: `2026-08-08-s-ux-01n-close.md`.
