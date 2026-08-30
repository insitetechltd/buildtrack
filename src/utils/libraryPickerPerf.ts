/** Central tunables for hybrid library grid scroll continuity (M-PERF-03). */

/** FlatList rows rendered on first mount (× COLUMNS items). ≥ first screen + p2 wave. */
export const LIBRARY_GRID_INITIAL_ROWS = 6;
/** Rows mounted per FlatList batch while scrolling. */
export const LIBRARY_GRID_BATCH_ROWS = 3;
/** FlatList windowSize — buffer without mounting the whole library. */
export const LIBRARY_GRID_WINDOW_SIZE = 5;
/** FlatList updateCellsBatchingPeriod — ~1 frame. */
export const LIBRARY_GRID_BATCH_MS = 16;

/** L2: unlock this many Image URIs per tick so PhotoKit is not a 12-wide burst. */
export const LIBRARY_PAINT_BATCH_SIZE = 3;
/** L2: ms between URI-bind ticks (index mode — fast once pipeline ready). */
export const LIBRARY_PAINT_INTERVAL_MS = 32;
/** Bridge / preview phase: one tile per tick so load feels continuous. */
export const LIBRARY_BRIDGE_PAINT_BATCH_SIZE = 1;
export const LIBRARY_BRIDGE_PAINT_INTERVAL_MS = 450;
/**
 * Skeleton tiles while waiting for index (≥ one screen).
 * Keep in sync with LIBRARY_WARM_PAGE_SIZE / columns so bridge paint
 * does not shrink a full-screen skeleton down to 12.
 */
export const LIBRARY_SKELETON_MIN_ROWS = 6;

export function librarySkeletonTileCount(
  viewHeight: number,
  rowHeight: number,
  columns: number = 3,
): number {
  const minTiles = LIBRARY_SKELETON_MIN_ROWS * Math.max(1, columns);
  if (viewHeight < 1 || rowHeight < 1) {
    return minTiles;
  }
  const rows = Math.ceil(viewHeight / rowHeight);
  return Math.max(minTiles, rows * Math.max(1, columns));
}
/**
 * On-device L1 HUD for TestFlight (hybrid library). Turn off after timings
 * are collected — not product chrome.
 */
export const LIBRARY_PICKER_TIMING_HUD = true;

/** Items to prefetch beyond the last visible index while scrolling. */
export const LIBRARY_SCROLL_LOOKAHEAD_ITEMS = 15;
/** Viewability: no dwell — react to scroll position immediately. */
export const LIBRARY_VIEWABILITY_MIN_TIME_MS = 0;
export const LIBRARY_VIEWABILITY_THRESHOLD = 5;

/** Thumb decode queue — higher = faster fill, more CPU/IO. */
export const LIBRARY_THUMB_DECODE_CONCURRENCY = 5;
export const LIBRARY_THUMB_LRU_MAX = 200;
export const LIBRARY_THUMB_MAX_PIXELS = 320;

/** Camera warm prefetch — first screen + p2 wave (6 rows × 3 cols). */
export const LIBRARY_WARM_PAGE_SIZE = 18;
export const LIBRARY_WARM_THUMB_COUNT = 24;

/** Priority decode: viewport tiles beat background warm/pump. */
export const LIBRARY_THUMB_PRIORITY_VIEWPORT = 0;
export const LIBRARY_THUMB_PRIORITY_BACKGROUND = 10;

/**
 * A/B picker fill path (M-PERF-03).
 * - `warm`: MediaLibrary warm bridge → full openLibrary (TF 232 serialize)
 * - `native2b`: openLibraryLimited(60) → expandLibraryFull same token (Option 2B)
 *
 * Override: EXPO_PUBLIC_LIBRARY_PICKER_PATH=warm|native2b
 */
export type LibraryPickerPath = "warm" | "native2b";

export const LIBRARY_PICKER_2B_FIRST_BATCH = 60;

function resolveLibraryPickerPath(): LibraryPickerPath {
  const fromTest = (
    globalThis as { __LIBRARY_PICKER_PATH__?: string }
  ).__LIBRARY_PICKER_PATH__;
  const raw = (
    fromTest ||
    process.env.EXPO_PUBLIC_LIBRARY_PICKER_PATH ||
    "warm"
  ).toLowerCase();
  return raw === "native2b" ? "native2b" : "warm";
}

/** Resolved path (re-reads test override / env). */
export function getLibraryPickerPath(): LibraryPickerPath {
  return resolveLibraryPickerPath();
}

/** Snapshot at module load — prefer getLibraryPickerPath() when A/B can change in tests. */
export const LIBRARY_PICKER_PATH: LibraryPickerPath = resolveLibraryPickerPath();

export function isLibraryPickerNative2b(): boolean {
  return resolveLibraryPickerPath() === "native2b";
}

/** Jest / tests: force path without rebuilding native. */
export function setLibraryPickerPathForTests(path: LibraryPickerPath): void {
  (globalThis as { __LIBRARY_PICKER_PATH__?: LibraryPickerPath }).__LIBRARY_PICKER_PATH__ =
    path;
}
