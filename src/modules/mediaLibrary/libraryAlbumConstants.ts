import * as MediaLibrary from "expo-media-library";

/** Sentinel: Library (all photos chronological). UI title is Library; fetch is full photo library. */
export const ALL_PHOTOS_ALBUM_ID = "__all__";

/** User-facing name for `ALL_PHOTOS_ALBUM_ID` — keep fetch on Recents, not “All Photos”. */
export const RECENTS_ALBUM_TITLE = "Library";

/** Follow-up pages while scrolling — one extra screen, not 6-at-a-time (too slow) or 36 (one long stall). */
export const LIBRARY_PAGE_SIZE = 18;
/** First PhotoKit request = one screen. Same wait as a tiny page, but a usable batch. */
export const LIBRARY_INITIAL_PAGE_SIZE = 12;
/** Stop first-screen auto-fill here. Scroll pages use LIBRARY_PAGE_SIZE. */
export const LIBRARY_FILL_UNTIL_COUNT = 12;
/**
 * One extra PhotoKit page in memory so scroll is not blocked on getAssetsAsync.
 * Further pages stay onEndReached.
 */
export const LIBRARY_PREFETCH_UNTIL_COUNT =
  LIBRARY_FILL_UNTIL_COUNT + LIBRARY_PAGE_SIZE;
export const LIBRARY_GRID_COLUMNS = 3;
export const LIBRARY_GRID_GAP = 2;
/** Phone Library density. iPad width ÷ this ≈ column count (capped). */
export const LIBRARY_GRID_TARGET_TILE_PT = 128;
/** Hard cap so a 13" landscape sheet does not mount a 10-wide PhotoKit burst. */
export const LIBRARY_GRID_MAX_COLUMNS = 8;
/** First-wave decode cap (visible tiles + one row, then this). */
export const LIBRARY_GRID_FIRST_WAVE_ITEMS_CAP = 24;
/** Same as historic `LIBRARY_GRID_INITIAL_ROWS` — do not mount 8 iPad rows at once. */
export const LIBRARY_GRID_FIRST_WAVE_ROWS = 6;

/**
 * Library grid columns from window width. iPhone stays 3; iPad gets more
 * columns so tiles stay ~phone-sized instead of 1/3 of the iPad.
 */
export function libraryGridColumns(width: number): number {
  if (!Number.isFinite(width) || width < 1) {
    return LIBRARY_GRID_COLUMNS;
  }
  const cols = Math.round(
    (width + LIBRARY_GRID_GAP) /
      (LIBRARY_GRID_TARGET_TILE_PT + LIBRARY_GRID_GAP),
  );
  return Math.max(
    LIBRARY_GRID_COLUMNS,
    Math.min(LIBRARY_GRID_MAX_COLUMNS, cols),
  );
}

/**
 * How many Recents tiles may bind PhotoKit on first paint.
 * iPad 8-col must not request a full viewport of 40×512 at once.
 */
export function libraryGridFirstWaveItemCount(opts: {
  columns: number;
  viewHeight: number;
  rowHeight: number;
}): number {
  const cols = Math.max(1, opts.columns);
  const visibleRows =
    opts.viewHeight > 0 && opts.rowHeight > 0
      ? Math.ceil(opts.viewHeight / opts.rowHeight)
      : LIBRARY_GRID_FIRST_WAVE_ROWS;
  const rows = Math.min(visibleRows + 1, LIBRARY_GRID_FIRST_WAVE_ROWS);
  return Math.min(
    LIBRARY_GRID_FIRST_WAVE_ITEMS_CAP,
    Math.max(LIBRARY_FILL_UNTIL_COUNT, rows * cols),
  );
}

/** Newest captured first — chronological Library view (not modificationTime). */
export const LIBRARY_ASSET_SORT: MediaLibrary.SortByValue[] = [
  [MediaLibrary.SortBy.creationTime, false],
];

export type LibraryAlbumChoice = {
  id: string;
  title: string;
  assetCount: number;
};

export type LibraryAssetPage = {
  assets: MediaLibrary.Asset[];
  endCursor: string | undefined;
  hasNextPage: boolean;
};

/** Photo library sort order */
export type LibrarySortOrder = "descending" | "ascending";

/** Photo library time filter (creationDate window) */
export type LibraryTimeFilter = "all" | "lastWeek" | "lastMonth";

export type LibraryFilterState = {
  sortOrder: LibrarySortOrder;
  timeFilter: LibraryTimeFilter;
};

export const DEFAULT_LIBRARY_FILTER: LibraryFilterState = {
  sortOrder: "descending",  // Latest first
  timeFilter: "all",         // No date window
};

/**
 * Calculate date range for time filters (creationDate window).
 * Returns epoch seconds for PhotoKit NSPredicate.
 */
export function timeFilterDateRange(filter: LibraryTimeFilter): {
  afterEpochSeconds: number | null;
  beforeEpochSeconds: number | null;
} {
  if (filter === "all") {
    return { afterEpochSeconds: null, beforeEpochSeconds: null };
  }
  const now = Date.now() / 1000; // Convert to seconds
  const oneDay = 24 * 60 * 60;
  if (filter === "lastWeek") {
    return { afterEpochSeconds: now - 7 * oneDay, beforeEpochSeconds: null };
  }
  if (filter === "lastMonth") {
    return { afterEpochSeconds: now - 30 * oneDay, beforeEpochSeconds: null };
  }
  return { afterEpochSeconds: null, beforeEpochSeconds: null };
}
