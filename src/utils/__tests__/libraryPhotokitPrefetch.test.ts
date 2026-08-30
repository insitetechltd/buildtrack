import {
  photokitGridItemLayout,
  photokitGridRowCount,
  photokitGridRowLayout,
  photokitIndexInBounds,
  photokitLookaheadRange,
  shouldBindPhotokitIndexCell,
  shouldBindPhotokitThumb,
} from "../libraryPhotokitPrefetch";

describe("photokitLookaheadRange", () => {
  it("returns null until a scroll-buffer page of IDs exists", () => {
    expect(photokitLookaheadRange(11, 12)).toBeNull();
  });

  it("prefetches from index 12 while the first screen is still visible", () => {
    expect(photokitLookaheadRange(11, 30)).toEqual({ from: 12, to: 27 });
  });

  it("does not include the first screen when viewability has not fired", () => {
    expect(photokitLookaheadRange(-1, 30)).toEqual({ from: 12, to: 27 });
  });

  it("moves the window past the new last visible while scrolling", () => {
    expect(photokitLookaheadRange(20, 40)).toEqual({ from: 21, to: 36 });
  });
});

describe("shouldBindPhotokitThumb", () => {
  it("binds the first screen even before viewability", () => {
    expect(shouldBindPhotokitThumb(0, 12, 0, -1)).toBe(true);
    expect(shouldBindPhotokitThumb(11, 12, 0, -1)).toBe(true);
  });

  it("does not bind page-2 tiles until they are viewable", () => {
    expect(shouldBindPhotokitThumb(12, 12, 0, 11)).toBe(false);
    expect(shouldBindPhotokitThumb(12, 12, 12, 17)).toBe(true);
  });
});

describe("shouldBindPhotokitIndexCell", () => {
  it("binds the first screen before the user has scrolled", () => {
    expect(shouldBindPhotokitIndexCell(0, 12, false)).toBe(true);
    expect(shouldBindPhotokitIndexCell(11, 12, false)).toBe(true);
  });

  it("does not decode off-screen window mounts until the first screen is left", () => {
    expect(shouldBindPhotokitIndexCell(12, 12, false)).toBe(false);
    expect(shouldBindPhotokitIndexCell(12, 12, true)).toBe(true);
  });
});

describe("photokitIndexInBounds / getItemLayout", () => {
  it("rejects out-of-range indexes (native object(at:) would crash)", () => {
    expect(photokitIndexInBounds(-1, 10)).toBe(false);
    expect(photokitIndexInBounds(10, 10)).toBe(false);
    expect(photokitIndexInBounds(0, 10)).toBe(true);
  });

  it("uses row offsets without a header (3 columns, 100pt rows)", () => {
    expect(photokitGridItemLayout(0, 100, 3)).toEqual({
      length: 100,
      offset: 0,
      index: 0,
    });
    expect(photokitGridItemLayout(3, 100, 3)).toEqual({
      length: 100,
      offset: 100,
      index: 3,
    });
  });

  it("counts rows and lays out one list item per row", () => {
    expect(photokitGridRowCount(40, 3)).toBe(14);
    expect(photokitGridRowLayout(0, 100)).toEqual({
      length: 100,
      offset: 0,
      index: 0,
    });
    expect(photokitGridRowLayout(4, 100)).toEqual({
      length: 100,
      offset: 400,
      index: 4,
    });
  });
});
