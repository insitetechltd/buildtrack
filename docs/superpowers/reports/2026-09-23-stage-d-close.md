# Stage D close — Org + account lifecycle

**Date:** 2026-09-23  
**Verdict:** **CLOSED** (Judge GO after Gate B ITERATE re-prove)  
**Tip SHA:** `ed87a32` (dirty — 107 files / +2711 −673)  
**Evidence:** `docs/superpowers/evidence/2026-09-22-stage-d/`  
**Machine result:** `stage-d-close-result.json`

## Gate B fold

[Proof Adversary](bc-bc70dcb4-de85-5d50-96b0-7804c21ffe59) first verdict **ITERATE** (Critical: isolated U01/D01 ≠ canonical `rc-worker-be` + full dual-user; prove-order tail predated fixes).

### Must-fix cleared (same dirty tip, ordered)

| # | Command | Log | Result |
|---|---|---|---|
| 1 | `npm run test:e2e:maestro:rc-worker-be` | `rc-worker-be-reprove.log` | **PASS** P01+U01 (U01 ~200s rc=0) |
| 2 | `npm run test:e2e:maestro:dual-user` (no ONLY=) | `dual-user-full-reprove.log` | **GATE PASS** H01+D01 · artifacts `dual-user-20260923_085248` |
| 3 | `test:dual-env:p-matrix` → `seed:dev-qa` | `p-matrix-reprove.log` + `reseed-reprove.log` | **PASS** / ADMIN_COUNT_OK 2 |

## Done criteria map

| # | Criterion | Status |
|---|---|---|
| 1 | Seed Carol+Dave admin, John field | PASS (reseed-reprove) |
| 2 | Org Maestro O1–O3/S2/S3 | PASS (prior `org-ca-manifest-20260922_231641.json`; not re-run — see residual) |
| 3 | A-D01 OPEN | PASS (honest) |
| 4 | Post-demotion `rc-worker-be` + `dual-user` | **PASS** (canonical scripts, Gate B re-prove) |
| 5 | p-matrix + O4 reporting + re-seed | **PASS** after RC/dual-user |
| 6 | Evidence + ASC untouched | PASS |

## Residual (carry)

- A-D01 Dashboard-only product GO  
- O4 DB last-admin Human GO  
- Org Maestro not re-run after helper deltas (Gate B High; Criticals cleared)  
- Optional: commit dirty tree; seat-chip dogfood  

## Next

Stage E · optional commit Stage A–D tree · O4 Human GO when ready.
