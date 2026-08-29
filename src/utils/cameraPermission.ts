import { Camera } from "expo-camera";

export type CameraPermissionSnapshot = {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
};

let cached: CameraPermissionSnapshot | null = null;
let inFlight: Promise<CameraPermissionSnapshot> | null = null;

function snapshotFrom(result: {
  granted: boolean;
  canAskAgain?: boolean;
  status?: string;
}): CameraPermissionSnapshot {
  return {
    granted: result.granted,
    canAskAgain: result.canAskAgain !== false,
    status: result.status ?? (result.granted ? "granted" : "denied"),
  };
}

function remember(
  result: {
    granted: boolean;
    canAskAgain?: boolean;
    status?: string;
  },
): CameraPermissionSnapshot {
  cached = snapshotFrom(result);
  return cached;
}

/** Last known camera permission — never prompts. */
export function peekCameraPermission(): CameraPermissionSnapshot | null {
  return cached;
}

export function invalidateCameraPermissionCache(): void {
  cached = null;
  inFlight = null;
}

/** Read OS camera permission and store it. Safe on launch / foreground. */
export async function refreshCameraPermission(): Promise<CameraPermissionSnapshot> {
  const result = await Camera.getCameraPermissionsAsync();
  return remember(result);
}

/**
 * App-level cache. After the first read, later camera opens do not hit native.
 */
export async function ensureCameraPermissionChecked(): Promise<CameraPermissionSnapshot> {
  if (cached) {
    return cached;
  }
  if (inFlight) {
    return inFlight;
  }
  inFlight = refreshCameraPermission().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** System dialog — only from Allow Camera. Result is cached for the rest of the session. */
export async function requestCameraPermission(): Promise<CameraPermissionSnapshot> {
  const result = await Camera.requestCameraPermissionsAsync();
  return remember(result);
}
