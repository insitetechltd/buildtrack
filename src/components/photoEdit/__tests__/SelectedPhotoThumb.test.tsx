import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("@/modules/mediaLibrary/PhotokitThumbView", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    isPhotokitThumbsAvailable: () => true,
    getPhotokitThumbNativeView: () =>
      function MockPhotokitThumb({
        assetId,
        testID,
      }: {
        assetId?: string;
        testID?: string;
      }) {
        return React.createElement(View, {
          testID: testID ?? `native-thumb-${assetId}`,
        });
      },
  };
});

import { SelectedPhotoThumb } from "../SelectedPhotoThumb";

describe("SelectedPhotoThumb", () => {
  it("binds PhotoKit native thumbs for library ph:// instead of expo-image", () => {
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
    expect(screen.queryByTestId("select-thumb")?.props.source).toBeUndefined();
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
    expect(screen.getByTestId("camera-thumb")).toBeTruthy();
  });
});
