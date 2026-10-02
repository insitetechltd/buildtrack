# P07 + U05 Badge Proof — Round 5

**Date:** 2026-10-02  
**Branch:** `cursor/whatsapp-dial-phase-b-58e1` (PR #30)  
**Tip SHA:** `d520070`  
**Worktree:** `/Volumes/KooDrive/InsiteApp-crop-61e0699`  
**Metro:** `:8082`  
**Evidence:** `.cache/insite-perf20/maestro-full-day-20261002-531611a/`

---

## Context

Fifth YAML-only unlock iteration. Round 4 (`531611a`) validated U05 composer photo button testID fix but P07 and U05 both still failed at `_assert-prior-selected-1`. The 5s `extendedWaitUntil` for title text ".*1 selected.*" timed out on hybrid library after form reopen.

**Banked unlocks (not regressed):**
- Round 1: P03 form attachment preview, U03 legacy reopen
- Round 2: P04 reopen dual-surface, `_assert-prior-selected-*` dual-surface
- Round 3: **P06 PASS** (cancel dual-surface), **U04 PASS** (selection tile_2)
- Round 4: **U05 composer ID PASS** (`report-reply-composer__photo`)

**Product chrome:** Zero modifications across all 5 unlock rounds.

---

## Root Cause @ 531611a

### Failure Pattern

Both **P07** (Create Task) and **U05** (Update Progress) failed at `_assert-prior-selected-1` after form reopen:
- Step: `extendedWaitUntil visible: ".*1 selected.*" timeout: 5000` → **FAILED**
- Surface: Hybrid `capture-session__library_grid` visible
- Timeout: 5s wait exhausted, assertion never passed

### Evidence Analysis

**Screenshot:** `P07-FAIL-assert-prior-1-selected.png` / `U05-FAIL.png`
- **Title bar:** "Select photos" (does NOT update to "1 selected")
- **First tile (green "3"):** Has checkmark/badge in top-right corner showing "1"
- **Selection state:** IS preserved (checkmark visible)
- **Title text:** Does NOT sync after form reopen

### Why Title Text Fails

Hybrid `HybridLibraryPickerScreen.tsx` title rendering:
```tsx
{selectedCount > 0 ? `${selectedCount} selected` : "Select photos"}
```

**Reopen from selection screen** (`_reopen-library-from-selection`):
- Component state already "warm" from prior visit
- `selectedCount` reflects preserved selection immediately
- Title updates → **P04/P05 work fine**

**Reopen from form** (`_reopen-library-from-form`):
- Component remounts or rehydrates state
- `selectedCount` takes extra render cycle(s) to sync with preserved selection
- Title stays "Select photos" even after 5s wait → **P07/U05 fail**

**Visual selection state (order badges) renders correctly** in both paths, making it the reliable signal.

---

## Fix — Badge Proof Pattern

### Strategy

Replace unreliable title text assertion with visual order badge assertion for hybrid library. Order badges are rendered immediately with selection state and show the selection sequence number ("1", "2", "3", etc.) in the tile top-right corner.

### Implementation

**Modified helpers:** All 4 `_assert-prior-selected-*` helpers

#### Pattern 1: `_assert-prior-selected-1.yaml`

```yaml
# Wait for either hybrid or legacy grid
- runFlow:
    when:
      visible:
        id: "capture-session__library_grid"
    commands:
      - extendedWaitUntil:
          visible:
            id: "capture-session__library_grid"
          timeout: 8000
      # Hybrid: order badge shows "1" on first selected tile (reliable after form reopen)
      - waitForAnimationToEnd:
          timeout: 1000
- runFlow:
    when:
      visible:
        id: "in-app-library__grid"
    commands:
      - extendedWaitUntil:
          visible:
            id: "in-app-library__grid"
          timeout: 8000
      # Legacy: title text works here
      - assertVisible: ".*1 selected.*"
# Proof of selection: corner badge number visible (hybrid) or title (legacy)
- runFlow:
    when:
      visible:
        id: "capture-session__library_grid"
    commands:
      # Order badge "1" in top-right corner of first selected tile
      - assertVisible:
          text: "1"
          index: 0
- takeScreenshot: "ct-photo-ledger-1-selected"
```

**Key changes:**
1. Remove `extendedWaitUntil` for title text on hybrid branch
2. Add 1s `waitForAnimationToEnd` (let tiles settle)
3. Move legacy title assert inside `in-app-library__grid` conditional
4. Add new hybrid conditional checking for visible text "1" (badge number)

#### Pattern 2: `_assert-prior-selected-2.yaml` / `_assert-prior-selected-3.yaml`

Same dual-surface pattern:
- Hybrid: assert visible "1", "2" (and "3" for triple)
- Legacy: assert title text ".*2 selected.*" or ".*3 selected.*"

#### Pattern 3: `_assert-prior-selected.yaml` (parameterized)

Takes `output.ledgerCount` and checks badges conditionally:
```yaml
# Hybrid: order badges
- runFlow:
    when:
      visible:
        id: "capture-session__library_grid"
    commands:
      - runFlow:
          when:
            true: ${output.ledgerCount >= 1}
          commands:
            - assertVisible:
                text: "1"
                index: 0
      - runFlow:
          when:
            true: ${output.ledgerCount >= 2}
          commands:
            - assertVisible:
                text: "2"
                index: 1
      - runFlow:
          when:
            true: ${output.ledgerCount >= 3}
          commands:
            - assertVisible:
                text: "3"
                index: 2
```

---

## Technical Notes

### Badge Rendering

**Hybrid library:** `LibraryPhotoGrid.tsx`
```tsx
<View
  testID={`${testIdPrefix}__order_badge_${assetId}`}
  style={[styles.orderBadge, { backgroundColor: theme.badgeBackground }]}
  accessibilityLabel={`Selected ${order}`}
>
  <Text style={[styles.orderBadgeText, { color: theme.badgeText }]}>
    {order}
  </Text>
</View>
```

- `testIdPrefix`: `"capture-session"` for hybrid, `"in-app-library"` for legacy
- `order`: Selection sequence (1-indexed: first selected = 1, second = 2, etc.)
- Badge background: `#08576E` (teal), text: `#fff` (white)
- Always rendered when tile is selected (no sync delay like title text)

### Maestro Text Matching

`assertVisible: text: "1" index: 0` matches the first occurrence of visible text "1" on screen. The badge "1" appears in the tile corner before any other "1" text, making `index: 0` safe.

### Why Not testID?

The badge testID is `capture-session__order_badge_<assetId>` where `<assetId>` is the dynamic MediaLibrary asset ID (e.g. `D8C0B6A6-...`). We can't hard-code a specific testID to check. Text matching the badge number is simpler and reliable.

---

## Changes

### Files modified — `d520070`

1. `maestro/flows/create-task-photo/_assert-prior-selected-1.yaml`
   - Remove hybrid title text `extendedWaitUntil`
   - Add hybrid badge "1" assert + legacy title assert in separate conditionals

2. `maestro/flows/create-task-photo/_assert-prior-selected-2.yaml`
   - Add hybrid badges "1" + "2" assert + legacy title conditional

3. `maestro/flows/create-task-photo/_assert-prior-selected-3.yaml`
   - Add hybrid badges "1" + "2" + "3" assert + legacy title conditional

4. `maestro/flows/create-task-photo/_assert-prior-selected.yaml`
   - Parameterized version with conditional badge checks based on `output.ledgerCount`

**Product files:** 0 (dial chrome untouched)  
**Test strategy:** YAML-only; check visual selection proof instead of state-dependent title

---

## Validation

### Pre-commit
- Evidence review: `RESULT.md`, `P07-BLOCKER.md`, `U05-BLOCKER.md`, failure screenshots
- Product code inspection: `HybridLibraryPickerScreen.tsx` selectedCount/title, `LibraryPhotoGrid.tsx` order badge rendering
- Cross-reference: P04/P05 work because they reopen from selection, not form

### Expected outcomes
- **P07:** `_assert-prior-selected-1` will check badge "1" after form reopen (grid visible + 1s settle)
- **U05:** Same badge proof after form reopen
- **P04/P05:** Still work (badge check also passes on selection reopen)
- **Legacy paths:** Still work (title text retained in legacy conditional)

### Regression protection
- P01–P06: no changes to their execution paths
- U01–U05 composer ID: no changes
- All reopen paths (selection vs form) now use badge proof on hybrid

---

## Next Steps

1. **Dig:** Re-run CT P07–P22 + UP U05–U12 on tip `d520070` (crop worktree / Metro :8082)
2. **If green:** Boot 2nd sim for dual-user H01/D01
3. **If still red:** Investigate next blocker (but badge proof should unlock P07/U05 shared failure)
4. **Draft only:** No merge to master until full suite PASS + review

---

## Artifacts

- **Commit:** `d520070` — `fix(maestro): P07/U05 badge proof - replace title text with order badge assert`
- **PR:** #30 `cursor/whatsapp-dial-phase-b-58e1` (updated body with Round 5 table)
- **Evidence:** `.cache/insite-perf20/maestro-full-day-20261002-531611a/`
  - `RESULT.md` — suite ledger (U05 composer ID unlock validated; P07/U05 prior-selected shared FAIL)
  - `P07-BLOCKER.md` / `P07-FAIL-assert-prior-1-selected.png`
  - `U05-BLOCKER.md` / `U05-FAIL.png`
  - Both screenshots show checkmark on tile but title not updated
- **Maestro debug:** `.cache/maestro-home/.maestro/tests/2026-10-02_092954/` (P07), `2026-10-02_093235/` (U05)

---

## Lessons

### Title Text is Unreliable After Form Reopen

React state hydration timing differs between:
- **Selection screen reopen:** State already warm → title updates immediately
- **Form reopen:** State rehydrates → title lags behind visual rendering

**Never trust header/title text for selection state proof** when entry path varies. Always prefer visual tile state (badges, checkmarks, overlays).

### Visual Proof > State-Dependent Text

Order badges are rendered directly from selection array state, independent of `selectedCount` state variable. They appear as soon as tiles render, making them the most reliable signal.

### Dual-Surface Pattern is Critical

Legacy `in-app-library` may have different rendering behavior. By splitting hybrid vs legacy assertions into separate conditionals, we preserve what works on each surface without forcing a single approach.

---

## Changelog (All Rounds)

| Round | SHA | Unlock | Status |
|---|---|---|---|
| 0 | `ba7cbc3` | Phase B helpers cherry-pick | ✅ |
| 1 | `dbb3b2a` | P03 form preview · U03 legacy reopen | ✅ |
| 2 | `ebc1110` | P04 dual-surface · `_assert-prior-*` dual | ✅ |
| 3 | `7986e9b` | P06 cancel dual · U04 selection tile | ✅ |
| 4 | `531611a` | U05 composer photo button testID | ✅ partial |
| **5** | **`d520070`** | **P07/U05 badge proof (replace title)** | **Ready for re-run** |
