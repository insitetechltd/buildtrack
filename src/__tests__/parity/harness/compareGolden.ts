import * as fs from 'fs';
import * as path from 'path';
import type { MatrixCellResult, MatrixCellStatus } from '../parityReport';

const GOLDEN_DIR = path.join(process.cwd(), 'src/__tests__/parity/matrix/golden-old');

const ALLOWED_DELTA_IDS = new Set(['S-06', 'L-matrix-anon', 'DELTA-SEC', 'DELTA-ADMIN', 'DELTA-FETCH']);

export function loadGoldenCsv(fileName = 'LATEST_REPORT.csv'): MatrixCellResult[] {
  const filePath = path.join(GOLDEN_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n').slice(1);
  return lines
    .map((line) => {
      const [id, status, target, at, ...messageParts] = line.split(',');
      if (!id) {
        return null;
      }
      return {
        id,
        status: status as MatrixCellStatus,
        target: (target as 'old' | 'new') || 'old',
        at: at || '',
        message: messageParts.join(',').replace(/^"|"$/g, ''),
      };
    })
    .filter(Boolean) as MatrixCellResult[];
}

/**
 * Compare NEW run cells against OLD golden.
 * Unexplained FAIL diffs throw; documented DELTA ids are allowed.
 */
export function assertNewMatchesGolden(
  newCells: MatrixCellResult[],
  goldenCells: MatrixCellResult[] = loadGoldenCsv(),
): { failures: string[] } {
  const goldenById = new Map(goldenCells.map((c) => [c.id, c]));
  const failures: string[] = [];

  for (const cell of newCells) {
    if (cell.status === 'SKIP' || cell.status === 'PENDING') {
      continue;
    }

    if (cell.status === 'DELTA' || ALLOWED_DELTA_IDS.has(cell.id)) {
      continue;
    }

    const golden = goldenById.get(cell.id);
    if (!golden) {
      continue;
    }

    if (golden.status === 'PENDING' || golden.status === 'SKIP') {
      continue;
    }

    if (cell.status === 'FAIL') {
      failures.push(`${cell.id}: NEW FAIL (${cell.message || ''})`);
      continue;
    }

    if (golden.status === 'PASS' && cell.status !== 'PASS' && cell.status !== 'DELTA') {
      failures.push(
        `${cell.id}: expected PASS-like (golden=${golden.status}) got ${cell.status}`,
      );
    }
  }

  return { failures };
}
