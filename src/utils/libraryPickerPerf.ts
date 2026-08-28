/** Central tunables for hybrid library grid scroll continuity (M-PERF-03). */

/** FlatList rows rendered on first mount (× COLUMNS items). */
export const LIBRARY_GRID_INITIAL_ROWS = 4;
/** Rows mounted per FlatList batch while scrolling. */
export const LIBRARY_GRID_BATCH_ROWS = 3;
/** FlatList windowSize — higher = smoother scroll, more memory. */
export const LIBRARY_GRID_WINDOW_SIZE = 7;
/** FlatList updateCellsBatchingPeriod — ~1 frame. */
export const LIBRARY_GRID_BATCH_MS = 16;

/** Items to prefetch beyond the last visible index while scrolling. */
export const LIBRARY_SCROLL_LOOKAHEAD_ITEMS = 15;
/** Viewability: no dwell — react to scroll position immediately. */
export const LIBRARY_VIEWABILITY_MIN_TIME_MS = 0;
export const LIBRARY_VIEWABILITY_THRESHOLD = 5;

/** Thumb decode queue — higher = faster fill, more CPU/IO. */
export const LIBRARY_THUMB_DECODE_CONCURRENCY = 5;
export const LIBRARY_THUMB_LRU_MAX = 200;
export const LIBRARY_THUMB_MAX_PIXELS = 320;

/** Camera warm prefetch — first screen + one scroll batch. */
export const LIBRARY_WARM_PAGE_SIZE = 36;
export const LIBRARY_WARM_THUMB_COUNT = 24;

/** Priority decode: viewport tiles beat background warm/pump. */
export const LIBRARY_THUMB_PRIORITY_VIEWPORT = 0;
export const LIBRARY_THUMB_PRIORITY_BACKGROUND = 10;
