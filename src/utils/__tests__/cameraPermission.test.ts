jest.mock("expo-camera", () => ({
  Camera: {
    getCameraPermissionsAsync: jest.fn(),
    requestCameraPermissionsAsync: jest.fn(),
  },
}));

import { Camera } from "expo-camera";

import {
  ensureCameraPermissionChecked,
  invalidateCameraPermissionCache,
  peekCameraPermission,
  requestCameraPermission,
} from "../cameraPermission";

const mockGet = Camera.getCameraPermissionsAsync as jest.Mock;
const mockRequest = Camera.requestCameraPermissionsAsync as jest.Mock;

describe("cameraPermission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateCameraPermissionCache();
  });

  it("caches getCameraPermissionsAsync without a second native read", async () => {
    mockGet.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true });

    await expect(ensureCameraPermissionChecked()).resolves.toMatchObject({
      granted: true,
    });
    await ensureCameraPermissionChecked();
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(peekCameraPermission()?.granted).toBe(true);
  });

  it("requestCameraPermission stores the OS grant for later opens", async () => {
    mockRequest.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true });

    await expect(requestCameraPermission()).resolves.toMatchObject({ granted: true });
    await ensureCameraPermissionChecked();
    expect(mockGet).not.toHaveBeenCalled();
    expect(peekCameraPermission()?.granted).toBe(true);
  });

  it("invalidate drops an in-flight get so the next check can run", async () => {
    mockGet.mockReturnValue(new Promise(() => undefined));
    const hung = ensureCameraPermissionChecked();
    invalidateCameraPermissionCache();
    mockGet.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true });
    await expect(ensureCameraPermissionChecked()).resolves.toMatchObject({ granted: true });
    void hung;
  });
});
