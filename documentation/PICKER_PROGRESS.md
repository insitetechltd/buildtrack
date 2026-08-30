# Picker progress (monitor this file)

**Refresh this file from the iOS Cursor app.** Path: `documentation/PICKER_PROGRESS.md`  
**Milestone:** `WS-PERF / M-PERF-03` — Photos index. Idle-parallel. Does **not** jump App Store / Stripe.

**Last updated:** 2026-08-30 15:10 +08

---

## Status

**NOW:** **TF 233** — `native2b` on `production-local` + **exclusive PhotoKit gate** (no parallel Photos jobs).

**Expect HUD:** `path native/native2b`; first paint from limited open (~60) then same-token expand.

**Invariant (do not regress):** every Photos-heavy call (`warm` / `openLibrary*` / `previewNewestIds` / `expandLibraryFull`) goes through `runExclusivePhotokitJob` in `src/utils/libraryPhotokitGate.ts`. Capture prefetch is single-flight. Never “race timeout” an in-flight warm into another job.

**Parked:** reuse write-up until picker satisfactory.

---

## Remaining plan

| # | Slice | Status |
|---|---|---|
| 1h | Defer warm / serialize | **232** — still raced on open-during-warm |
| 2b | Limited open + same-token expand | **233** A/B arm |
| gate | Exclusive Photos queue | **233** |
| — | Reuse write-up | After satisfactory |

---

## Log

- **231:** warm∥openLibrary starve; `12 ≈ meta ~21s`
- **232:** serialize warm→open in capture; open-during-warm only waited 2.5s → warm miss → meta ~20s
- **233:** PhotoKit gate + single-flight capture prefetch + native2b TF default; stop patching timeouts
- **2B Critical:** no token swap on expand
