import { CameraView } from "expo-camera";

import { probeCameraAvailable } from "../cameraAvailability";

jest.mock("expo-camera", () => ({
  CameraView: {},
}));

describe("probeCameraAvailable", () => {
  afterEach(() => {
    delete (CameraView as { isAvailableAsync?: unknown }).isAvailableAsync;
  });

  it("treats a missing isAvailableAsync as available", async () => {
    await expect(probeCameraAvailable()).resolves.toBe(true);
  });

  it("returns false when the platform reports no camera", async () => {
    (CameraView as { isAvailableAsync: () => Promise<boolean> }).isAvailableAsync =
      async () => false;
    await expect(probeCameraAvailable()).resolves.toBe(false);
  });

  it("treats a native UnavailabilityError as available", async () => {
    (CameraView as { isAvailableAsync: () => Promise<boolean> }).isAvailableAsync =
      async () => {
        throw new Error("UnavailabilityError");
      };
    await expect(probeCameraAvailable()).resolves.toBe(true);
  });
});
