import { buildOwnerStackScreenOptions } from "../nativeStackOptions";

describe("buildOwnerStackScreenOptions", () => {
  it("enables full-screen interactive pop for custom-header tenant screens", () => {
    const options = buildOwnerStackScreenOptions();

    expect(options.headerShown).toBe(false);
    expect(options.gestureEnabled).toBe(true);
    expect(options.fullScreenGestureEnabled).toBe(true);
    expect(options.gestureResponseDistance).toEqual({ start: 64 });
  });
});
