import {
  ALL_PHOTOS_ALBUM_ID,
  RECENTS_ALBUM_TITLE,
} from "../libraryAlbumConstants";
import {
  peekRememberedAlbumId,
  peekRememberedAlbums,
  rememberAlbumId,
  rememberAlbums,
  resetLibraryAlbumPickerMemory,
} from "../libraryAlbumPickerMemory";

describe("libraryAlbumPickerMemory", () => {
  beforeEach(() => {
    resetLibraryAlbumPickerMemory();
  });

  it("keeps the chosen album id after a picker remount would otherwise reset", () => {
    rememberAlbumId("shots");
    expect(peekRememberedAlbumId()).toBe("shots");
  });

  it("keeps the loaded album list so the dropdown is not empty after select", () => {
    rememberAlbums([
      { id: ALL_PHOTOS_ALBUM_ID, title: RECENTS_ALBUM_TITLE, assetCount: 0 },
      { id: "shots", title: "Screenshots", assetCount: 8 },
    ]);
    expect(peekRememberedAlbums()?.map((a) => a.id)).toEqual([
      ALL_PHOTOS_ALBUM_ID,
      "shots",
    ]);
  });

  it("resets to Recents", () => {
    rememberAlbumId("shots");
    rememberAlbums([
      { id: ALL_PHOTOS_ALBUM_ID, title: RECENTS_ALBUM_TITLE, assetCount: 0 },
    ]);
    resetLibraryAlbumPickerMemory();
    expect(peekRememberedAlbumId()).toBe(ALL_PHOTOS_ALBUM_ID);
    expect(peekRememberedAlbums()).toBeNull();
  });
});
