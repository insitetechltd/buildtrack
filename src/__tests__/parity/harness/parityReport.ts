import * as fs from 'fs';
import * as path from 'path';

export type MatrixCellStatus = 'PASS' | 'FAIL' | 'SKIP' | 'DELTA' | 'KNOWN_OLD' | 'PENDING';

export type MatrixCellResult = {
  id: string;
  status: MatrixCellStatus;
  message?: string;
  target: 'old' | 'new';
  at: string;
};

const RUN_DIR = path.join(process.cwd(), 'src/__tests__/parity/matrix/golden-old');
const RUN_CELLS_FILE = path.join(RUN_DIR, '.run-cells.json');
const RUN_META_FILE = path.join(RUN_DIR, '.run-meta.json');

function ensureRunDir(): void {
  if (!fs.existsSync(RUN_DIR)) {
    fs.mkdirSync(RUN_DIR, { recursive: true });
  }
}

function readCellsFile(): MatrixCellResult[] {
  ensureRunDir();
  if (!fs.existsSync(RUN_CELLS_FILE)) {
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(RUN_CELLS_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCellsFile(cells: MatrixCellResult[]): void {
  ensureRunDir();
  fs.writeFileSync(RUN_CELLS_FILE, JSON.stringify(cells, null, 2), 'utf8');
}

export function resetParityReport(): void {
  ensureRunDir();
  writeCellsFile([]);
  if (fs.existsSync(RUN_META_FILE)) {
    fs.unlinkSync(RUN_META_FILE);
  }
}

/** Clear once per Jest process so scenario files accumulate into one matrix report. */
export function beginParityRunOnce(): void {
  ensureRunDir();
  if (fs.existsSync(RUN_META_FILE)) {
    return;
  }
  fs.writeFileSync(
    RUN_META_FILE,
    JSON.stringify({ startedAt: new Date().toISOString() }),
    'utf8',
  );
  writeCellsFile([]);
}

export function recordParityCell(
  id: string,
  status: MatrixCellStatus,
  options?: { message?: string; target?: 'old' | 'new' },
): void {
  const cells = readCellsFile();
  cells.push({
    id,
    status,
    message: options?.message,
    target:
      options?.target ??
      ((process.env.PARITY_TARGET || 'old').toLowerCase() === 'new' ? 'new' : 'old'),
    at: new Date().toISOString(),
  });
  writeCellsFile(cells);
}

export function getParityResults(): MatrixCellResult[] {
  return readCellsFile();
}

export function formatParityReportMarkdown(
  cells: MatrixCellResult[] = getParityResults(),
): string {
  const lines = [
    '# Parity run report',
    '',
    `| Target | ${(process.env.PARITY_TARGET || 'old').toLowerCase()} |`,
    `| Generated | ${new Date().toISOString()} |`,
    '',
    '| ID | Status | Message |',
    '|----|--------|---------|',
  ];

  for (const cell of cells) {
    const msg = (cell.message || '').replace(/\|/g, '\\|');
    lines.push(`| ${cell.id} | ${cell.status} | ${msg} |`);
  }

  return `${lines.join('\n')}\n`;
}

export function formatParityReportCsv(
  cells: MatrixCellResult[] = getParityResults(),
): string {
  const header = 'id,status,target,at,message';
  const rows = cells.map((cell) => {
    const message = JSON.stringify(cell.message || '');
    return `${cell.id},${cell.status},${cell.target},${cell.at},${message}`;
  });
  return [header, ...rows].join('\n');
}

/** Stable stringify for golden snapshots (sorted keys, drop volatile fields). */
export function canonicalizeForGolden(
  value: unknown,
  volatileKeys: string[] = [
    'id',
    'updatedAt',
    'createdAt',
    'timestamp',
    'acceptedAt',
    'reviewedAt',
    'readAt',
  ],
): unknown {
  const volatile = new Set(volatileKeys);

  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map(walk);
    }
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(node as object).sort()) {
        if (volatile.has(key)) {
          out[key] = '<volatile>';
          continue;
        }
        out[key] = walk((node as Record<string, unknown>)[key]);
      }
      return out;
    }
    return node;
  };

  return walk(value);
}
