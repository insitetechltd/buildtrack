import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Image: ({ source, testID }: { source?: { uri?: string }; testID?: string }) =>
      React.createElement(View, { testID: testID ?? "expo-image", source }),
  };
});

jest.mock("@/modules/mediaLibrary/PhotokitThumbView", () => ({
  isPhotokitThumbsAvailable: () => true,
  getPhotokitThumbNativeView: () =>
    function MockPhotokitThumb() {
      return null;
    },
}));

import { SelectedPhotoThumb } from "../SelectedPhotoThumb";

describe("SelectedPhotoThumb", () => {
  it("does not bind expo-image or native thumbs for library ph:// without a preview", () => {
    const screen = render(
      <SelectedPhotoThumb
        testID="select-thumb"
        photo={{
          uri: "ph://ABC/L0/001",
          fileName: "a.jpg",
          mediaLibraryAssetId: "ABC/L0/001",
        }}
        width={120}
        height={120}
      />,
    );
    expect(screen.getByTestId("select-thumb")).toBeTruthy();
    expect(screen.queryByTestId("select-thumb__image")).toBeNull();
    expect(screen.queryByTestId("native-thumb-ABC/L0/001")).toBeNull();
  });

  it("paints Accept file:// preview with expo-image", () => {
    const screen = render(
      <SelectedPhotoThumb
        testID="select-thumb"
        photo={{
          uri: "ph://ABC/L0/001",
          fileName: "a.jpg",
          mediaLibraryAssetId: "ABC/L0/001",
          previewUri: "file:///tmp/preview.jpg",
        }}
        width={120}
        height={120}
      />,
    );
    expect(screen.getByTestId("select-thumb__image").props.source).toEqual({
      uri: "file:///tmp/preview.jpg",
    });
  });

  it("uses expo-image for camera file:// drafts", () => {
    const screen = render(
      <SelectedPhotoThumb
        testID="camera-thumb"
        photo={{
          uri: "file:///tmp/cam.jpg",
          fileName: "cam.jpg",
        }}
        width={120}
        height={120}
      />,
    );
    expect(screen.getByTestId("camera-thumb__image").props.source).toEqual({
      uri: "file:///tmp/cam.jpg",
    });
  });
});
