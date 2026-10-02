# Path B — Form Reopen Fresh State (Round 6)

**Date:** 2026-10-02  
**Branch:** `cursor/whatsapp-dial-phase-b-58e1` (PR #30)  
**Tip SHA:** `c6e212a`  
**Worktree:** `/Volumes/KooDrive/InsiteApp-crop-61e0699`  
**Metro:** `:8082`  
**Evidence:** `.cache/insite-perf20/maestro-full-day-20261002-d520070/`

---

## Product Decision — Path B

**Question:** After form-plus library reopen, should selection state be preserved?

**Answer:** NO. Form-plus reopen starts **fresh** (selection cleared). This is **CORRECT** product behavior.

**Decision authority:** Tristan GO (Path B) — skip A vs B widget, match Maestro to live product.

**Standing lock:** Do NOT change product to restore selection after form reopen. YAML-only rewrite.

---

## Evidence @ d520070

### What Round 5 Badge Proof Showed

Round 5 (`d520070`) attempted to fix prior-selected assertion by checking order badge text instead of title text. Evidence showed:

**P07 / U05 failure (shared):**
- Assertion: `assertVisible text: "1" index: 0` → **FAIL**
- Title: **"Select photos"** (not "1 selected")
- All checkboxes: **`checked=false` / `selected=false`**
- **No accessible text `"1"`** (order badge not rendered)

### Root Cause Discovery

Prior narrative was WRONG:
- **Round 4 narrative:** Title text races selectedCount state sync after form reopen
- **Round 5 narrative:** Badge should work because it's visual tile state

**Actual behavior @ d520070:**
- Title text does NOT update → "Select photos" forever
- Order badge does NOT render → no "1" text accessible
- Checkboxes report `checked=false` / `selected=false`

**This is not a lag or scraping issue.** The selection array itself is **empty** after form reopen. Product intentionally clears selection to start fresh.

---

## Why Selection-to-Selection Works (P04/P05)

**P04/P05 flow:**
1. Pick first on initial library visit
2. Accept → land on **selection screen** (`photo-selection__`)
3. `_reopen-library-from-selection` → library reopens
4. `_assert-prior-selected-1` → **PASS**

**Entry point:** Selection screen (`photo-selection__confirm` → `Choose from Library`)

**P07/U05 flow:**
1. Pick first on initial library visit
2. Confirm → land on **form** (`create-task__continuous_form` / `report-reply-composer`)
3. `_reopen-library-from-form` → library reopens
4. `_assert-prior-selected-1` → **FAIL**

**Entry point:** Form (`createTask-add-photos` → `Choose from Library` / `report-reply-composer__photo` → `Choose from Library`)

**Different code paths:**
- **Selection screen reopen:** State already warm, selection preserved
- **Form reopen:** Component remounts or rehydrates, selection intentionally cleared

---

## Path B Rewrite — 13 Flows Fixed

### Flows Modified

**Create Task (7):**
- P07 — Confirm to form → + → fresh (cancel)
- P08 — Form + add new 2nd
- P09 — Form + accept fresh pick only
- P16 — Form + re-pick 2nd to edit
- P17 — Form + prior unavailable as duplicate (retap)
- P19 — Form has 2 → remove 1 → + fresh (cancel)
- P22 — Force same asset again via + → single attachment

**Update Progress (6):**
- U05 — Form + fresh (cancel)
- U06 — Form + add second
- U07 — Form + accept fresh pick only
- U10 — Prior unavailable on form +
- U11 — Remove then form + fresh (cancel)
- U12 — Dedupe identity on progress attachments

### Pattern Changes

**Before (all rounds 1–5):**
```yaml
- runFlow: _reopen-library-from-form.yaml
- runFlow: _assert-prior-selected-1.yaml  # ← FAIL on fresh reopen
- runFlow: _pick-slot-1.yaml
- assertVisible: ".*2 selected.*"
```

**After Path B (round 6):**
```yaml
- runFlow: _reopen-library-from-form.yaml
# Form-plus reopen starts fresh (selection cleared) - correct product behavior
- assertVisible: "Select photos"
- waitForAnimationToEnd:
    timeout: 1000
# Re-pick first to restore ledger
- runFlow: _pick-first.yaml  # ← Fresh pick from 0
- runFlow: _pick-slot-1.yaml
- assertVisible: ".*2 selected.*"
```

### Two Rewrite Patterns

**Pattern 1: Assert fresh + cancel (no more selections needed)**

Used by: P07, U05, P19, U11

```yaml
- runFlow: _reopen-library-from-form.yaml
# Form-plus reopen starts fresh (selection cleared) - correct product behavior
- assertVisible: "Select photos"
- waitForAnimationToEnd:
    timeout: 1000
# Phase B: cancel hybrid library via back button
- tapOn:
    id: "app-screen-header__back"
```

**Pattern 2: Assert fresh + re-pick + continue test**

Used by: P08, P09, P16, P17, P22, U06, U07, U10, U12

```yaml
- runFlow: _reopen-library-from-form.yaml
# Form-plus reopen starts fresh (selection cleared) - correct product behavior
- assertVisible: "Select photos"
- waitForAnimationToEnd:
    timeout: 1000
# Re-pick first to restore ledger
- runFlow: _pick-first.yaml  # or _pick-first-b, _pick-slot-0, etc.
# Continue with test-specific picks
- runFlow: _pick-slot-1.yaml
- assertVisible: ".*2 selected.*"
```

---

## What Was NOT Changed

### Flows Using Selection-to-Selection Reopen

**P04 / P05 (and others):**
```yaml
- runFlow: _reopen-library-from-selection.yaml  # ← NOT form reopen
- runFlow: _assert-prior-selected-1.yaml        # ← Still works
```

These flows reopen from **selection screen**, not form. Helper `_reopen-library-from-selection` targets a different entry point and selection IS preserved on that path.

### P03 (Already Correct)

```yaml
- runFlow: _reopen-library-from-form.yaml
- runFlow: _pick-slot-1.yaml
- extendedWaitUntil:
    visible: ".*1 selected.*"  # ← Fresh pick, so "1 selected" is correct
```

P03 never asserted prior selection — it picks fresh after reopen, which matches Path B.

### Product / Dial Chrome

**Zero product changes** across all 6 unlock rounds. Dial implementation untouched since cherry-pick at `ba7cbc3`.

---

## Technical Notes

### Form Reopen Entry Points

**Create Task:**
```yaml
- scrollUntilVisible:
    element:
      id: "createTask-add-photos"
- tapOn:
    id: "createTask-add-photos"
- tapOn: "Choose from Library"
```

**Update Progress:**
```yaml
- scrollUntilVisible:
    element:
      id: "report-reply-composer__photo"
- tapOn:
    id: "report-reply-composer__photo"
- tapOn: "Choose from Library"
```

### Selection Screen Entry Point (P04/P05)

```yaml
- tapOn:
    id: "photo-selection__action_library"  # or similar
```

Different code path → different selection preservation behavior.

---

## Changes

### Files modified — `c6e212a`

13 flows updated with Path B pattern (remove prior-selected assert, assert fresh, re-pick if needed):

1. `maestro/flows/create-task-photo/P07-form-plus-preserves.yaml`
2. `maestro/flows/create-task-photo/P08-form-plus-add-second.yaml`
3. `maestro/flows/create-task-photo/P09-form-plus-accept-preselected.yaml`
4. `maestro/flows/create-task-photo/P16-form-plus-edit-second.yaml`
5. `maestro/flows/create-task-photo/P17-prior-unavailable-duplicate.yaml`
6. `maestro/flows/create-task-photo/P19-form-remove-then-plus.yaml`
7. `maestro/flows/create-task-photo/P22-force-same-asset-dedupe.yaml`
8. `maestro/flows/update-progress-photo/U05-form-plus-preserves.yaml`
9. `maestro/flows/update-progress-photo/U06-form-plus-add-second.yaml`
10. `maestro/flows/update-progress-photo/U07-form-plus-accept-preselected.yaml`
11. `maestro/flows/update-progress-photo/U10-prior-unavailable.yaml`
12. `maestro/flows/update-progress-photo/U11-remove-then-plus.yaml`
13. `maestro/flows/update-progress-photo/U12-force-dedupe.yaml`

**Product files:** 0 (dial chrome untouched)  
**Test strategy:** YAML-only; match Maestro assertions to actual product behavior

---

## Validation

### Pre-commit
- Evidence review: d520070 blockers showed selection state absent (not just badge lag)
- Product decision: Tristan Path B GO (form reopen fresh is correct)
- Cross-reference: P04/P05 work because they use selection-to-selection path

### Expected outcomes
- **P07–P22 / U05–U12:** Form reopen asserts fresh state, re-picks when needed
- **P04/P05:** Still work (selection-to-selection path preserved)
- **P03:** Still works (already fresh-aware)

### Regression protection
- P01–P06 / U01–U04: no changes
- U05 composer ID: banked
- Dial/product: untouched

---

## Next Steps

1. **Dig:** Re-run CT P07–P22 + UP U05–U12 on tip `c6e212a` (crop worktree / Metro :8082)
2. **If green:** Boot 2nd sim for dual-user H01/D01
3. **Draft only:** No merge until full suite PASS + review

---

## Artifacts

- **Commit:** `c6e212a` — `fix(maestro): Path B - form reopen fresh state (not preserved)`
- **PR:** #30 `cursor/whatsapp-dial-phase-b-58e1` (updated body with Round 6 table)
- **Evidence:** `.cache/insite-perf20/maestro-full-day-20261002-d520070/`
  - `RESULT.md` — Badge proof unlock failed (selection absent, not just badge)
  - `P07-BLOCKER.md` / `U05-BLOCKER.md` — checkboxes `checked=false`
- **Maestro debug:** `.cache/maestro-home/.maestro/tests/2026-10-02_094625/` (P07), `2026-10-02_094916/` (U05)

---

## Lessons

### Title Text vs Badge vs Actual Selection State

**Rounds 4–5 chased symptoms:**
- Round 4: "Title text races selectedCount sync" → add 5s wait → FAIL
- Round 5: "Badge should work as visual proof" → assert badge text → FAIL

**Neither was the root cause.** The actual behavior is: selection state **does not exist** after form reopen.

### Test What Product Does, Not What You Wish It Did

Badge proof (`d520070`) was technically correct IF selection were preserved. But product clears selection, so badge never renders. The test assumption was wrong, not the badge scraping approach.

### Selection-to-Selection vs Form-to-Library

Two different code paths with different state management:
- **Selection screen reopen:** Preserves selection (P04/P05 work)
- **Form reopen:** Clears selection (P07/U05+ needed Path B)

Don't assume symmetric behavior across entry points.

---

## Changelog (All Rounds)

| Round | SHA | Unlock | Status |
|---|---|---|---|
| 0 | `ba7cbc3` | Phase B helpers cherry-pick | ✅ |
| 1 | `dbb3b2a` | P03 form preview · U03 legacy reopen | ✅ |
| 2 | `ebc1110` | P04 dual-surface · `_assert-prior-*` dual | ✅ |
| 3 | `7986e9b` | P06 cancel dual · U04 selection tile | ✅ |
| 4 | `531611a` | U05 composer photo button testID | ✅ partial |
| 5 | `d520070` | P07/U05 badge proof (replace title) | ❌ wrong approach |
| **6** | **`c6e212a`** | **Path B: form reopen fresh state** | **Ready for re-run** |
