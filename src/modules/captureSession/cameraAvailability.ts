import { CameraView } from "expo-camera";

/**
 * True when we should keep the camera path.
 * False only when the platform reports no camera (web / some simulators).
 * Native iOS/Android often omit isAvailableAsync — treat that as available
 * so phones do not skip Take.
 */
export async function probeCameraAvailable(): Promise<boolean> {
  try {
    if (typeof CameraView.isAvailableAsync !== "function") {
      return true;
    }
    return await CameraView.isAvailableAsync();
  } catch {
    return true;
  }
}
