import { PixelRatio } from "react-native";

import { libraryThumbDecode } from "../libraryThumbDecode";

describe("libraryThumbDecode", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("keeps layout > 0 so PhotoKit does not fall back to MaximumSize", () => {
    jest.spyOn(PixelRatio, "get").mockReturnValue(3);
    const { layout, scale } = libraryThumbDecode(131);
    expect(layout).toBeGreaterThanOrEqual(1);
    expect(layout).toBe(Math.round(131 * (2 / 3)));
    expect(scale).toBeCloseTo(131 / layout);
  });

  it("requests ~2× pixels on a 3× screen, not 3×", () => {
    jest.spyOn(PixelRatio, "get").mockReturnValue(3);
    const tile = 130.5;
    const { layout } = libraryThumbDecode(tile);
    expect(layout).toBeLessThan(tile);
    expect(layout / tile).toBeCloseTo(2 / 3, 1);
  });

  it("does not enlarge the Image on 1× / 2× screens", () => {
    jest.spyOn(PixelRatio, "get").mockReturnValue(2);
    expect(libraryThumbDecode(120).layout).toBe(120);

    jest.spyOn(PixelRatio, "get").mockReturnValue(1);
    expect(libraryThumbDecode(120).layout).toBe(120);
  });
});
