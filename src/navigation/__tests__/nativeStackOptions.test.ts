import { buildDefaultStackScreenOptions } from "../nativeStackOptions";

describe("buildDefaultStackScreenOptions", () => {
  it("preserves the native iOS card transition without forcing fullscreen gestures", () => {
    const options = buildDefaultStackScreenOptions();

    expect(options.headerShown).toBe(false);
    expect(options.presentation).toBe("card");
    expect(options.animation).toBe("default");
    expect(options.gestureEnabled).toBe(true);
    expect(options.fullScreenGestureEnabled).toBeUndefined();
  });
});
