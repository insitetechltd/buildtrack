import React from "react";
import { StyleSheet } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";

const mockWarmLibraryFirstPage = jest.fn(async () => undefined);

jest.mock("../../../utils/libraryWarmPrefetch", () => ({
  warmLibraryFirstPage: (...args: unknown[]) => mockWarmLibraryFirstPage(...args),
}));

jest.mock("../CaptureSessionCameraScreen", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  const { useCaptureSessionHost } = require("../CaptureSessionHostContext");
  return {
    CaptureSessionCameraScreen: () => {
      const { goToHybridLibrary } = useCaptureSessionHost();
      return React.createElement(
        View,
        { testID: "capture-session__camera" },
        React.createElement(
          Pressable,
          { testID: "capture-session__library_peek", onPress: goToHybridLibrary },
          React.createElement(Text, null, "peek"),
        ),
      );
    },
  };
});

jest.mock("../HybridLibraryPickerScreen", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  const { useCaptureSessionHost } = require("../CaptureSessionHostContext");
  return {
    HybridLibraryPickerScreen: () => {
      const { goToCamera } = useCaptureSessionHost();
      return React.createElement(
        View,
        { testID: "capture-session__hybrid_library" },
        React.createElement(
          Pressable,
          { testID: "capture-session__hybrid_back", onPress: goToCamera },
          React.createElement(Text, null, "back"),
        ),
      );
    },
  };
});

import { CaptureSessionModule } from "../CaptureSessionModule";
import { resetCaptureSession } from "../sessionDraftStore";

describe("CaptureSessionModule C1 overlay", () => {
  beforeEach(() => {
    resetCaptureSession();
    mockWarmLibraryFirstPage.mockClear();
  });

  it("keeps the camera mounted under an opaque library overlay", () => {
    const { getByTestId, queryByTestId } = render(
      <CaptureSessionModule onCancel={jest.fn()} onComplete={jest.fn()} />,
    );

    expect(getByTestId("capture-session__camera")).toBeTruthy();
    expect(queryByTestId("capture-session__library_overlay")).toBeNull();

    fireEvent.press(getByTestId("capture-session__library_peek"));

    expect(
      getByTestId("capture-session__camera", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(getByTestId("capture-session__hybrid_library")).toBeTruthy();
    const overlay = getByTestId("capture-session__library_overlay");
    expect(overlay).toBeTruthy();
    const overlayStyle = StyleSheet.flatten(overlay.props.style);
    expect(overlayStyle.backgroundColor).toBe("#ffffff");
    expect(overlayStyle.zIndex).toBe(10);
    expect(overlayStyle.elevation).toBe(10);

    const cameraLayer = getByTestId("capture-session__camera_layer", {
      includeHiddenElements: true,
    });
    expect(cameraLayer.props.pointerEvents).toBe("none");
    expect(cameraLayer.props.accessibilityElementsHidden).toBe(true);
    expect(cameraLayer.props.importantForAccessibility).toBe(
      "no-hide-descendants",
    );
  });

  it("re-warms library metadata when returning to camera", () => {
    const { getByTestId, queryByTestId } = render(
      <CaptureSessionModule onCancel={jest.fn()} onComplete={jest.fn()} />,
    );

    fireEvent.press(getByTestId("capture-session__library_peek"));
    expect(getByTestId("capture-session__library_overlay")).toBeTruthy();

    act(() => {
      fireEvent.press(getByTestId("capture-session__hybrid_back"));
    });

    expect(queryByTestId("capture-session__library_overlay")).toBeNull();
    expect(getByTestId("capture-session__camera")).toBeTruthy();
    expect(getByTestId("capture-session__camera_layer").props.pointerEvents).toBe(
      "auto",
    );
    expect(mockWarmLibraryFirstPage).toHaveBeenCalled();
  });
});
