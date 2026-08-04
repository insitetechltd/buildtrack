import {
  assertNewMatchesGolden,
  loadGoldenCsv,
} from '../compareGolden';

describe('compareGolden', () => {
  it('loads scaffold golden csv', () => {
    const rows = loadGoldenCsv();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.id === 'S-01')).toBe(true);
  });

  it('allows DELTA-SEC cells and flags unexplained FAIL', () => {
    const golden = [
      {
        id: 'T-01',
        status: 'PASS' as const,
        target: 'old' as const,
        at: '',
        message: '',
      },
      {
        id: 'S-06',
        status: 'PASS' as const,
        target: 'old' as const,
        at: '',
        message: '',
      },
    ];

    const { failures } = assertNewMatchesGolden(
      [
        { id: 'T-01', status: 'FAIL', target: 'new', at: '', message: 'broke' },
        {
          id: 'S-06',
          status: 'DELTA',
          target: 'new',
          at: '',
          message: 'DELTA-SEC',
        },
      ],
      golden,
    );

    expect(failures.some((f) => f.startsWith('T-01'))).toBe(true);
    expect(failures.some((f) => f.startsWith('S-06'))).toBe(false);
  });
});
