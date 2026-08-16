import { buildDefaultStackScreenOptions, buildTaskDetailStackScreenOptions } from "../nativeStackOptions";

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

describe("buildTaskDetailStackScreenOptions", () => {
  it("enables full-screen interactive pop for custom-header Task Detail", () => {
    const options = buildTaskDetailStackScreenOptions();

    expect(options.headerShown).toBe(false);
    expect(options.gestureEnabled).toBe(true);
    expect(options.fullScreenGestureEnabled).toBe(true);
    expect(options.gestureResponseDistance).toEqual({ start: 64 });
  });
});
