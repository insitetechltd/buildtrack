import {
  CAMERA_ZOOM_2X,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
  cameraZoomAfterPinch,
  cameraZoomPreset,
  clampCameraZoom,
  isCameraZoom1x,
} from "../cameraZoom";

describe("cameraZoom", () => {
  it("clamps to expo-camera 0–1", () => {
    expect(clampCameraZoom(-1)).toBe(CAMERA_ZOOM_MIN);
    expect(clampCameraZoom(2)).toBe(CAMERA_ZOOM_MAX);
    expect(clampCameraZoom(Number.NaN)).toBe(CAMERA_ZOOM_MIN);
  });

  it("maps 1× / 2× pills onto the 0–1 zoom prop", () => {
    expect(cameraZoomPreset("1x")).toBe(CAMERA_ZOOM_MIN);
    expect(cameraZoomPreset("2x")).toBe(CAMERA_ZOOM_2X);
  });

  it("treats pinch scale 1 as no change", () => {
    expect(cameraZoomAfterPinch(0.2, 1)).toBeCloseTo(0.2);
  });

  it("increases zoom when pinching out", () => {
    expect(cameraZoomAfterPinch(0, 2)).toBeGreaterThan(0);
    expect(cameraZoomAfterPinch(0.9, 3)).toBe(CAMERA_ZOOM_MAX);
  });

  it("treats low zoom as the 1× pill", () => {
    expect(isCameraZoom1x(0)).toBe(true);
    expect(isCameraZoom1x(CAMERA_ZOOM_2X)).toBe(false);
  });
});
