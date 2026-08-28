jest.mock("expo-media-library", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

import * as MediaLibrary from "expo-media-library";

import {
  ensureMediaLibraryAccess,
  ensureMediaLibraryChecked,
  invalidateMediaLibraryPermissionCache,
  peekMediaLibraryPermission,
  refreshMediaLibraryPermission,
} from "../mediaLibraryPermission";

const mockGetPermissionsAsync = MediaLibrary.getPermissionsAsync as jest.Mock;
const mockRequestPermissionsAsync = MediaLibrary.requestPermissionsAsync as jest.Mock;

describe("mediaLibraryPermission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateMediaLibraryPermissionCache();
  });

  it("ensureMediaLibraryChecked caches getPermissionsAsync without prompting", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true, status: "granted" });

    await expect(ensureMediaLibraryChecked()).resolves.toEqual({
      granted: true,
      canAskAgain: true,
      status: "granted",
    });
    await ensureMediaLibraryChecked();
    expect(mockGetPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    expect(peekMediaLibraryPermission()?.granted).toBe(true);
  });

  it("ensureMediaLibraryAccess requests only when not yet granted", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true, status: "undetermined" });
    mockRequestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true, status: "granted" });

    await expect(ensureMediaLibraryAccess()).resolves.toBe(true);
    expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it("refreshMediaLibraryPermission replaces cache on wake", async () => {
    mockGetPermissionsAsync.mockResolvedValueOnce({ granted: false, canAskAgain: true, status: "denied" });
    await refreshMediaLibraryPermission();
    expect(peekMediaLibraryPermission()?.granted).toBe(false);

    mockGetPermissionsAsync.mockResolvedValueOnce({ granted: true, canAskAgain: true, status: "granted" });
    await refreshMediaLibraryPermission();
    expect(peekMediaLibraryPermission()?.granted).toBe(true);
  });
});
