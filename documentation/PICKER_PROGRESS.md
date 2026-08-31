# Picker progress (monitor this file)

**Refresh this file from the iOS Cursor app.** Path: `documentation/PICKER_PROGRESS.md`  
**Milestone:** `WS-PERF / M-PERF-03` — Photos index. Idle-parallel.

**Last updated:** 2026-08-30 23:55 +08

---

## Goal (orchestrator)

1. **First photo ≤ 3s** (`1st` HUD / `LIBRARY_FIRST_PHOTO_BUDGET_MS`)
2. **Continuous fill** until full library (limited → same-token expand on **scroll near end**, not first paint)
3. **Accept / checkmark** must land Select Photos without exporting originals (export at Draw/upload, 1920 cap)
4. **≤10 code/TF iterations** then stop if unmet

## Status

**NOW:** Accept no longer exports full-res (JS). Draw/upload cap 1920 needs native `exportCappedJpeg` (new TF). HQ thumbs + zoom + tile grip parked. TF237 first-paint PASS; TF239 was 2× thumb experiment.

HUD `1st 12` is the **previous overlay** in the same JS process, not the current open. **`up` is not upload.** Full legend: `docs/superpowers/analysis/2026-08-30-photokit-first-paint-journey.md`.

**Daily TF:** `./build-and-submit.sh ios` (profile `dev`)

---

## Iteration log

| # | Change | Proof |
|---|---|---|
| 0 | TF233 native2b | meta ~11s |
| 1 | warm bridge + fetchLimit limited | TF234 HUD miss: meta 13.2s / 1st 19.3s |
| 2 | unsorted Recents newest-N; no warm wait; defer expand | TF235: reopen 107ms; cold first 9.5–13.8s; Accept hang |
| 3 | unfiltered Recents walk; persist newest ids | Jest; TF236 |
| 4 | pause thumbs on Accept; expand only after user scroll near end | TF237 headed: `1st +69ms` (repeatable); one-shot ~8s |

---

## TF237 headed (2026-08-30)

| HUD | Meaning |
|---|---|
| `meta +54` / `1st +69` / `row +70` / `12 +173` | This open. First tile well under 3s |
| `p2 +75` | Second wave from first screen, not overlay |
| `1st 12 +140` | **Previous** overlay’s first-12 (also fast) |
| `up —` | No scroll-up sample this open (not upload) |
| One ~8s first launch | Photos Recents enumeration once; OS stays warm after that |

---

## Thumb 2× experiment (pending TF)

TF237 delivered **256px** (JS asked ~tile×3, Swift `maxThumbPixel` clamped). This experiment requests **512px** (`LIBRARY_PHOTOKIT_THUMB_LINEAR_SCALE = 2`). HUD line: `thumb 512px`.

**Compare only when:** Photos-warm, Recents, `meta` tens of ms (ID-open, not a Recents scan), same device. Area is **4×** so `1st`/`12`/`p2` will likely grow; first-paint budget is still 3s.

**Not the same as:** changing `LIBRARY_THUMB_MAX_PIXELS` (320) — that is the JS Image fallback, not native Photokit tiles.

---

## Invariant

Photos-heavy Recents scans only via `runExclusivePhotokitJob`. Accept originals run **after** thumbs paused + gate idle. Persisted-id open (30 localIdentifiers) is not a Recents scan.
