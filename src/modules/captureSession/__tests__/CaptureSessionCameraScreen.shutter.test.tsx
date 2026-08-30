import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

const mockTakePictureAsync = jest.fn();
const mockPinDraftMedia = jest.fn();
const mockGoToHybridLibrary = jest.fn();

jest.mock("expo-camera", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Camera: {
      getCameraPermissionsAsync: jest.fn(async () => ({
        granted: true,
        status: "granted",
        canAskAgain: true,
      })),
      requestCameraPermissionsAsync: jest.fn(async () => ({
        granted: true,
        status: "granted",
        canAskAgain: true,
      })),
    },
    CameraView: React.forwardRef((_props: unknown, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({
        takePictureAsync: mockTakePictureAsync,
      }));
      return React.createElement(View, { testID: "mock-camera-view" });
    }),
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

jest.mock("../../../utils/draftMediaCache", () => ({
  pinDraftMedia: (...args: unknown[]) => mockPinDraftMedia(...args),
}));

jest.mock("../../../utils/libraryCapturePrefetch", () => ({
  startLibraryCapturePrefetch: jest.fn(),
}));

jest.mock("../../../utils/libraryWarmPrefetch", () => ({
  warmLibraryFirstPage: jest.fn(async () => undefined),
  peekWarmLibraryThumbUri: jest.fn(() => null),
}));

import { CaptureSessionHostProvider } from "../CaptureSessionHostContext";
import { CaptureSessionCameraScreen } from "../CaptureSessionCameraScreen";
import {
  resetCaptureSession,
  useCaptureSessionStore,
} from "../sessionDraftStore";
import { resetCameraDraftPinQueueForTests } from "../cameraDraftPinQueue";
import {
  ensureCameraPermissionChecked,
  invalidateCameraPermissionCache,
} from "../../../utils/cameraPermission";

describe("CaptureSessionCameraScreen shutter C2", () => {
  beforeEach(async () => {
    invalidateCameraPermissionCache();
    await ensureCameraPermissionChecked();
    resetCameraDraftPinQueueForTests();
    resetCaptureSession();
    useCaptureSessionStore.getState().setSelectionLimit(20);
    mockGoToHybridLibrary.mockReset();
    mockTakePictureAsync.mockReset();
    mockPinDraftMedia.mockReset();
    mockPinDraftMedia.mockReturnValue(new Promise(() => undefined));
  });

  it("allows a second shot while the first pin is still pending", async () => {
    mockTakePictureAsync
      .mockResolvedValueOnce({ uri: "file://cache-1.jpg" })
      .mockResolvedValueOnce({ uri: "file://cache-2.jpg" });

    const { getByTestId } = render(
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

    await act(async () => {
      fireEvent.press(getByTestId("capture-session__shutter"));
    });
    await waitFor(() => {
      expect(useCaptureSessionStore.getState().photos).toHaveLength(1);
    });

    await act(async () => {
      fireEvent.press(getByTestId("capture-session__shutter"));
    });
    await waitFor(() => {
      expect(useCaptureSessionStore.getState().photos).toHaveLength(2);
    });

    const uris = useCaptureSessionStore.getState().photos.map((p) => p.uri);
    expect(uris).toEqual(["file://cache-1.jpg", "file://cache-2.jpg"]);
    expect(mockPinDraftMedia).toHaveBeenCalledTimes(2);
    expect(mockGoToHybridLibrary).not.toHaveBeenCalled();
  });

  it("does not open the library while a take is in progress", async () => {
    let releaseTake!: (value: { uri: string }) => void;
    mockTakePictureAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseTake = resolve;
        }),
    );

    const { getByTestId } = render(
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

    fireEvent.press(getByTestId("capture-session__shutter"));
    fireEvent.press(getByTestId("capture-session__done"));
    fireEvent.press(getByTestId("capture-session__library_peek"));
    expect(mockGoToHybridLibrary).not.toHaveBeenCalled();

    await act(async () => {
      releaseTake({ uri: "file://cache-1.jpg" });
    });
    await waitFor(() => {
      expect(useCaptureSessionStore.getState().photos).toHaveLength(1);
    });
  });
});
