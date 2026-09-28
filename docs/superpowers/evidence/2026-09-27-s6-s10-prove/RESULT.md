# S5 confirm + S6–S10 prove — 2026-09-27

**Tip base:** `7d65e97` (+ working tree for taxonomy/probes)

| Slice | Status | Evidence |
|---|---|---|
| **S5** Last-admin O4 | **CLOSED** — Human GO DEV+PROD; `O4_PROMOTE_GATE=1` p-matrix PASS both planes | `../2026-09-27-s3-s5-prove/s5-pmatrix-go-confirm.log` |
| **S6** Signup happy path | **CLOSED** — `npm run test:edge:signup-happy-path` GO (DEV test-mode) | `s6-signup-happy-path.json` |
| **S7** Entitlement product law | **CLOSED** — SoT + Jest | `documentation/ENTITLEMENT_PRODUCT_LAW.md` · `companyPlanGate` 4/4 |
| **S8** Maestro quarantine hygiene | **CLOSED** — ledger + N≥3 + teardown policy | `documentation/MAESTRO_QUARANTINE.md` · `maestro/flows/_quarantine/` |
| **S9** Gate C Login+CreateTask | **CLOSED** — Maestro rc=0 + PNG Gate 8 | `s9-gate-c.log` · `gate-c/*.png` |
| **S10** Capability map commit | **CLOSED** — this evidence + audit map in git | commit on tip |

## S6 notes

- DEV `plan_tiers` / `plan_prices` were empty after restore → seeded tiers + `sync-hkd-plan-prices-to-db.py` (test HKD).
- DEV missing `on_auth_user_created` → repaired from `handle_new_user` SQL (PROD already had trigger).
- Stripe Checkout completed via `payment_pages/{cs}/confirm` + `tok_visa` (`expected_amount=0` with trial).
- Webhook upsert hardening landed in `supabase/functions/stripe-webhook/index.ts` (founder profile insert-if-missing). **Redeployed DEV+PROD 2026-09-27** after token refresh.
- **Grok #3 CLOSED:** `test:edge:signup-happy-path` proves `fresh_signup` + `insert_if_missing` (auth orphan → profile INSERT + auth id reuse). Artifact: `s6-signup-happy-path.json`.
- **Grok #2 CLOSED:** p-matrix **P04d** JWT soft-delete + `deleted_at=is.null` list absence — DEV+PROD PASS; in promote `gate_ids`.
- **Grok P1 CLOSED:** path fixes `e55c685`; `test:taxonomy` resolves 622 flow refs; report-journey hard-fails if `_logout.yaml` missing; `test:e2e:maestro:critical` → `maestro/flows/smoke`; gitignore fastlane report + `__pycache__`; map UI-12 + HY-01.

## S9 notes

- Flow: `maestro/flows/smoke/gate-c-login-create-task.yaml`
- Required `npm run seed:dev-qa` (John/Carol passwords were invalid on DEV).
- PNGs: login email focus · password+Sign In · create title+keyboard · Assign dock with keyboard open · after dismiss.
