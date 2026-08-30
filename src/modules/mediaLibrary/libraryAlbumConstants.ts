import * as MediaLibrary from "expo-media-library";

/** Sentinel: all photos (no album filter). */
export const ALL_PHOTOS_ALBUM_ID = "__all__";

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

/** Newest captured first — matches Photos Recents (not modificationTime). */
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
