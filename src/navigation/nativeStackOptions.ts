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
