/** Central tunables for hybrid library grid scroll continuity (M-PERF-03). */

/** FlatList rows rendered on first mount (× COLUMNS items). Match first PhotoKit page. */
export const LIBRARY_GRID_INITIAL_ROWS = 4;
/** Rows mounted per FlatList batch while scrolling. */
export const LIBRARY_GRID_BATCH_ROWS = 3;
/** FlatList windowSize — buffer without mounting the whole library. */
export const LIBRARY_GRID_WINDOW_SIZE = 5;
/** FlatList updateCellsBatchingPeriod — ~1 frame. */
export const LIBRARY_GRID_BATCH_MS = 16;

/** L2: unlock this many Image URIs per tick so PhotoKit is not a 12-wide burst. */
export const LIBRARY_PAINT_BATCH_SIZE = 3;
/** L2: ms between URI-bind ticks. */
export const LIBRARY_PAINT_INTERVAL_MS = 32;
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

/** Camera / app-wake warm prefetch — match first grid page. */
export const LIBRARY_WARM_PAGE_SIZE = 12;
export const LIBRARY_WARM_THUMB_COUNT = 24;

/** Priority decode: viewport tiles beat background warm/pump. */
export const LIBRARY_THUMB_PRIORITY_VIEWPORT = 0;
export const LIBRARY_THUMB_PRIORITY_BACKGROUND = 10;
