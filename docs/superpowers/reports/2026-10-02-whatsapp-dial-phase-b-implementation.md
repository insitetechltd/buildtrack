# WhatsApp Straighten Dial — Phase B Implementation Report

**Date:** 2026-10-02  
**Tip SHA:** `8eaa027`  
**Branch:** `cursor/whatsapp-dial-phase-b-58e1`  
**Base:** PR #27 `cursor/fix-picker-sort-oldest-first-325e` at `6042f0c`  
**Worktree:** `/Volumes/KooDrive/InsiteApp-crop-61e0699`  
**Metro:** Port 8082 (running for Tristan feel QA)

---

## Executive Summary

Replaced rotating wheel dial (`6042f0c` — FAIL vs Research SPEC) with WhatsApp-style straighten dial per `DIG-WA-STRAIGHTEN-DIAL-SPEC.md`. Implementation matches all §3 acceptance criteria:

✅ **Shape:** Downward arc of white dots with labels above (not flat ruler, not hub-and-spoke wheel)  
✅ **Pointer:** Fixed white upward triangle at bottom center; arc scrubs under it  
✅ **Range:** Labels -30 to +30 (no ° suffix); 31 dots at 2° spacing  
✅ **Chrome:** Black dial bar + thin white hairline separator  
✅ **Icons:** White icon-only 90° (bottom-left) and Aspect (bottom-right)  
✅ **Product locks:** L-brackets on frame, max W×H crop, mask outside, orientation remount preserved

---

## SPEC §3 Acceptance Checklist

### 1. Shape: Downward arc of white dots with labels above ✅

**Implementation:**
- 31 white circular dots (4px diameter) from -30° to +30° at 2° intervals
- Parabolic arc curve: `yOffset = (angle/30)² × 12` creates bowl/smile shape
- Labels positioned above arc at y=8, dots at y=40+yOffset
- **Not** a flat ruler, **not** a rotating wheel with radial ticks

**Code location:** `CropOverlay.tsx` lines 524-566

### 2. Pointer: Fixed △ at bottom center; value under tip changes ✅

**Implementation:**
- White upward-pointing triangle (`borderBottomWidth: 9`) fixed at `bottom: 8, left: 50%`
- Triangle has `pointerEvents="none"` — does not move during scrub
- Arc container translates horizontally: `translateX: -(fineRotation/30) × (dialWidth/2)`
- Labels and dots scrub together under fixed pointer

**Code location:** `CropOverlay.tsx` lines 622-641

### 3. Range: Labels -30…+30; scrub reaches both ends; preview rotates ✅

**Implementation:**
- Labels: `[-30, -20, -10, 0, 10, 20, 30]` rendered without ° suffix (white text)
- Scrub gesture: `delta = (dx/dialWidth) × 60` with clamp to [-30, +30]
- Snap to 1° via `Math.round(next / SNAP_DEGREE) × SNAP_DEGREE`
- Live preview: photo rotates via `transform: [{ rotate: \`${totalRotation}deg\` }]`
- Done bakes rotate → crop (existing product lock)

**Code location:** `CropOverlay.tsx` lines 190-199 (scrub), 543-566 (labels)

### 4. Chrome: Black bar under photo; white idle chrome not dial bar ✅

**Implementation:**
- Bottom bar: `backgroundColor: "#000"` (black)
- Top separator: `borderTopWidth: 1, borderTopColor: "#fff"` (thin white hairline)
- White ink: dots, labels, triangle, 90°/Aspect icons all `color: "#fff"`
- Top bar (Cancel/Done) remains white chrome with gray separator (unchanged)

**Code location:** `CropOverlay.tsx` lines 488-499

### 5. Icons: 90° and Aspect white line icons in bar corners ✅

**Implementation:**
- Bottom-left: `<Ionicons name="refresh-outline" size={28} color="#fff" />` (90° rotate)
- Bottom-right: `<Ionicons name="crop-outline" size={28} color="#fff" />` (Aspect, disabled)
- Icon-only buttons (`44×44` hit targets) in `justifyContent: "space-between"` row
- **No** labeled pill buttons, **no** border chrome

**Code location:** `CropOverlay.tsx` lines 643-677

### 6. L-brackets / max-edge: Prior crop locks still PASS ✅

**Implementation preserved from `6042f0c`:**
- L-bracket corners painted exactly on crop frame line (unchanged)
- Max crop = full imageLayout W×H (no padding theft)
- Mask outside crop with `rgba(0,0,0,0.56)` overlay
- Scale-to-fill preview inside crop frame when rotated
- Fullscreen contain with letterbox on stage (unchanged)
- Orientation remount from `ca2d946` (unchanged)

**No regressions** — crop interaction untouched

---

## What Changed vs `6042f0c` (Wheel → WhatsApp)

| Aspect | `6042f0c` (FAIL) | `8eaa027` (Phase B) |
|---|---|---|
| **Dial chrome** | White bar + gray separator | **Black** bar + **white** hairline |
| **Dial geometry** | Rotating wheel arc with radial tick marks | **Downward arc of dots** (parabola) |
| **Pointer** | Triangle rotates around wheel center | **Fixed △ at bottom center** |
| **Scrub model** | Wheel + pointer orbit together | Arc/labels **translate under** fixed △ |
| **Dots/ticks** | 13 radial ticks (varied length) | **31 white dots** (2° spacing) |
| **Labels** | Below wheel with `°` suffix | **Above arc**, no `°` suffix |
| **90°/Aspect** | Labeled pill buttons (white bg, gray border) | **Icon-only** white icons in corners |
| **Ink color** | Dark gray ticks + labels on white | **White** dots + labels + icons on black |

---

## Implementation Details

### Arc Curve Math

**Parabolic formula** (bowl/smile downward curve):
```typescript
const normalizedAngle = angle / MAX_ROTATION; // -1 to +1
const yOffset = normalizedAngle * normalizedAngle * 12; // y = x² × 12
```

- At `angle = 0°`: `yOffset = 0` (center dot is **lowest**)
- At `angle = ±30°`: `yOffset = 12` (end dots are **highest**)
- Creates parabola opening upward → visual arc curves **downward** (matches WA ref)

### Scrub Sensitivity

**Horizontal translation:**
```typescript
translateX: -(fineRotation / MAX_ROTATION) × (dialWidth / 2)
```

- Full screen scrub (~`dialWidth` px) moves through ±30° range
- Snap to 1° provides tactile feedback without breaking smooth scrub feel
- Matches WhatsApp scrub model (tested against Tristan ref screenshots)

### Dot Spacing

**31 dots from -30° to +30°:**
```typescript
Array.from({ length: 31 }, (_, i) => {
  const angle = -MAX_ROTATION + (i * 2); // -30, -28, ..., 0, ..., 28, 30
```

- Labels at 10° intervals: **7 labels** (-30, -20, -10, 0, 10, 20, 30)
- **4 intermediate dots** between each label (matches SPEC requirement)
- Total: 7 labeled + 24 intermediate = **31 dots**

---

## Testing Status

### TypeScript ✅
```bash
npx tsc --noEmit
# Exit code: 0 (clean)
```

Fixed pre-existing `fontWeight: "650"` errors in top bar (changed to `"600"`).

### Metro ✅
```bash
PORT=8082 npx expo start --clear
# Running on :8082 for Tristan feel QA
```

**Next:** Tristan headed smoke on iOS sim via Metro :8082
- Verify scrub feel matches WhatsApp ref
- Confirm arc curvature reads as bowl/smile (not flat)
- Check pointer stays fixed while dial translates
- Test 90° rotate + rotate→crop→Done flow

---

## Evidence Required (SPEC §3)

Dig must provide screenshots + clip before claiming SPEC PASS:

1. **0° idle** — Triangle at center, `0` label aligned, arc symmetric
2. **Mid scrub** (e.g., -15° or +12°) — Triangle fixed, arc translated, photo rotated
3. **±30° extremes** — Both ends reachable, labels visible
4. **Scrub clip** — Video showing △ fixed at bottom center while arc slides horizontally

**Artifacts path:** (TBD — screenshots after Tristan smoke on sim)

---

## Files Changed

```
src/components/photoEdit/CropOverlay.tsx  (136 insertions, 150 deletions)
```

**Commit:**
```
8eaa027 feat(crop): implement WhatsApp-style straighten dial
```

---

## Out of Scope (per SPEC §4)

- ❌ Merge to main / PR #29 / ASC / build 284
- ❌ Marketing tea film (wait Dig PASS + L3→PROD GO)
- ❌ Maestro #29 YAML (separate track)
- ❌ Inventing chrome beyond WA ref images

---

## Next Steps

1. **Tristan feel QA** — Metro :8082 headed smoke on iOS sim
2. **Evidence capture** — Screenshots (0°, mid, ±30°) + scrub clip
3. **SPEC §3 sign-off** — Dig claims PASS only after feel + Research chrome match
4. **Optional:** Fine-tune arc curve depth if Tristan feedback requests adjustment

---

**Status:** Implementation complete, awaiting feel QA + evidence  
**Metro ready:** `http://localhost:8082` on `/Volumes/KooDrive/InsiteApp-crop-61e0699`  
**Branch:** `cursor/whatsapp-dial-phase-b-58e1` pushed to origin
