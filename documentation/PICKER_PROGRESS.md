# Picker progress (monitor this file)

**Refresh this file from the iOS Cursor app.** Path: `documentation/PICKER_PROGRESS.md`  
**Milestone:** `WS-PERF / M-PERF-03` — Photos index. Idle-parallel.

**Last updated:** 2026-08-30 15:50 +08

---

## Goal (orchestrator)

1. **First photo ≤ 3s** (`1st` HUD / `LIBRARY_FIRST_PHOTO_BUDGET_MS`)
2. **Continuous fill** until full library (limited → same-token expand)
3. **≤10 code/TF iterations** then stop if unmet

## Status

**Iteration 1 (code, pending TF234):**  
- Warm-first on `native2b` capture prefetch + bridge before limited await  
- Limited open: `fetchLimit`+sorted; skip cold `stopCachingImagesForAllAssets`  
- Batch 60→30; bridge paint interval 450→48ms  
- HUD adds `1st` (first tile)  
- Automated: `npm run test:picker-timing` + Maestro `maestro/flows/perf/library-first-photo-budget.yaml` (3s `library_first_ready`)

**TF233 baseline:** meta/12 ~11s, p2 +74ms, path `native/native2b`

**Daily TF:** `./build-and-submit.sh ios` (profile `dev`)

---

## Iteration log

| # | Change | Proof |
|---|---|---|
| 0 | TF233 native2b | meta ~11s |
| 1 | warm bridge + fetchLimit limited + tests | Jest picker-timing PASS; TF234 next |

---

## Invariant

Photos-heavy work only via `runExclusivePhotokitJob`. Never parallel warm∥open.
