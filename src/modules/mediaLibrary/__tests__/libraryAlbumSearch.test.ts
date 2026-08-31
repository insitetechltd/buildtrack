import {
  ALL_PHOTOS_ALBUM_ID,
  RECENTS_ALBUM_TITLE,
} from "../libraryAlbumConstants";
import {
  albumsWithRecentsSentinel,
  filterLibraryAlbums,
  isCameraRollAlbumTitle,
} from "../libraryAlbumSearch";

describe("libraryAlbumSearch", () => {
  it("treats Recents / All Photos / Camera Roll as the same Camera Roll", () => {
    expect(isCameraRollAlbumTitle("Recents")).toBe(true);
    expect(isCameraRollAlbumTitle("All photos")).toBe(true);
    expect(isCameraRollAlbumTitle("Camera Roll")).toBe(true);
    expect(isCameraRollAlbumTitle("Screenshots")).toBe(false);
  });

  it("prepends Recents sentinel and drops duplicate Camera Roll rows", () => {
    const merged = albumsWithRecentsSentinel([
      { id: "sys-recents", title: "Recents", assetCount: 4000 },
      { id: "shots", title: "Screenshots", assetCount: 12 },
    ]);
    expect(merged[0]).toEqual({
      id: ALL_PHOTOS_ALBUM_ID,
      title: RECENTS_ALBUM_TITLE,
      assetCount: 0,
    });
    expect(merged.map((a) => a.id)).toEqual([ALL_PHOTOS_ALBUM_ID, "shots"]);
  });

  it("filters albums by case-insensitive title substring", () => {
    const albums = [
      { id: ALL_PHOTOS_ALBUM_ID, title: RECENTS_ALBUM_TITLE, assetCount: 0 },
      { id: "a", title: "Screenshots", assetCount: 3 },
      { id: "b", title: "Site A — Level 12", assetCount: 40 },
    ];
    expect(filterLibraryAlbums(albums, "  rec ")).toEqual([albums[0]]);
    expect(filterLibraryAlbums(albums, "level")).toEqual([albums[2]]);
    expect(filterLibraryAlbums(albums, "")).toEqual(albums);
  });
});
