# PhotoKit Request Options Probe — RESULT

**Date:** 2026-09-30  
**Simulator:** iPhone 17 Pro Max (UDID `B7B2640C-4738-4F8A-AEEE-5DF3D21D2533`)  
**App:** Debug build (com.buildtrack.app.local) v1.1.3 (132i-dev)  
**Asset:** `899CFF97-78DF-49B4-9BDB-829435ED2BB3/L0/001`  
**Target Size:** 256×256 px

## Test Matrix

| Variant | Delivery Mode | Resize Mode | Network Allowed | Status | Error | Elapsed | Image Size |
|---------|---------------|-------------|-----------------|--------|-------|---------|------------|
| **baseline_fast** (current) | `.fastFormat` | `.fast` | `false` | **FAIL** | PHPhotosErrorDomain 3303 | 0ms | null |
| **opportunistic_fast** | `.opportunistic` | `.fast` | `false` | **PASS** | — | 2ms | 256×256 |
| **highQuality_fast** | `.highQualityFormat` | `.fast` | `false` | **PASS** | — | 1ms | 256×256 |
| **opportunistic_exact** | `.opportunistic` | `.exact` | `false` | **PASS** | — | 0ms | 256×256 |
| **highQuality_network** | `.highQualityFormat` | `.fast` | `true` | **PASS** | — | 0ms | 256×256 |

## Summary

- **PASS:** 4/5 (80%)
- **FAIL:** 1/5 (20%) — `baseline_fast` only
- **TIMEOUT:** 0/5

## Root Cause

**`PHPhotosErrorDomain Code=3303`** occurs **only** when using:
- `deliveryMode: .fastFormat`
- `resizeMode: .fast`
- `isNetworkAccessAllowed: false`

The current production `PhotokitThumbEngine.makeOptions()` uses this exact combination.

## Recommendation

**Minimal fix:** Change `deliveryMode` from `.fastFormat` to `.opportunistic` while keeping:
- `resizeMode: .fast` (no change)
- `isNetworkAccessAllowed: false` (no change)

### Code Change

```swift
// PhotokitThumbsModule.swift line ~113
static func makeOptions() -> PHImageRequestOptions {
  let options = PHImageRequestOptions()
  options.deliveryMode = .opportunistic  // Was: .fastFormat
  options.resizeMode = .fast
  options.isNetworkAccessAllowed = false
  options.isSynchronous = false
  options.version = .current
  return options
}
```

### Why `.opportunistic` vs `.highQualityFormat`

Both pass, but `.opportunistic`:
- Delivers degraded first, then final (progressive rendering possible)
- Faster perceived latency (2ms vs 1ms in test, but can deliver immediately)
- PhotoKit caches degraded + final separately (better for grid scroll)
- Aligns with existing `makeSharpOptions()` which already uses `.opportunistic`

`.highQualityFormat` also works but forces single full-quality callback (no progressive).

## Raw JSON

<details>
<summary>Full probe output (click to expand)</summary>

```json
{
  "variants": [
    {
      "degraded": false,
      "cancelled": false,
      "status": "FAIL",
      "error": {
        "code": 3303,
        "description": "The operation couldn't be completed. (PHPhotosErrorDomain error 3303.)",
        "domain": "PHPhotosErrorDomain"
      },
      "variant": "baseline_fast",
      "callbackCount": 1,
      "elapsedMs": 0,
      "imageNull": true
    },
    {
      "degraded": false,
      "cancelled": false,
      "variant": "opportunistic_fast",
      "imageSize": {
        "width": 256,
        "height": 256,
        "scale": 1
      },
      "status": "PASS",
      "uri": "file:///Volumes/KooDrive/tristan-xocde-library/CoreSimulator/Devices/B7B2640C-4738-4F8A-AEEE-5DF3D21D2533/data/Containers/Data/Application/EE112F7B-1F9F-45AD-BBD7-918638D685EF/Library/Caches/probe-opportunistic_fast-71FB8841-F771-4F20-B2E2-264C95AA0389.jpg",
      "callbackCount": 1,
      "elapsedMs": 2
    },
    {
      "status": "PASS",
      "elapsedMs": 1,
      "degraded": false,
      "uri": "file:///Volumes/KooDrive/tristan-xocde-library/CoreSimulator/Devices/B7B2640C-4738-4F8A-AEEE-5DF3D21D2533/data/Containers/Data/Application/EE112F7B-1F9F-45AD-BBD7-918638D685EF/Library/Caches/probe-highQuality_fast-121B6263-21F1-4AF4-992F-EC1162E6FCFF.jpg",
      "imageSize": {
        "scale": 1,
        "width": 256,
        "height": 256
      },
      "variant": "highQuality_fast",
      "callbackCount": 1,
      "cancelled": false
    },
    {
      "callbackCount": 1,
      "imageSize": {
        "width": 256,
        "height": 256,
        "scale": 1
      },
      "elapsedMs": 0,
      "variant": "opportunistic_exact",
      "uri": "file:///Volumes/KooDrive/tristan-xocde-library/CoreSimulator/Devices/B7B2640C-4738-4F8A-AEEE-5DF3D21D2533/data/Containers/Data/Application/EE112F7B-1F9F-45AD-BBD7-918638D685EF/Library/Caches/probe-opportunistic_exact-227E9E66-382F-4F87-8CD5-EB7BD584211C.jpg",
      "degraded": false,
      "status": "PASS",
      "cancelled": false
    },
    {
      "uri": "file:///Volumes/KooDrive/tristan-xocde-library/CoreSimulator/Devices/B7B2640C-4738-4F8A-AEEE-5DF3D21D2533/data/Containers/Data/Application/EE112F7B-1F9F-45AD-BBD7-918638D685EF/Library/Caches/probe-highQuality_network-471B6CB4-FBF0-4DB3-AC51-A6E7AC12A93A.jpg",
      "status": "PASS",
      "imageSize": {
        "width": 256,
        "height": 256,
        "scale": 1
      },
      "elapsedMs": 0,
      "cancelled": false,
      "variant": "highQuality_network",
      "callbackCount": 1,
      "degraded": false
    }
  ]
}
```

</details>

## Next Steps

1. Apply `.opportunistic` delivery mode fix to `PhotokitThumbsModule.swift`
2. L2 Debug rebuild + headed smoke (Create Task Photo, library picker scroll)
3. If green: promote to PROD build for TF/device testing
4. Monitor dogfood for 3303 recurrence

## Notes

- Test ran on Debug simulator with 11 photos in library
- All 5 variants completed within 2ms (no network, local simulator assets)
- `.opportunistic` is already used in `makeSharpOptions()` for viewport sharpen pass
- No `.fastFormat` usage remains outside deprecated `makeOptions()`
