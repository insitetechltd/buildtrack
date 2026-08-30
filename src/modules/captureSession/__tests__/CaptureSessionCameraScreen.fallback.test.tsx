import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockGoToHybridLibrary = jest.fn();
const mockProbeCameraAvailable = jest.fn(async () => true);
const mockGetCameraPermissions = jest.fn(async () => ({
  granted: false,
  status: "undetermined",
  canAskAgain: true,
}));

jest.mock("expo-camera", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Camera: {
      getCameraPermissionsAsync: (...args: unknown[]) =>
        mockGetCameraPermissions(...args),
      requestCameraPermissionsAsync: jest.fn(async () => ({
        granted: true,
        status: "granted",
        canAskAgain: true,
      })),
    },
    CameraView: React.forwardRef(() =>
      React.createElement(View, { testID: "mock-camera-view" }),
    ),
  };
});

jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { Image: (props: { testID?: string }) => React.createElement(View, props) };
});

jest.mock("expo-media-library", () => ({
  SortBy: { creationTime: "creationTime" },
  MediaType: { photo: "photo" },
  getPermissionsAsync: jest.fn(async () => ({ granted: false })),
  getAssetsAsync: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("../../../utils/libraryCapturePrefetch", () => ({
  startLibraryCapturePrefetch: jest.fn(),
}));

jest.mock("../../../utils/libraryWarmPrefetch", () => ({
  warmLibraryFirstPage: jest.fn(async () => undefined),
  peekWarmLibraryThumbUri: jest.fn(() => null),
}));

jest.mock("../cameraAvailability", () => ({
  probeCameraAvailable: (...args: unknown[]) => mockProbeCameraAvailable(...args),
}));

import { CaptureSessionHostProvider } from "../CaptureSessionHostContext";
import { CaptureSessionCameraScreen } from "../CaptureSessionCameraScreen";
import {
  ensureCameraPermissionChecked,
  invalidateCameraPermissionCache,
} from "../../../utils/cameraPermission";

function renderCamera() {
  return render(
    <CaptureSessionHostProvider
      value={{
        onCancel: jest.fn(),
        onComplete: jest.fn(),
        selectionLimit: 20,
        goToHybridLibrary: mockGoToHybridLibrary,
        goToCamera: jest.fn(),
      }}
    >
      <CaptureSessionCameraScreen />
    </CaptureSessionHostProvider>,
  );
}

describe("CaptureSessionCameraScreen library fallback", () => {
  beforeEach(() => {
    invalidateCameraPermissionCache();
    mockGoToHybridLibrary.mockReset();
    mockProbeCameraAvailable.mockReset();
    mockProbeCameraAvailable.mockResolvedValue(true);
    mockGetCameraPermissions.mockReset();
    mockGetCameraPermissions.mockResolvedValue({
      granted: false,
      status: "undetermined",
      canAskAgain: true,
    });
  });

  it("offers Choose from library when camera permission is not granted", async () => {
    await ensureCameraPermissionChecked();
    const { getByTestId } = renderCamera();
    fireEvent.press(getByTestId("capture-session__open_library_fallback"));
    expect(mockGoToHybridLibrary).toHaveBeenCalledTimes(1);
  });

  it("opens the library when no camera is available", async () => {
    mockProbeCameraAvailable.mockResolvedValue(false);
    renderCamera();
    await waitFor(() => {
      expect(mockGoToHybridLibrary).toHaveBeenCalledTimes(1);
    });
  });

  it("shows camera chrome while permission status is still loading", () => {
    mockGetCameraPermissions.mockReturnValue(new Promise(() => undefined));
    const { getByTestId, queryByTestId } = renderCamera();
    expect(getByTestId("capture-session__camera")).toBeTruthy();
    expect(queryByTestId("mock-camera-view")).toBeNull();
  });
});
