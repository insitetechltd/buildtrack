// PhotoKit Options Probe - Safari Console Execution
// Open Safari → Develop → Your Mac → Simulator (Taskr) → Console tab
// Paste this entire script and press Enter

import("./src/modules/mediaLibrary/PhotokitThumbView").then(async (mod) => {
  console.log('[Probe] Starting PhotoKit PHImageRequestOptions probe...');
  const { probePhotokitRequestOptions, previewPhotokitNewestIds } = mod;
  
  if (!probePhotokitRequestOptions) {
    console.error('[Probe] ❌ probePhotokitRequestOptions not available');
    console.log('[Probe] Available:', Object.keys(mod).join(', '));
    return;
  }
  
  const ids = await previewPhotokitNewestIds(1);
  if (ids.length === 0) {
    console.error('[Probe] ❌ No photos in library. Drag image to Photos app.');
    return;
  }
  
  const assetId = ids[0];
  console.log(`[Probe] Testing asset: ${assetId.slice(0, 30)}...`);
  console.log('[Probe] Running 5 option variants...');
  
  const result = await probePhotokitRequestOptions(assetId, 256);
  
  console.log('[Probe] ==================== RAW RESULTS ====================');
  console.log(JSON.stringify(result, null, 2));
  console.log('[Probe] ========================================================');
  
  const pass = result.variants.filter(v => v.status === 'PASS');
  const fail = result.variants.filter(v => v.status === 'FAIL');
  
  console.log(`[Probe] Summary: ${pass.length} PASS, ${fail.length} FAIL`);
  
  result.variants.forEach(v => {
    const icon = v.status === 'PASS' ? '✓' : '✗';
    console.log(`[Probe] ${icon} ${v.variant}: ${v.status} (${v.elapsedMs}ms)`);
    if (v.error) {
      console.log(`[Probe]     Error: ${v.error.domain} Code=${v.error.code}`);
    }
    if (v.uri) {
      console.log(`[Probe]     URI: ${v.uri.slice(0, 60)}...`);
    }
  });
  
  console.log('[Probe] ========================================================');
  console.log('[Probe] ✅ Copy JSON above to create RESULT.md');
  
  return result;
}).catch(err => {
  console.error('[Probe] ❌ Import failed:', err.message);
});
