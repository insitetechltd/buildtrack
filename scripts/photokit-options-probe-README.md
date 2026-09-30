# PhotoKit Options Probe - Implementation Summary

## Status: Ready for Manual Execution

All diagnostic infrastructure is in place. The probe is ready to run on Debug sim B7B2640C-4738-4F8A-AEEE-5DF3D21D2533.

## Implemented Components

### 1. Native Probe Function ✅
**File**: `modules/photokit-thumbs/ios/PhotokitThumbsModule.swift`

- `PhotokitThumbEngine.probeRequestOptions(assetId:maxPixel:)` 
- Tests 5 PHImageRequestOptions combinations:
  1. `baseline_fast`: current settings (fastFormat + fast)
  2. `opportunistic_fast`: opportunistic delivery
  3. `highQuality_fast`: high quality delivery
  4. `opportunistic_exact`: opportunistic + exact resize
  5. `highQuality_network`: high quality + network access
- Returns JSON with PASS/FAIL, error codes, timing, URIs

### 2. TypeScript Bindings ✅
**File**: `src/modules/mediaLibrary/PhotokitThumbView.ts`

```typescript
export async function probePhotokitRequestOptions(
  assetId: string,
  maxPixel: number,
): Promise<PhotokitProbeResult>
```

- Full type safety with `PhotokitProbeVariant` and `PhotokitProbeResult`
- Error handling and validation

### 3. Jest Test Suite ✅
**File**: `src/modules/mediaLibrary/__tests__/photokitRequestOptions.test.ts`

- Skipped probe test (requires manual execution with `PHOTOKIT_TEST_ASSET_ID`)
- Contract validation tests (PASS)
- Request options enum contracts
- Error structure validation

### 4. Headed Diagnostic UI ✅
**Files**:
- `src/diagnostics/PhotokitProbeButton.tsx`: Floating 🔬 button
- `src/diagnostics/PhotokitOptionsProbe.tsx`: Full-screen diagnostic UI
- `App.tsx`: Probe button injected in DEV mode

### 5. Manual Execution Tools ✅
**Scripts**:
- `scripts/photokit-probe.sh`: Launch helper
- `scripts/execute-photokit-probe-manual.sh`: Step-by-step guide
- `scripts/run-photokit-probe.js`: Console injection code

### 6. Documentation ✅
**Files**:
- `TEST_PROCEDURE.md`: 3 execution methods
- `RESULT_TEMPLATE.md`: Analysis matrix template
- This `README.md`

## Quick Start

### Prerequisites
```bash
# 1. Simulator booted
xcrun simctl boot B7B2640C-4738-4F8A-AEEE-5DF3D21D2533

# 2. Metro running
npm start

# 3. App installed (already done)
```

### Execute Probe (Method 1: Floating Button)

1. **Launch app**:
   ```bash
   xcrun simctl launch B7B2640C-4738-4F8A-AEEE-5DF3D21D2533 com.buildtrack.app.local
   ```

2. **Tap the 🔬 button** in bottom-right corner

3. **Check results**:
   - Metro console for `[PhotokitProbe]` logs
   - Evidence directory for JSON file
   ```bash
   ls -lt .cache/insite-perf20/sim-photokit-dig/callpath-ab/options-probe/
   ```

### Execute Probe (Method 2: Safari Console)

1. **Open Safari** → Develop → [Your Mac] → Simulator

2. **Paste in Console**:
   ```javascript
   import("./src/modules/mediaLibrary/PhotokitThumbView").then(async (module) => {
     const { probePhotokitRequestOptions, previewPhotokitNewestIds } = module;
     const ids = await previewPhotokitNewestIds(1);
     if (ids.length === 0) { console.log('[Probe] No photos'); return; }
     console.log(`[Probe] Testing: ${ids[0]}`);
     const result = await probePhotokitRequestOptions(ids[0], 256);
     console.log('[Probe] RESULTS:', JSON.stringify(result, null, 2));
     const pass = result.variants.filter(v => v.status === 'PASS');
     console.log(`[Probe] ${pass.length} PASS / ${result.variants.length} total`);
   });
   ```

## Expected Output

```json
{
  "variants": [
    {
      "variant": "baseline_fast",
      "status": "FAIL",
      "callbackCount": 1,
      "elapsedMs": 50,
      "error": {
        "domain": "PHPhotosErrorDomain",
        "code": 3303,
        "description": "Asset is not available"
      }
    },
    {
      "variant": "opportunistic_fast",
      "status": "PASS",
      "callbackCount": 2,
      "elapsedMs": 150,
      "imageSize": { "width": 256, "height": 256, "scale": 2 },
      "uri": "file:///path/to/probe-opportunistic_fast-uuid.jpg"
    },
    ...
  ]
}
```

## Analysis Workflow

1. **Run probe** (methods above)
2. **Copy JSON** from Metro console or evidence directory
3. **Fill RESULT_TEMPLATE.md** with findings
4. **Identify fix**: Which variant(s) cleared error 3303?
5. **Apply fix**: Update `exportPhotokitPreviewJpeg` with proven options
6. **Re-test L3**: Verify fix resolves empty URI issue

## Cleanup After Probe

```bash
# Revert temporary App.tsx changes
git checkout App.tsx

# Or keep button for future use
# The button is __DEV__ only and won't ship to production
```

## Git Branch

All changes on: `cursor/photokit-options-probe-2b1e`
PR: https://github.com/insitetechltd/buildtrack/pull/24

**Do not merge** - this is diagnostic infrastructure for investigation.

## Next Steps After Results

1. Document which option combination resolves 3303
2. Update `exportPhotokitPreviewJpeg` with proven fix
3. Re-run L3 export test on Debug sim
4. Promote diagnostic to permanent Jest test (if valuable)
5. Step 2 mission: Release sim test (separate GO required)

## Constraints

- Debug sim only for this step ✅
- No Release rebuild yet ❌ (awaiting step 2 GO)
- No merge to main ✅
- Product-clean except intentional draft PR commits ✅
- Revert temporary harness after probe ⏳

## Evidence Location

All results go to:
```
.cache/insite-perf20/sim-photokit-dig/callpath-ab/options-probe/
├── L3_probe-result_<timestamp>.json
├── RESULT.md (create after test)
└── [test artifacts]
```

## Commits

1. `922ead7`: Native probe function + Jest contracts
2. `f4ca292`: Headed diagnostic harness (button + UI)
3. `d7dfbd6`: Manual execution procedures + template

All additive on top of prior Jest regressions (no force-push).
