import * as fs from 'fs';
import * as path from 'path';
import {
  formatParityReportCsv,
  formatParityReportMarkdown,
  getParityResults,
} from './parityReport';

const GOLDEN_DIR = path.join(process.cwd(), 'src/__tests__/parity/matrix/golden-old');

export function ensureGoldenDir(): string {
  if (!fs.existsSync(GOLDEN_DIR)) {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  }
  return GOLDEN_DIR;
}

export function shouldWriteGolden(): boolean {
  return process.env.PARITY_WRITE_GOLDEN === '1';
}

export function writeGoldenArtifacts(options?: {
  snapshotName?: string;
  snapshot?: unknown;
}): void {
  if (!shouldWriteGolden()) {
    return;
  }

  const cells = getParityResults();
  if (cells.length === 0) {
    // Avoid clobbering an existing golden baseline with an empty failed run.
    return;
  }

  const dir = ensureGoldenDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportMd = path.join(dir, `report-${stamp}.md`);
  const reportCsv = path.join(dir, `report-${stamp}.csv`);
  const latestMd = path.join(dir, 'LATEST_REPORT.md');
  const latestCsv = path.join(dir, 'LATEST_REPORT.csv');

  const md = formatParityReportMarkdown(cells);
  const csv = formatParityReportCsv(cells);

  fs.writeFileSync(reportMd, md, 'utf8');
  fs.writeFileSync(reportCsv, csv, 'utf8');
  fs.writeFileSync(latestMd, md, 'utf8');
  fs.writeFileSync(latestCsv, csv, 'utf8');

  if (options?.snapshotName && options.snapshot !== undefined) {
    const snapPath = path.join(dir, `${options.snapshotName}.json`);
    fs.writeFileSync(snapPath, JSON.stringify(options.snapshot, null, 2), 'utf8');
  }
}

export function writeGoldenSnapshot(name: string, snapshot: unknown): void {
  if (!shouldWriteGolden()) {
    return;
  }
  const dir = ensureGoldenDir();
  const snapPath = path.join(dir, `${name}.json`);
  fs.writeFileSync(snapPath, JSON.stringify(snapshot, null, 2), 'utf8');
}

export function readGoldenSnapshot(name: string): unknown | null {
  const snapPath = path.join(GOLDEN_DIR, `${name}.json`);
  if (!fs.existsSync(snapPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(snapPath, 'utf8'));
}
