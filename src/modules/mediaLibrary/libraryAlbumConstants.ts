import * as MediaLibrary from "expo-media-library";

/** Sentinel: all photos (no album filter). */
export const ALL_PHOTOS_ALBUM_ID = "__all__";

export const LIBRARY_PAGE_SIZE = 36;
/** First grid paint — smaller than scroll pages for faster time-to-first-tiles. */
export const LIBRARY_INITIAL_PAGE_SIZE = 12;
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
