# Recents Paint Gate

## Purpose

Regression prevention for PHPhotosErrorDomain Code=3303 "forever-gray" tiles in Recents library picker.

## What It Tests

1. Opens Camera tab
2. Taps library peek to open Recents
3. Waits 15 seconds for thumbnails to load
4. Captures screenshot
5. Asserts grid still visible

## Pass/Fail Criteria

**PASS:** Colored photo thumbnails visible in Recents grid after 15s wait

**FAIL:** Uniform gray placeholder tiles remain after 15s wait

## Why This Matters

Prior to deliveryMode `.opportunistic` fix (merged main 212f105), PhotoKit `requestImage` with `.fastFormat` delivery mode returned PHPhotosErrorDomain Code=3303 errors on Debug simulator, causing forever-gray tiles that never painted.

This gate prevents future regressions from:
- PhotoKit `PHImageRequestOptions` configuration changes
- iOS SDK updates breaking `.opportunistic` delivery
- Accidental revert to `.fastFormat` or other incompatible modes

## Design Philosophy

Gate asserts **paint outcome** (colored thumbnails visible), not specific fetch/pagination APIs. Works regardless of:
- First-batch vs subsequent-batch fetch unification
- List opening strategies (limited vs full Recents)
- Pagination implementation details

Core contract: Recents grid must show colored photo thumbnails within 15s.

## How to Run

### Local (headed)
```bash
cd /Volumes/KooDrive/InsiteApp
bash scripts/maestro/run-local.sh test \
  --udid B7B2640C-4738-4F8A-AEEE-5DF3D21D2533 \
  maestro/flows/smoke/recents-paint-gate.yaml
```

### In smoke suite
```bash
# Include in smoke suite runs
bash scripts/maestro/run-local.sh test \
  --udid <UDID> \
  maestro/flows/smoke/*.yaml
```

## Verification

**Screenshot:** `<debug-output>/recents_paint_gate_after_15s.png`

Visual inspection required:
- Colored thumbnails with visible photo content = PASS
- Uniform gray placeholders = FAIL (PHPhotosErrorDomain 3303 or similar)

## Dependencies

- **Requires:** deliveryMode `.opportunistic` fix (merged main 212f105)
- **Simulator:** iOS simulator with ≥1 photo in library
- **Credentials:** john.managera@test.com / password123 (if not already logged in)

## History

- **2026-09-30:** Initial gate added after `.opportunistic` fix (main 212f105)
- **Context:** Forever-gray missed because no suite flow tested Recents paint
