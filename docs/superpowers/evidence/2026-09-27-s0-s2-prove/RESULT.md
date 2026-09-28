# S0–S2 prove results — 2026-09-27

**Tip SHA:** `7d65e97`  
**Audit SoT:** `docs/superpowers/evidence/2026-09-27-test-blind-spot-audit.md`

| Slice | Plane | Command | Result |
|---|---|---|---|
| **S0** schema-parity | PROD-DEST | `npm run test:schema-parity` | **PASS** — 252 cols / 30 CHECKs / 67 policies DEV≡PROD; `reported` ⊆ TaskStatus |
| **S0** critical | DEV+PROD | `npm run test:dual-env:critical` | **GO** — fails=0 warns=2 (`upa.assigned_at` dialect) |
| **S0** p-matrix (baseline) | DEV+PROD | `npm run test:dual-env:p-matrix` | **PASS** — PROD+DEV gates (pre-F7) |
| **S1** webhook faith | DEV-PROBE | `npm run test:edge:stripe-webhook-faith` | **GO** — bad sig 400; first `{received:true}`; dup `{duplicate:true}` |
| **S2** F7 cross-company | PROD-DEST | `npm run test:dual-env:p-matrix` (F7 in promote gate) | **PASS** — DEV+PROD F7 PASS; PROD GATE includes F7 |

## Artifacts

- `schema-parity.log` / `assert-schema-parity.json`
- `dual-env-critical.log`
- `p-matrix.log` (S0 baseline)
- `p-matrix-f7.log` + `phase2-p01-p10-matrix.{json,md}` (S2)
- `s1-webhook-faith.log` / `s1-stripe-webhook-faith.json`

## Code landed with S1/S2

- `scripts/stripe/probe-webhook-faith.py` + npm `test:edge:stripe-webhook-faith`
- `scripts/supabase/probe-p01-p10-dual-target.py` — case **F7** + promote/DEV gates

## Still open (not this slice)

- O4 last-admin still REPORTING FAIL/OWED (`count=0` precondition)
- S3+ from audit (anon 7-table re-probe, add-ons Edge, signup happy path, …)
