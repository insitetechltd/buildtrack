import { describeParity } from './_parityTestSetup';
import {
  assertNewMatchesGolden,
  loadGoldenCsv,
} from '../harness/compareGolden';
import { getParityResults } from '../harness/parityReport';
import { writeGoldenArtifacts } from '../harness/goldenArtifacts';

/**
 * Named `zzz-*` so Jest --runInBand executes this after other parity scenarios,
 * after cells have accumulated, and so golden write sees the full matrix.
 */
describeParity('Parity NEW gate vs golden-old', () => {
  afterAll(() => {
    writeGoldenArtifacts();
  });

  it('fails on unexplained NEW regressions vs golden', () => {
    if ((process.env.PARITY_TARGET || 'old').toLowerCase() !== 'new') {
      expect(true).toBe(true);
      return;
    }

    const golden = loadGoldenCsv();
    const current = getParityResults();
    const { failures } = assertNewMatchesGolden(current, golden);

    if (failures.length) {
      throw new Error(`NEW parity gate failures:\n${failures.join('\n')}`);
    }

    expect(failures).toEqual([]);
  });

  it('golden CSV is loadable', () => {
    const golden = loadGoldenCsv();
    expect(Array.isArray(golden)).toBe(true);
    expect(golden.length).toBeGreaterThan(0);
  });
});
