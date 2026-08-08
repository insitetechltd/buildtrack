# M-SUPABASE-03b Phase A — Schema Review Checklist

**Date:** 2026-08-08  
**Milestone:** WS-SUPABASE / M-SUPABASE-03b  
**Status:** Phase A artefacts complete — **AWAITING HUMAN GO for Phase B**  
**ROLLOUT WARNING (verbatim F-003):** M-SUPABASE-01 proposes the migration placeholder ONLY. Actual migration execution is a separate follow-on milestone M-SUPABASE-03b that requires Schema Review Gate; see ROADMAP.md deferred context. Do NOT merge live apply without written GO.

6-col list: `primary_assignee_id`, `delegated_user_ids`, `container_id`, `sub_container_id`, `tags`, `location_on_site`.

---

## (a) Column definitions (Decision D1 — LIVE-COMPATIBLE)

| Column | Prompt 2 target | Live production (2026-08-08 RO) | Phase A migration ensures |
|---|---|---|---|
| primary_assignee_id | UUID → users(id) | **text** (nullable) | text IF NOT EXISTS |
| delegated_user_ids | UUID[] | **text[]** | text[] IF NOT EXISTS |
| container_id | UUID | **text** | text IF NOT EXISTS |
| sub_container_id | UUID | **text** | text IF NOT EXISTS |
| tags | TEXT[] | **text[]** | text[] IF NOT EXISTS |
| location_on_site | TEXT | **text** (25/97 populated) | text IF NOT EXISTS |

**Decision D1 (recommended):** Keep text/text[] as current canonical types so prod + parity converge without dual-type drift. UUID upgrade is **Decision D2** (optional Phase B-2, separate GO).

**assigned_to:** production is `uuid[] NOT NULL` (86 singleton / 3 multi / 8 empty). Scalar `primary_assignee_id = assigned_to` is invalid; Phase A backfill uses `assigned_to[1]::text`.

**Artefact:** `supabase/migrations/20260808000300_msupabase03b_tasks_6col_metadata.sql`

---

## (b) Indexes + CONCURRENTLY justification

| Index | Definition | Notes |
|---|---|---|
| idx_tasks_primary_assignee_id | btree(primary_assignee_id) | Already on prod; migration IF NOT EXISTS |
| idx_tasks_tags | gin(tags) | Already on prod; migration IF NOT EXISTS |

CREATE INDEX CONCURRENTLY required so live apply (Phase B) does not lock writes on `tasks`. Apply via `psql` **session** port (pooler `:5432` or direct) — not inside a wrapping transaction.

---

## (c) Best-effort backfill estimate (from live RO + Gate 1)

| Metric | Value |
|---:|
| task_rows | 97 |
| with_assigned_to (array non-empty cardinality≥1) | 89 (86+3) |
| primary_assignee_id already set | 0 |
| backfill candidates (primary empty + assigned_to[1] present) | ~89 |
| location_on_site already set | 25 |
| tags non-empty | 1 |
| container / delegated populated | 0 |

Parity tenant: columns ensured 6/6 after Phase A apply; backfill no-op if `assigned_to` absent or empty.

---

## (d) Rollback proof (parity)

| Step | Result |
|---|---|
| Forward apply on parity (session `:5432`) | rc=0 — added missing `primary_assignee_id` + `delegated_user_ids`; others skipped exist |
| Rollback DRY_RUN (default GUCs) | rc=0 — **no drops** after GUC NULL-guard fix |
| Bug fixed | Missing GUC previously treated as apply (NULL boolean). Now `coalesce(...,'')` → dry-run |

**Artefact:** `supabase/migrations/20260808000301_msupabase03b_ROLLBACK.sql`  
Apply rollback only with:
`SELECT set_config('msupabase03b.rollback_apply','true', true);`  
and optionally `allow_drop_columns=true` for empty-column drops.

---

## (e) Timeline for live apply (recommended)

1. Human signs Decisions D1/D2/D3 below.
2. Off-hours Phase B window on production pooler session mode.
3. Run forward migration → verify 6/6 columns + indexes → spot-check backfill counts.
4. Anon SELECT regression vs 02a close (permission_denied all 7).
5. Deferred-fallback contract / unit tests → fire rate 0 expectation on column-missing path.
6. Close ROADMAP 13.4; unblock notes on 13.12–13.15 (do not mark UX Closed).

**Production must NOT be written until GO.**

---

## Decision register (Human)

| ID | Decision | Options | Your choice |
|---|---|---|---|
| D1 | Column types for Phase B | (A) Keep text/text[] as shipped in Phase A artefact **RECOMMENDED** / (B) Force UUID/UUID[] ALTER TYPE | _ |
| D2 | If D1=B: type upgrade in same Phase B? | (A) Same GO / (B) Separate later milestone | _ |
| D3 | `containers` parent table (absent today) | (A) Defer to S-UX-01N prep / (B) Bundle CREATE TABLE in Phase B | _ |
| D4 | Backfill multi-assignee rows (cardinality>1) | (A) Use `[1]` only **RECOMMENDED** / (B) Also seed delegated_user_ids from tail | _ |

---

## Human GO line (Phase B)

Sign **only** when ready for live production apply:

> I have reviewed this checklist (D1–D4). **you have GO for Phase B live apply** on production for `20260808000300_msupabase03b_tasks_6col_metadata.sql`.

Signer: ______________  Date: ______________

Until that exact GO phrase appears in chat (or signed above), agents remain **Phase A ONLY**.

**GO RECORDED (2026-08-08):** chat transcript contained `you have GO for Phase B live apply`. Phase B executed same day — see `2026-08-08-m-supabase-03b-close.md`.

---

## Phase A evidence paths

- Forward: `supabase/migrations/20260808000300_msupabase03b_tasks_6col_metadata.sql`
- Rollback: `supabase/migrations/20260808000301_msupabase03b_ROLLBACK.sql`
- This checklist: `docs/superpowers/reports/2026-08-08-m-supabase-03b-phase-a-schema-review.md`
- Prior Gate 1: `docs/superpowers/evidence/m-supabase-02a-02b-gate1-redacted-20260808.md`
