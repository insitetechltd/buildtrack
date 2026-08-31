import {
  ALL_PHOTOS_ALBUM_ID,
  RECENTS_ALBUM_TITLE,
  type LibraryAlbumChoice,
} from "./libraryAlbumConstants";

/** System albums that are the same Camera Roll we already expose as Recents. */
const CAMERA_ROLL_TITLES = new Set([
  "recents",
  "all photos",
  "camera roll",
]);

export function isCameraRollAlbumTitle(title: string): boolean {
  return CAMERA_ROLL_TITLES.has(title.trim().toLowerCase());
}

export function recentsSentinelAlbum(): LibraryAlbumChoice {
  return { id: ALL_PHOTOS_ALBUM_ID, title: RECENTS_ALBUM_TITLE, assetCount: 0 };
}

/** Prepend Recents sentinel; drop duplicate Camera Roll / All Photos rows. */
export function albumsWithRecentsSentinel(
  mapped: LibraryAlbumChoice[],
): LibraryAlbumChoice[] {
  return [
    recentsSentinelAlbum(),
    ...mapped.filter((album) => !isCameraRollAlbumTitle(album.title)),
  ];
}

export function filterLibraryAlbums(
  albums: LibraryAlbumChoice[],
  query: string,
): LibraryAlbumChoice[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return albums;
  }
  return albums.filter((album) => album.title.toLowerCase().includes(needle));
}
