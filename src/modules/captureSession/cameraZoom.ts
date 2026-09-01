/** expo-camera `zoom` is 0–1 (share of device max, exponential). */

export const CAMERA_ZOOM_MIN = 0;
export const CAMERA_ZOOM_MAX = 1;

/**
 * Digital ~2× on a typical phone max zoom.
 * `videoZoomFactor = max^z` with z in 0–1; log(2)/log(~12–16) ≈ 0.22.
 */
export const CAMERA_ZOOM_2X = 0.22;

const PINCH_SENSITIVITY = 0.4;

export function clampCameraZoom(value: number): number {
  if (!Number.isFinite(value)) {
    return CAMERA_ZOOM_MIN;
  }
  return Math.min(CAMERA_ZOOM_MAX, Math.max(CAMERA_ZOOM_MIN, value));
}

export function cameraZoomAfterPinch(startZoom: number, scale: number): number {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return clampCameraZoom(startZoom + (safeScale - 1) * PINCH_SENSITIVITY);
}

export function cameraZoomPreset(preset: "1x" | "2x"): number {
  return preset === "2x" ? CAMERA_ZOOM_2X : CAMERA_ZOOM_MIN;
}

export function isCameraZoom1x(zoom: number): boolean {
  return clampCameraZoom(zoom) < CAMERA_ZOOM_2X / 2;
}
