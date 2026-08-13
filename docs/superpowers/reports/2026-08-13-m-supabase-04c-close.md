# M-SUPABASE-04c Close Report (2026-08-13)

## Summary

Closed **M-SUPABASE-04c** as **docs/policy only**. No live Dashboard lifecycle Expire, no bucket-wide expire, no SQL migrations, no app-code TTLs.

Product policy (agreed in chat; encoded here, not invented in code):

- Paying tenants keep files indefinitely on hot `buildtrack-files`.
- After plan expiry, restore = **back-pay up to 6 months** (objects remain on hot storage during that window).
- Cold archive / Glacier / copy-out / 6–24 month cheap tier is **not** 04c — parked as **M-SUPABASE-04e**.

Hosted Supabase Storage can hot-retain and optionally expire/delete. 04c uses **hot retain only**. Hosted Storage cannot Glacier / lifecycle-transition (`PutBucketLifecycleConfiguration` unsupported; no `x-amz-storage-class`).

## Evidence

| Artefact | Path |
|---|---|
| Runbook policy | `documentation/audit/database/SUPABASE_OPERATIONS_RUNBOOK.md` § Storage retention / lifecycle (M-SUPABASE-04c) |
| ROADMAP Closed notes | `documentation/ROADMAP.md` Order 13.10 |
| AGENTS status | `AGENTS.md` § Current Delivery Status |
| Follow-on cold archive | `documentation/ROADMAP.md` **M-SUPABASE-04e** Order 13.18 (Pipeline deferred) |

## Explicit non-claims

- Did **not** apply Dashboard Storage lifecycle Expire on production.
- Did **not** live-expire `buildtrack-files`.
- Did **not** add SQL migrations for 04c.
- Did **not** change F-003 / M-SUPABASE-03b 6-col rules.
- **M-SUPABASE-04b** remains Blocked until ~2026-09-07 (no column drops).

## Residual risks / follow-ons

- Hot storage cost grows with paying-tenant file volume; accepted until 04e copy-out exists.
- Six-month back-pay window is an ops/product process, not an automated expire job.
- **NEXT STEP precedence:** (1) **M-SUPABASE-04b** after ~2026-09-07 (gated SQL). (2) **M-SUPABASE-04e** cold archive later / idle-parallel after 04b is gated. `S-UX-01P` remains deferred.

## Sign-off

| Role | Sign | Date |
|---|---|---|
| Human product policy | chat transcript (hot retain + 6-month back-pay; no cold tier in 04c; no live expire) | 2026-08-13 |
| Docs/policy close (no live apply) | Closed | 2026-08-13 |
