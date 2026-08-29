import {
  LIBRARY_FILL_UNTIL_COUNT,
  LIBRARY_GRID_COLUMNS,
} from "@/modules/mediaLibrary/libraryAlbumConstants";

export type LibraryPickerTimingSnapshot = {
  sessionId: number;
  overlayOpenAt: number;
  metadataAt: number | null;
  metadataCount: number | null;
  firstRowAt: number | null;
  firstScreenAt: number | null;
  paintedCount: number;
  expectedRow: number;
  expectedScreen: number;
};

type Listener = (snapshot: LibraryPickerTimingSnapshot) => void;

const LOG_PREFIX = "[library-picker-l1]";

let sessionId = 0;
let overlayOpenAt = 0;
let metadataAt: number | null = null;
let metadataCount: number | null = null;
let firstRowAt: number | null = null;
let firstScreenAt: number | null = null;
let paintedIds = new Set<string>();
let expectedRow = LIBRARY_GRID_COLUMNS;
let expectedScreen = LIBRARY_FILL_UNTIL_COUNT;
const listeners = new Set<Listener>();

function nowMs(): number {
  return Date.now();
}

function delta(from: number, to: number | null): number | null {
  if (to == null) {
    return null;
  }
  return to - from;
}

function snapshot(): LibraryPickerTimingSnapshot | null {
  if (sessionId === 0 || overlayOpenAt === 0) {
    return null;
  }
  return {
    sessionId,
    overlayOpenAt,
    metadataAt,
    metadataCount,
    firstRowAt,
    firstScreenAt,
    paintedCount: paintedIds.size,
    expectedRow,
    expectedScreen,
  };
}

function emit(label: string, extra?: Record<string, unknown>): void {
  const current = snapshot();
  if (!current) {
    return;
  }
  console.log(
    LOG_PREFIX,
    JSON.stringify({
      event: label,
      sessionId: current.sessionId,
      openToMetaMs: delta(current.overlayOpenAt, current.metadataAt),
      openToRowMs: delta(current.overlayOpenAt, current.firstRowAt),
      openToScreenMs: delta(current.overlayOpenAt, current.firstScreenAt),
      painted: current.paintedCount,
      expectedScreen: current.expectedScreen,
      ...extra,
    }),
  );
  for (const listener of listeners) {
    listener(current);
  }
}

export function resetLibraryPickerTimingForTests(): void {
  sessionId = 0;
  overlayOpenAt = 0;
  metadataAt = null;
  metadataCount = null;
  firstRowAt = null;
  firstScreenAt = null;
  paintedIds = new Set();
  expectedRow = LIBRARY_GRID_COLUMNS;
  expectedScreen = LIBRARY_FILL_UNTIL_COUNT;
  listeners.clear();
}

/** Call at library overlay open (tap), before React mount work. */
export function beginLibraryPickerSession(): void {
  sessionId += 1;
  overlayOpenAt = nowMs();
  metadataAt = null;
  metadataCount = null;
  firstRowAt = null;
  firstScreenAt = null;
  paintedIds = new Set();
  expectedRow = LIBRARY_GRID_COLUMNS;
  expectedScreen = LIBRARY_FILL_UNTIL_COUNT;
  emit("overlay_open");
}

export function markLibraryPickerMetadata(count: number): void {
  if (sessionId === 0) {
    return;
  }
  if (metadataAt != null) {
    return;
  }
  metadataAt = nowMs();
  metadataCount = count;
  expectedRow = Math.min(LIBRARY_GRID_COLUMNS, Math.max(count, 0));
  expectedScreen = Math.min(LIBRARY_FILL_UNTIL_COUNT, Math.max(count, 0));
  emit("metadata_ready", { count });
}

export function markLibraryPickerTilePainted(assetId: string): void {
  if (sessionId === 0 || !assetId || paintedIds.has(assetId)) {
    return;
  }
  paintedIds.add(assetId);
  const painted = paintedIds.size;
  const at = nowMs();
  if (firstRowAt == null && expectedRow > 0 && painted >= expectedRow) {
    firstRowAt = at;
    emit("first_row");
  }
  if (firstScreenAt == null && expectedScreen > 0 && painted >= expectedScreen) {
    firstScreenAt = at;
    emit("first_screen");
  }
}

export function getLibraryPickerTimingSnapshot(): LibraryPickerTimingSnapshot | null {
  return snapshot();
}

export function subscribeLibraryPickerTiming(listener: Listener): () => void {
  listeners.add(listener);
  const current = snapshot();
  if (current) {
    listener(current);
  }
  return () => {
    listeners.delete(listener);
  };
}

export function formatLibraryPickerTimingHud(
  current: LibraryPickerTimingSnapshot | null,
): string {
  if (!current) {
    return "";
  }
  const line = (label: string, at: number | null) => {
    if (at == null) {
      return `${label} —`;
    }
    return `${label} +${at - current.overlayOpenAt}ms`;
  };
  return [
    "L1 timing",
    line("meta", current.metadataAt),
    line("row", current.firstRowAt),
    line("12", current.firstScreenAt),
  ].join("\n");
}
