import {
  LIBRARY_FILL_UNTIL_COUNT,
  LIBRARY_GRID_COLUMNS,
} from "@/modules/mediaLibrary/libraryAlbumConstants";
import { LIBRARY_SECOND_WAVE_ITEMS } from "./libraryPhotokitPrefetch";

export type LibraryPickerLoadPageReason =
  | "fallback"
  | "pagination"
  | "album"
  | null;

export type LibraryPickerTimingSnapshot = {
  sessionId: number;
  overlayOpenAt: number;
  metadataAt: number | null;
  metadataCount: number | null;
  /** First single tile painted (product ≤3s budget). */
  firstTileAt: number | null;
  firstRowAt: number | null;
  firstScreenAt: number | null;
  secondWaveAt: number | null;
  scrollUpStartedAt: number | null;
  scrollUpRowAt: number | null;
  prevScreenMs: number | null;
  paintedCount: number;
  expectedRow: number;
  expectedScreen: number;
  /** Set when MediaLibrary.getAssetsAsync loadPage runs (diagnostic). */
  loadPageReason: LibraryPickerLoadPageReason;
};

type Listener = (snapshot: LibraryPickerTimingSnapshot) => void;

const LOG_PREFIX = "[library-picker-l1]";

let sessionId = 0;
let overlayOpenAt = 0;
let metadataAt: number | null = null;
let metadataCount: number | null = null;
let firstTileAt: number | null = null;
let firstRowAt: number | null = null;
let firstScreenAt: number | null = null;
let secondWaveAt: number | null = null;
let scrollUpStartedAt: number | null = null;
let scrollUpRowAt: number | null = null;
let prevScreenMs: number | null = null;
let paintedIds = new Set<string>();
let scrollUpPaintedIds = new Set<string>();
let expectedRow = LIBRARY_GRID_COLUMNS;
let expectedScreen = LIBRARY_FILL_UNTIL_COUNT;
let loadPageReason: LibraryPickerLoadPageReason = null;
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
    firstTileAt,
    firstRowAt,
    firstScreenAt,
    secondWaveAt,
    scrollUpStartedAt,
    scrollUpRowAt,
    prevScreenMs,
    paintedCount: paintedIds.size,
    expectedRow,
    expectedScreen,
    loadPageReason,
  };
}

/** TF diagnostic — confirms slow sorted MediaLibrary path vs native preview/index. */
export function markLibraryPickerLoadPage(
  reason: Exclude<LibraryPickerLoadPageReason, null>,
): void {
  if (sessionId === 0) {
    return;
  }
  loadPageReason = reason;
  emit("load_page", { reason });
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
      firstScreenToSecondWaveMs:
        current.firstScreenAt == null
          ? null
          : delta(current.firstScreenAt, current.secondWaveAt),
      scrollUpToRowMs:
        current.scrollUpStartedAt == null
          ? null
          : delta(current.scrollUpStartedAt, current.scrollUpRowAt),
      prevScreenMs: current.prevScreenMs,
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
  firstTileAt = null;
  firstRowAt = null;
  firstScreenAt = null;
  secondWaveAt = null;
  scrollUpStartedAt = null;
  scrollUpRowAt = null;
  prevScreenMs = null;
  paintedIds = new Set();
  scrollUpPaintedIds = new Set();
  expectedRow = LIBRARY_GRID_COLUMNS;
  expectedScreen = LIBRARY_FILL_UNTIL_COUNT;
  loadPageReason = null;
  listeners.clear();
}

/** Call at library overlay open (tap), before React mount work. */
export function beginLibraryPickerSession(): void {
  if (firstScreenAt != null && overlayOpenAt > 0) {
    prevScreenMs = firstScreenAt - overlayOpenAt;
  }
  sessionId += 1;
  overlayOpenAt = nowMs();
  metadataAt = null;
  metadataCount = null;
  firstTileAt = null;
  firstRowAt = null;
  firstScreenAt = null;
  secondWaveAt = null;
  scrollUpStartedAt = null;
  scrollUpRowAt = null;
  paintedIds = new Set();
  scrollUpPaintedIds = new Set();
  expectedRow = LIBRARY_GRID_COLUMNS;
  expectedScreen = LIBRARY_FILL_UNTIL_COUNT;
  loadPageReason = null;
  emit("overlay_open");
}

/**
 * First time this session the user scrolls back to the top row after leaving
 * the first screen. `up` is ms from that moment until 3 recycled tiles paint.
 */
export function beginLibraryPickerScrollUp(): void {
  if (sessionId === 0 || overlayOpenAt === 0) {
    return;
  }
  if (firstScreenAt == null || scrollUpStartedAt != null) {
    return;
  }
  scrollUpStartedAt = nowMs();
  scrollUpPaintedIds = new Set();
  scrollUpRowAt = null;
  emit("scroll_up_start");
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
  if (sessionId === 0 || !assetId) {
    return;
  }

  if (
    scrollUpStartedAt != null &&
    scrollUpRowAt == null &&
    !scrollUpPaintedIds.has(assetId)
  ) {
    scrollUpPaintedIds.add(assetId);
    if (expectedRow > 0 && scrollUpPaintedIds.size >= expectedRow) {
      scrollUpRowAt = nowMs();
      emit("scroll_up_row");
    }
  }

  if (paintedIds.has(assetId)) {
    return;
  }
  paintedIds.add(assetId);
  const painted = paintedIds.size;
  const at = nowMs();
  if (firstTileAt == null) {
    firstTileAt = at;
    emit("first_tile");
  }
  if (firstRowAt == null && expectedRow > 0 && painted >= expectedRow) {
    firstRowAt = at;
    emit("first_row");
  }
  if (firstScreenAt == null && expectedScreen > 0 && painted >= expectedScreen) {
    firstScreenAt = at;
    emit("first_screen");
  }
  if (
    firstScreenAt != null &&
    secondWaveAt == null &&
    LIBRARY_SECOND_WAVE_ITEMS > 0 &&
    painted >= expectedScreen + LIBRARY_SECOND_WAVE_ITEMS
  ) {
    secondWaveAt = at;
    emit("second_wave");
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
  const line = (label: string, at: number | null, origin = current.overlayOpenAt) => {
    if (at == null) {
      return `${label} —`;
    }
    return `${label} +${at - origin}ms`;
  };
  const lines = [
    "L1 timing",
    line("meta", current.metadataAt),
    line("1st", current.firstTileAt),
    line("row", current.firstRowAt),
    line("12", current.firstScreenAt),
    current.firstScreenAt == null
      ? "p2 —"
      : line("p2", current.secondWaveAt, current.firstScreenAt),
    current.scrollUpStartedAt == null
      ? "up —"
      : line("up", current.scrollUpRowAt, current.scrollUpStartedAt),
  ];
  if (current.prevScreenMs != null) {
    lines.push(`1st 12 +${current.prevScreenMs}ms`);
  }
  lines.push(
    current.loadPageReason ? `loadPage ${current.loadPageReason}` : "loadPage —",
  );
  return lines.join("\n");
}
