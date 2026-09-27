# Close: CA→worker live + `on_hold` slot dormant

**Date:** 2026-08-27  
**Scope:** Billing seat law verification + project status slot policy (docs/audit; no live DDL this close)

## Verdict

| Item | Outcome |
|---|---|
| CA counts as worker | **Already live on DEV** — not outstanding |
| Drop `on_hold` CHECK (`20260825000600`) | **Dormant — do not apply** (reserved fifth status slot) |

## Evidence (DEV `zusulknbhaumougqckec`)

### CA → worker (applied)

- `seat_class_rules` for `admin` / `company_admin`: `consumes_pm_seats=false`, `consumes_worker_seats=true`
- `users.deployable_seat` column present
- `user_seat_contribution('admin', true, null)` → `pm_seats=0`, `worker_seats=1`
- `user_seat_contribution(..., 'pm')` → PM upgrade path works
- `enforce_company_seat_limits` uses `deployable_seat`
- App SoT: `src/billing/seatUsage.ts` (+ invite-user Edge fallback)

### `on_hold` (parked)

- Product UI: On Hold removed; Active label = **On-going**
- App: `normalizeProjectStatus('on_hold')` → `active`
- DB CHECK still allows `on_hold` (0 rows live)
- Migration file marked **DORMANT — DO NOT APPLY**: `supabase/migrations/20260825000600_projects_drop_on_hold.sql`
- **Revive:** product GO → apply remap + tighten CHECK, or re-purpose the slug with new meaning + app type/label updates

## App / docs touched this close

- `src/ui/contracts/projectStatus.ts` — dormant-slot comments
- `supabase/migrations/20260825000600_projects_drop_on_hold.sql` — DORMANT header
- `documentation/NOW.md` — Locked + Parked
- This report

## Out of scope / next

- No invite-user redeploy required for CA→worker (DB rules already flipped)
- Pipeline priority unchanged: **`M-OPS-ENV-01`** start cutover
