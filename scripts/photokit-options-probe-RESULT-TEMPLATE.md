# PhotoKit Options Probe Results

## Execution Status

**⏸ AWAITING MANUAL EXECUTION**

The probe harness is ready but requires manual trigger due to system automation restrictions:
- AppleScript UI automation: Cannot reliably target FAB button coordinates
- Safari JavaScript automation: Requires "Allow JavaScript from Apple Events" in Safari settings
- No programmatic UI testing framework active for this diagnostic

## How to Execute

### Method 1: Tap FAB Button
1. Ensure simulator is showing login/dashboard with 🔬 button visible
2. Tap the 🔬 button in bottom-right
3. Wait for completion alert
4. Results written to app cache + Metro console

### Method 2: Safari Developer Console
1. Open Safari → Develop → Your Mac → Simulator (Taskr)
2. Click Console tab
3. Paste: `cat scripts/execute-photokit-probe-console.js` (or from clipboard)
4. Press Enter
5. Watch for [Probe] logs with JSON

## Expected Output Format

```json
{
  "variants": [
    {
      "variant": "baseline_fast",
      "status": "FAIL",
      "elapsedMs": 142,
      "callbackCount": 1,
      "imageNull": true,
      "error": {
        "domain": "PHPhotosErrorDomain",
        "code": 3303,
        "description": "...",
        "localizedDescription": "..."
      }
    },
    {
      "variant": "opportunistic_fast",
      "status": "PASS",
      "elapsedMs": 234,
      "callbackCount": 1,
      "imageNull": false,
      "uri": "file:///...",
      "imageSize": {
        "width": 256,
        "height": 192,
        "scale": 1
      }
    },
    ...
  ]
}
```

## Test Matrix

| Variant | deliveryMode | resizeMode | networkAllowed | Expected | Actual | Notes |
|---------|-------------|------------|----------------|----------|--------|-------|
| baseline_fast | fastFormat | fast | false | FAIL (3303) | _pending_ | Known issue |
| opportunistic_fast | opportunistic | fast | false | PASS? | _pending_ | May avoid restriction |
| highQuality_fast | highQualityFormat | fast | false | PASS | _pending_ | Full quality |
| opportunistic_exact | opportunistic | exact | false | ? | _pending_ | Exact resize test |
| highQuality_network | highQualityFormat | fast | true | PASS | _pending_ | Network enabled |

## Analysis

Once executed, this section will contain:
- Which variants cleared the 3303 error
- Recommended minimal option change
- Timing comparison
- Draft PR recommendation for permanent fix (if applicable)

---

**Status**: Template created {{timestamp}}
**Next**: Execute probe manually, replace this template with actual results
