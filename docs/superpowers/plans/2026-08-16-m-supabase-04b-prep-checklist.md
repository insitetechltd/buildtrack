# M-SUPABASE-04b Prep Checklist — Docs Only (2026-08-16)

**Status:** Prep only. **No live SQL. No column drops. No dual-write removal until cool-down + Human GO.**  
**Milestone:** `WS-SUPABASE / M-SUPABASE-04b`  
**Cool-down:** M-SUPABASE-03b live apply **2026-08-08** → earliest drop window **~2026-09-07**  
**Sources:** `documentation/ROADMAP.md` row 04b; findings F-007 / F-008; `TASK_STATUS_UNIFIED_MIGRATION.sql` STEP 4 (commented drops).

## Purpose

Inventory what 04b will touch so the post–2026-09-07 apply is boring and reversible.

## Hard gates before any live drop

- [ ] Calendar date ≥ **2026-09-07** (30d cool-down post 03b)
- [ ] Explicit Human GO for 04b live apply (schema danger gate)
- [ ] Read-only audit on production: confirm which legacy columns still exist + dual-write still active
- [ ] Forward migration + ROLLBACK artefacts under `supabase/migrations/`
- [ ] Parity / dry-run on non-prod if available
- [ ] Close gate after apply: `npx tsc --noEmit` + `npm run test:regression`

## Candidate legacy columns (from TASK_STATUS_UNIFIED_MIGRATION.sql STEP 4)

Commented historical drop list (verify live before applying):

| Column | Notes |
|--------|--------|
| `current_status` | Legacy status path; app still maps heavily via `taskStore` |
| `accepted` | Legacy boolean; superseded by unified `status` |
| `ready_for_review` | Legacy flag |
| `review_accepted` | Legacy flag |
| `decline_reason` | **Old name** — superseded by `declined_reason` |

**Do not blindly drop** unified fields `status`, `declined_reason`, `rejected_reason` — those are the replacement model.

Also verify presence/usage of related review fields still written from the app (`accepted_at`, `accepted_by`, `reviewed_by`, `reviewed_at`) before any DROP list is finalized — ROADMAP wording is broader than STEP 4; **live audit decides**.

## App dual-write / dual-read inventory (repo scan 2026-08-16)

Primary SoT: `src/state/taskStore.supabase.ts`

| Area | Evidence |
|------|----------|
| Create path | Writes `accepted_at` when creator assigned (~L114, ~L3376, ~L3597) |
| Update path | Maps `acceptedAt` / `readyForReview` / `reviewAccepted` into snake columns (~L2053–2071, ~L3842–3852) |
| Read mapping | Hydrates `acceptedAt` from `accepted_at` in multiple fetch mappers |
| Parity helpers | `src/__tests__/parity/adapters/taskRead.adapter.ts` reads `accepted_at` |
| Type aliases | `src/types/__tests__/buildtrack.legacy-aliases.parity.test.ts` |

04b implementation must remove dual-write branches **and** update these readers/tests in the same cycle.

## Proposed Phase A artefacts (create when scheduling 04b — not now)

1. `supabase/migrations/<ts>_msupabase04b_legacy_status_cleanup.sql` — DROP only columns confirmed unused by audit  
2. Matching `…_ROLLBACK.sql` — recreate dropped columns as nullable text/bool with no data restore guarantee  
3. Schema review checklist (Human Gate) mirroring 03b Phase A style  
4. App PR: strip dual-write in `updateTask` / create paths; keep unified `status` + reason fields  

## Explicit non-goals (still blocked / separate)

- Live DROP before ~2026-09-07  
- M-SUPABASE-04e cold archive  
- Changing RLS / role CHECK (already closed 02a/03a)  

## Next kickoff prompt (after cool-down)

```text
M-SUPABASE-04b Phase A only: artefacts + RO live column audit + Human Gate checklist.
NO LIVE DROPS until I say GO. Cool-down started 2026-08-08 (window ~2026-09-07).
Prep SoT: docs/superpowers/plans/2026-08-16-m-supabase-04b-prep-checklist.md
```
