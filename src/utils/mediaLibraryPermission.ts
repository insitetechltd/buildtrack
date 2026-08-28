import * as MediaLibrary from "expo-media-library";

export type MediaLibraryPermissionSnapshot = {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
};

let cached: MediaLibraryPermissionSnapshot | null = null;
let inFlightCheck: Promise<MediaLibraryPermissionSnapshot> | null = null;

function snapshotFrom(
  result: MediaLibrary.PermissionResponse,
): MediaLibraryPermissionSnapshot {
  return {
    granted: result.granted,
    canAskAgain: result.canAskAgain !== false,
    status: result.status ?? (result.granted ? "granted" : "denied"),
  };
}

/** Read-only check — never shows the system permission dialog. */
export async function refreshMediaLibraryPermission(): Promise<MediaLibraryPermissionSnapshot> {
  const current = await MediaLibrary.getPermissionsAsync();
  cached = snapshotFrom(current);
  return cached;
}

/** Cached getPermissionsAsync; safe on app launch / wake. */
export async function ensureMediaLibraryChecked(): Promise<MediaLibraryPermissionSnapshot> {
  if (cached) {
    return cached;
  }
  if (inFlightCheck) {
    return inFlightCheck;
  }
  inFlightCheck = refreshMediaLibraryPermission().finally(() => {
    inFlightCheck = null;
  });
  return inFlightCheck;
}

export function peekMediaLibraryPermission(): MediaLibraryPermissionSnapshot | null {
  return cached;
}

export function invalidateMediaLibraryPermissionCache(): void {
  cached = null;
}

/**
 * Library / camera flows: use cached status; prompt only when undetermined.
 */
export async function ensureMediaLibraryAccess(): Promise<boolean> {
  const current = await ensureMediaLibraryChecked();
  if (current.granted) {
    return true;
  }
  if (!current.canAskAgain) {
    return false;
  }
  const requested = await MediaLibrary.requestPermissionsAsync();
  cached = snapshotFrom(requested);
  return cached.granted;
}
