import { PixelRatio } from "react-native";

/** PhotoKit targetSize is layout × screen scale. Cap at 2× so 3× phones decode ~tile×2, not ~tile×3. */
export const LIBRARY_THUMB_MAX_DENSITY = 2;

export function libraryThumbDecode(tileSize: number): {
  layout: number;
  scale: number;
} {
  const screenScale = PixelRatio.get();
  const density = Math.min(LIBRARY_THUMB_MAX_DENSITY, screenScale);
  const layout = Math.max(1, Math.round(tileSize * (density / screenScale)));
  return { layout, scale: tileSize / layout };
}
