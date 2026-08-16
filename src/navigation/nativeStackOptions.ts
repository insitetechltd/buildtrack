import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

export function buildDefaultStackScreenOptions(): NativeStackNavigationOptions {
  return {
    headerShown: false,
    presentation: "card",
    animation: "default",
    gestureEnabled: true,
    gestureDirection: "horizontal",
  };
}

/**
 * Task Detail uses a custom header (no native back chevron). Enable the
 * full-screen interactive pop so left-edge / content swipes can dismiss,
 * matching iOS expectations when `headerShown: false`.
 */
export function buildTaskDetailStackScreenOptions(): NativeStackNavigationOptions {
  return {
    ...buildDefaultStackScreenOptions(),
    fullScreenGestureEnabled: true,
    // Widen the edge recognition zone so photo carousels are less likely to steal the pop.
    gestureResponseDistance: { start: 64 },
  };
}
