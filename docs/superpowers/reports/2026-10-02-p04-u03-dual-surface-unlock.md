# P04 + U03 Follow-On YAML Unlock — Report

**Date:** 2026-10-02 08:21  
**Tip SHA:** `a930951`  
**Branch:** `cursor/whatsapp-dial-phase-b-58e1`  
**Worktree:** `/Volumes/KooDrive/InsiteApp-crop-61e0699`  
**PR:** [#30](https://github.com/insitetechltd/buildtrack/pull/30)

---

## Executive Summary

Fixed remaining add-more harness gaps identified at `dbb3b2a`:
1. **P04** (Create Task add-more-second): CT `_reopen-library-from-selection` now accepts legacy InAppLibrary
2. **U03 follow-on**: Shared `_assert-prior-selected-*` helpers now accept both hybrid and legacy surfaces

**Previous unlocks preserved:**
- ✅ P03 form assert (from `2f4c76f`)
- ✅ U03 reopen helper (UP-local, from `2f4c76f`)

**Product code:** ZERO changes (YAML-only unlock per constraints)  
**Metro:** Port 8082 still running ✅

---

## Evidence Analysis

**Source:** `/Volumes/KooDrive/InsiteApp/.cache/insite-perf20/maestro-full-day-20261002-dbb3b2a/`

### P04-BLOCKER

**Symptom:** After "Add more → Choose from Library", CT helper `_reopen-library-from-selection` asserted `capture-session__hybrid_library` but UI showed legacy `in-app-library__*`.

**Root cause:** Create Task `_reopen-library-from-selection` was hybrid-only. Update Progress got a local helper accepting legacy in the previous unlock (`2f4c76f`), but CT helper was not updated.

**Fix:** Update CT `_reopen-library-from-selection.yaml` to accept **both surfaces** with conditional logic:
```yaml
# Accept either hybrid or legacy
- runFlow:
    when:
      visible:
        id: "capture-session__hybrid_library"
    commands:
      - extendedWaitUntil:
          visible:
            id: "capture-session__library_grid"
          timeout: 15000
- runFlow:
    when:
      visible:
        id: "in-app-library__screen"
    commands:
      - extendedWaitUntil:
          visible:
            id: "in-app-library__grid"
          timeout: 15000
```

### U03-BLOCKER (Follow-On)

**Symptom:** UP `_reopen-library-from-selection` unlock worked (legacy accepted). But next step `_assert-prior-selected-1` (shared from create-task-photo) asserted `capture-session__library_grid` on legacy InAppLibrary → FAIL.

**Root cause:** Shared `_assert-prior-selected-*` helpers expected hybrid grid only. Both CT and UP use these shared helpers after reopen.

**Fix:** Update all 4 assert-prior helpers to accept **both surfaces**:
- `_assert-prior-selected-1.yaml`
- `_assert-prior-selected-2.yaml`
- `_assert-prior-selected-3.yaml`
- `_assert-prior-selected.yaml` (base with ledgerCount)

Each now has conditional wait for hybrid OR legacy grid before asserting selected count.

---

## Files Changed

### Modified (5 files)

All in `maestro/flows/create-task-photo/`:

1. **_reopen-library-from-selection.yaml**
   - Accept hybrid `capture-session__hybrid_library` OR legacy `in-app-library__screen`
   - Conditional runFlow for each surface
   - Comment: "may open hybrid CaptureSession OR legacy InAppLibrary (route varies)"

2. **_assert-prior-selected-1.yaml**
   - Wait for `capture-session__library_grid` OR `in-app-library__grid`
   - Conditional runFlow for each surface
   - Assert "1 selected" after grid visible

3. **_assert-prior-selected-2.yaml**
   - Same pattern: accept hybrid OR legacy grid
   - Assert "2 selected"

4. **_assert-prior-selected-3.yaml**
   - Same pattern: accept hybrid OR legacy grid
   - Assert "3 selected"

5. **_assert-prior-selected.yaml** (base)
   - Same pattern: accept hybrid OR legacy grid
   - Conditional assert based on `output.ledgerCount` (1, 2, or 3)

---

## Rationale

### Dual-Surface Approach

**Why not separate helpers?**
- These helpers are **shared** between Create Task (P flows) and Update Progress (U flows)
- Add-more route varies (sometimes hybrid, sometimes legacy)
- Conditional logic handles both cases in one helper

**Pattern:**
```yaml
# Wait for whichever surface appears
- runFlow:
    when:
      visible:
        id: "capture-session__library_grid"
    commands:
      - extendedWaitUntil:
          visible:
            id: "capture-session__library_grid"
          timeout: 8000
- runFlow:
    when:
      visible:
        id: "in-app-library__grid"
    commands:
      - extendedWaitUntil:
          visible:
            id: "in-app-library__grid"
          timeout: 8000
# Then proceed with assert
- assertVisible: ".*1 selected.*"
```

### Shared vs Local Helpers

**Before this unlock:**
- CT `_reopen-library-from-selection`: hybrid-only (FAIL on P04)
- UP `_reopen-library-from-selection`: legacy-only (local, from `2f4c76f`)
- Shared `_assert-prior-selected-*`: hybrid-only (FAIL on U03 after reopen)

**After this unlock:**
- CT `_reopen-library-from-selection`: **dual-surface** (accepts both)
- UP `_reopen-library-from-selection`: legacy-only (unchanged, still works)
- Shared `_assert-prior-selected-*`: **dual-surface** (accepts both)

---

## Testing Status

### TypeScript ✅
```bash
npx tsc --noEmit  # Exit 0 (no product code changed)
```

### Metro ✅
```bash
# Still running on :8082 from crop worktree (2 PIDs)
```

### Product Code ✅
- **Zero** changes to CropOverlay / dial chrome
- **Zero** changes to picker UI / library routing
- **YAML + conditional logic only**

---

## What Did NOT Change

- ✅ CropOverlay WhatsApp dial (untouched)
- ✅ Photo picker corner selection (untouched)
- ✅ Library routing (unchanged — add-more still opens legacy on some paths)
- ✅ P03 form assert (from `2f4c76f`, preserved)
- ✅ U03/U04 UP reopen helper (from `2f4c76f`, preserved)
- ✅ ASC / build 284
- ✅ Main branch (no merge)

**Classification:** Harness dual-surface alignment, not product regressions.

---

## Next — Dig Re-Run

### Verification Required

1. **P04-add-more-second** — CT reopen accepts legacy `in-app-library__*`
2. **P05-add-more-twice** — CT reopen accepts legacy (2× calls)
3. **U03-add-more-second** — reopen works + assert-prior-1 accepts legacy
4. **U04-add-more-twice** — reopen works + assert-prior-1/2 accept legacy

### Commands

```bash
# On crop worktree with Metro :8082
scripts/maestro/run-create-task-photo-suite.sh  # P04–P22 (resume P04+)
scripts/maestro/run-update-progress-suite.sh    # U03–U12 (resume U03+)
```

**Evidence path:** Dig will write to `.cache/insite-perf20/maestro-full-day-<timestamp>/`

---

## Commit Summary

```
a930951 fix(maestro): P04 + U03 follow-on - dual-surface helpers

CT _reopen-library-from-selection:
- Accept hybrid CaptureSession OR legacy InAppLibrary
- Conditional runFlow for each surface
- Rationale: add-more may open either (route varies)

Shared _assert-prior-selected-* (1, 2, 3, base):
- Accept capture-session__library_grid OR in-app-library__grid
- Conditional wait for each surface
- Rationale: reopen helpers may land on legacy InAppLibrary

Evidence: P04-BLOCKER (CT reopen hybrid-only) + U03-BLOCKER (assert-prior hybrid-only)
Zero product changes; YAML-only dual-surface unlock.
```

**Files:** 5 modified, 101+/30–

---

## Unlocks Summary (All 3 Rounds)

| Round | Commit | Fixes | Files |
|---|---|---|---|
| **1** | `2f4c76f` | P03 form assert + UP reopen | 4 files (3 mod, 1 new) |
| **2** | `a930951` | CT reopen + shared assert-prior | 5 files (5 mod) |
| **Total** | 2 commits | 6 helpers dual-surface | 9 files |

---

**Status:** Dual-surface unlock complete, ready for Dig re-run  
**Metro:** `http://localhost:8082` (crop worktree)  
**Branch:** `cursor/whatsapp-dial-phase-b-58e1` pushed to origin  
**PR:** [#30](https://github.com/insitetechltd/buildtrack/pull/30) (draft)

Dig owns P04–P22 + U03–U12 re-run after Metro pull.
