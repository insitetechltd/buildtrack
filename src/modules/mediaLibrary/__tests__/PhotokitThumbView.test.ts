import {
  expandPhotokitLibraryFull,
  getPhotokitThumbNativeView,
  isPhotokitLibrary2bAvailable,
  isPhotokitLibraryIndexAvailable,
  isPhotokitThumbsAvailable,
  openPhotokitLibrary,
  openPhotokitLibraryLimited,
  photokitIdAt,
  previewPhotokitNewestIds,
  startPhotokitRangeCaching,
  startPhotokitThumbCaching,
  stopPhotokitThumbCaching,
} from "../PhotokitThumbView";

describe("PhotokitThumbView JS gate", () => {
  it("is unavailable in Jest (no native PhotokitThumbs module)", () => {
    expect(isPhotokitThumbsAvailable()).toBe(false);
    expect(isPhotokitLibraryIndexAvailable()).toBe(false);
    expect(isPhotokitLibrary2bAvailable()).toBe(false);
    expect(getPhotokitThumbNativeView()).toBeNull();
  });

  it("no-ops cache calls when the native module is missing", async () => {
    expect(() => {
      startPhotokitThumbCaching(["a"], 120);
      startPhotokitRangeCaching(1, 12, 27, 120);
      stopPhotokitThumbCaching();
    }).not.toThrow();
    await expect(openPhotokitLibrary(null)).resolves.toBeNull();
    await expect(openPhotokitLibraryLimited(null, 60)).resolves.toBeNull();
    await expect(expandPhotokitLibraryFull(1)).resolves.toBeNull();
    await expect(previewPhotokitNewestIds(30)).resolves.toEqual([]);
    expect(photokitIdAt(1, 0)).toBeNull();
  });
});
