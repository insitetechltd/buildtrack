# M-SUPABASE-03b Close Report (2026-08-08)

## Summary

Closed **M-SUPABASE-03b** after Human GO for Phase B live apply (`you have GO for Phase B live apply` in chat transcript).

6-col list: `primary_assignee_id`, `delegated_user_ids`, `container_id`, `sub_container_id`, `tags`, `location_on_site`.

## Phase A (artefacts)

- Forward: `supabase/migrations/20260808000300_msupabase03b_tasks_6col_metadata.sql`
- Rollback: `supabase/migrations/20260808000301_msupabase03b_ROLLBACK.sql`
- Checklist: `docs/superpowers/reports/2026-08-08-m-supabase-03b-phase-a-schema-review.md`
- Parity apply + rollback DRY_RUN rc=0
- Commit: `3988cd0`

## Decisions applied

| ID | Choice |
|---|---|
| D1 | Keep text/text[] (live-compatible); UUID upgrade deferred |
| D2 | Not in this close — separate later if needed |
| D3 | `containers` table deferred (absent; S-UX-01N / later) |
| D4 | Backfill `assigned_to[1]::text` only |

## Phase B (production)

- Applied via pooler **session** `:5432` (CONCURRENTLY-safe)
- ADD COLUMN IF NOT EXISTS: all 6 already present → skipped notices
- Indexes IF NOT EXISTS: already present → skipped
- Backfill: `primary_assignee_id` set on **89 / 97** tasks (matches rows with `assigned_to` cardinality ≥ 1)
- Anon regression vs 02a: **permission_denied (42501) on all 7 tables** (ok=0 denied=7)

## Validation

- `npx jest src/state/__tests__/taskStore.deferred-fallback.contract.test.ts` — contract path still PASS (fallback when columns missing)
- `npx tsc --noEmit` rc=0
- `npm run test:regression` — 37 suites / 160 tests PASS

## Unblock notes

S-UX-01J / 01K / 01M / 01N: Prereq M-SUPABASE-03b **Closed**. Unblocked to schedule. Not marked Closed.

## Residual risks

- Types remain text/text[] (not UUID FK) — Decision D2 open
- No `containers` parent table — 01N still needs DDL design
- Multi-assignee rows: only `[1]` copied to primary; tail not written to `delegated_user_ids`
- Sustained 7-day deferred fire-rate metric is M-SUPABASE-03d follow-on
