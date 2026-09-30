#!/usr/bin/env node
/**
 * PhotoKit Options Probe - Automated Runner
 * Executes probe via app and captures console output
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EVIDENCE_DIR = path.join(__dirname, '../.cache/insite-perf20/sim-photokit-dig/callpath-ab/options-probe');
const SIM_UDID = 'B7B2640C-4738-4F8A-AEEE-5DF3D21D2533';
const BUNDLE_ID = 'com.buildtrack.app.local';

console.log('=== PhotoKit Options Probe Runner ===');
console.log(`Sim: ${SIM_UDID}`);
console.log(`Evidence: ${EVIDENCE_DIR}`);
console.log('');

// Ensure evidence dir exists
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

console.log('Instructions:');
console.log('1. Ensure app is running on Debug sim');
console.log('2. Tap the floating 🔬 button in bottom-right corner');
console.log('3. Results will appear in Metro console and be saved to evidence dir');
console.log('');
console.log('Alternatively, run probe via Metro console:');
console.log('  1. In Metro terminal, press "d" to open debugger menu');
console.log('  2. Open Chrome DevTools');
console.log('  3. Paste and execute:');
console.log('');
console.log(`
import { probePhotokitRequestOptions, previewPhotokitNewestIds } from './src/modules/mediaLibrary/PhotokitThumbView';

(async () => {
  const ids = await previewPhotokitNewestIds(1);
  if (ids.length === 0) { console.log('[Probe] No photos'); return; }
  console.log('[Probe] Testing asset:', ids[0]);
  const result = await probePhotokitRequestOptions(ids[0], 256);
  console.log('[Probe] RESULTS:', JSON.stringify(result, null, 2));
  
  // Summary
  const pass = result.variants.filter(v => v.status === 'PASS');
  const fail = result.variants.filter(v => v.status === 'FAIL');
  console.log('[Probe] PASS:', pass.map(v => v.variant));
  console.log('[Probe] FAIL:', fail.map(v => ({
    variant: v.variant,
    error: v.error ? \`\${v.error.domain} \${v.error.code}\` : 'unknown'
  })));
})();
`);

console.log('');
console.log('Waiting for probe results...');
console.log('Check Metro console for [PhotokitProbe] logs');
console.log('');
