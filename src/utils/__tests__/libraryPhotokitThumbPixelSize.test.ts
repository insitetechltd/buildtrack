import {
  LIBRARY_PHOTOKIT_THUMB_BASE_CAP_PX,
  LIBRARY_PHOTOKIT_THUMB_LINEAR_SCALE,
  libraryPhotokitThumbMaxPx,
  libraryPhotokitThumbPixelSize,
} from "../libraryPickerPerf";

describe("libraryPhotokitThumbPixelSize", () => {
  it("doubles the TF237 256px cap on a 3× phone", () => {
    expect(LIBRARY_PHOTOKIT_THUMB_LINEAR_SCALE).toBe(2);
    expect(libraryPhotokitThumbMaxPx()).toBe(512);
    const tile = 132;
    const scale = 3;
    const uncapped = Math.round(tile * scale);
    expect(uncapped).toBeGreaterThan(LIBRARY_PHOTOKIT_THUMB_BASE_CAP_PX);
    expect(libraryPhotokitThumbPixelSize(tile, scale)).toBe(512);
  });

  it("still doubles when the tile is already under the 256 cap", () => {
    expect(libraryPhotokitThumbPixelSize(80, 2)).toBe(320);
  });

  it("never requests more than BASE × SCALE", () => {
    expect(libraryPhotokitThumbPixelSize(400, 3)).toBe(
      LIBRARY_PHOTOKIT_THUMB_BASE_CAP_PX * LIBRARY_PHOTOKIT_THUMB_LINEAR_SCALE,
    );
  });
});
