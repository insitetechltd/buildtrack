# S3–S5 prove — 2026-09-27

**Tip SHA:** `7d65e97` (working tree dirty with probes/migration)

| Slice | Status | Evidence |
|---|---|---|
| **S3** Anon 7-table + billing sample | **CLOSED** — `test:dual-env:critical` GO (fails=0 warns=2) | `s3-critical.log` |
| **S4** `update-company-addons` dry faith | **CLOSED** — DEV GO (anon 401 / CA invalid / mismatch / worker deny) | `s4-update-company-addons-faith.json` |
| **S5** Last-admin O4 | **CLOSED** — Human GO; migration applied DEV→PROD; `O4_PROMOTE_GATE=1` PASS | `s5-apply-*.log` + `s5-pmatrix-go-confirm.log` |

## S5 closed

```bash
O4_PROMOTE_GATE=1 npm run test:dual-env:p-matrix
# PROD GATE … + O4 … PASS
# DEV GATE … + O4 PASS
```

## Scripts landed

- `scripts/supabase/probe-critical-paths-dual-env.py` — anon core7 + billing sample
- `scripts/stripe/probe-update-company-addons-faith.py` + `npm run test:edge:update-company-addons-faith`
- O4 users upsert fixture; `O4_PROMOTE_GATE=1` opt-in until migration live
