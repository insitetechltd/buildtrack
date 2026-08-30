import React from "react";
import { act, render } from "@testing-library/react-native";
import type * as MediaLibrary from "expo-media-library";

jest.mock("../PhotokitThumbView", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    isPhotokitThumbsAvailable: () => true,
    getPhotokitThumbNativeView: () =>
      function MockPhotokitThumb({
        assetId,
        testID,
        onPainted,
      }: {
        assetId: string;
        testID?: string;
        onPainted?: () => void;
      }) {
        React.useEffect(() => {
          onPainted?.();
        }, [assetId, onPainted]);
        return React.createElement(View, { testID });
      },
    startPhotokitThumbCaching: jest.fn(),
    startPhotokitRangeCaching: jest.fn(),
    stopPhotokitThumbCaching: jest.fn(),
    isPhotokitLibraryIndexAvailable: () => false,
    photokitIdAt: jest.fn(),
  };
});

import { LibraryPhotoGrid } from "../LibraryPhotoGrid";
import { startPhotokitThumbCaching } from "../PhotokitThumbView";

function asset(id: string): MediaLibrary.Asset {
  return {
    id,
    uri: `ph://${id}`,
    filename: `${id}.jpg`,
  } as MediaLibrary.Asset;
}

describe("LibraryPhotoGrid L3 native thumbs", () => {
  beforeEach(() => {
    (startPhotokitThumbCaching as jest.Mock).mockClear();
  });

  it("progressively binds native bridge thumbs", () => {
    jest.useFakeTimers();
    const assets = Array.from({ length: 12 }, (_, i) => asset(`p${i}`));
    const { getByTestId, queryByTestId } = render(
      <LibraryPhotoGrid
        assets={assets}
        loadingPage={false}
        onEndReached={jest.fn()}
        selectedIds={new Set()}
        selectionOrderByKey={new Map()}
        onPressAsset={jest.fn()}
        testIdPrefix="g"
        paintResetKey="all"
      />,
    );

    expect(getByTestId("g__tile_image_p0")).toBeTruthy();
    expect(queryByTestId("g__tile_image_p1")).toBeNull();

    act(() => {
      jest.advanceTimersByTime(450 * 12);
    });

    expect(getByTestId("g__tile_image_p11")).toBeTruthy();
    expect(startPhotokitThumbCaching).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("caches page-2 IDs without binding them until viewable", () => {
    jest.useFakeTimers();
    const assets = Array.from({ length: 30 }, (_, i) => asset(`p${i}`));
    const { getByTestId, queryByTestId } = render(
      <LibraryPhotoGrid
        assets={assets}
        loadingPage={false}
        onEndReached={jest.fn()}
        selectedIds={new Set()}
        selectionOrderByKey={new Map()}
        onPressAsset={jest.fn()}
        testIdPrefix="g"
        paintResetKey="all"
      />,
    );

    expect(getByTestId("g__tile_image_p0")).toBeTruthy();
    expect(queryByTestId("g__tile_image_p1")).toBeNull();

    const cached = (startPhotokitThumbCaching as jest.Mock).mock.calls[0][0] as string[];
    expect(cached[0]).toBe("p12");
    expect(cached).not.toContain("p0");
    jest.useRealTimers();
  });
});
