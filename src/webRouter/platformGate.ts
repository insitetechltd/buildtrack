import { Platform } from "react-native";

/** Single seam for App.tsx web vs mobile entry. */
export function isWebPlatform(): boolean {
  return Platform.OS === "web";
}
