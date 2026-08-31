import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

/** Default card stack — custom headers everywhere (`headerShown: false`). */
export function buildOwnerStackScreenOptions(): NativeStackNavigationOptions {
  return {
    headerShown: false,
    presentation: "card",
    animation: "default",
    gestureEnabled: true,
    gestureDirection: "horizontal",
    // Custom TenantScreenHeader has no native back chevron; enable interactive pop.
    fullScreenGestureEnabled: true,
    gestureResponseDistance: { start: 64 },
  };
}
