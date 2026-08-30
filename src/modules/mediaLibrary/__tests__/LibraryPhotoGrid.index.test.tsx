import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

const mockPhotokitIdAt = jest.fn((token: number, index: number) =>
  token > 0 ? `t${token}_${index}` : "",
);
const mockStartPhotokitRangeCaching = jest.fn();

jest.mock("../PhotokitThumbView", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    isPhotokitThumbsAvailable: () => true,
    isPhotokitLibraryIndexAvailable: () => true,
    photokitIdAt: (token: number, index: number) => mockPhotokitIdAt(token, index),
    startPhotokitRangeCaching: (
      token: number,
      from: number,
      to: number,
      pixelSize: number,
    ) => mockStartPhotokitRangeCaching(token, from, to, pixelSize),
    startPhotokitThumbCaching: jest.fn(),
    stopPhotokitThumbCaching: jest.fn(),
    getPhotokitThumbNativeView: () =>
      function MockPhotokitThumb({
        assetId,
        index,
        testID,
        onPainted,
      }: {
        assetId?: string;
        index?: number;
        testID?: string;
        onPainted?: () => void;
      }) {
        React.useEffect(() => {
          onPainted?.();
        }, [assetId, index, onPainted]);
        return React.createElement(View, { testID });
      },
  };
});

import { LibraryPhotoGrid } from "../LibraryPhotoGrid";

describe("LibraryPhotoGrid Photos index", () => {
  beforeEach(() => {
    mockPhotokitIdAt.mockClear();
    mockStartPhotokitRangeCaching.mockClear();
  });

  it("progressively binds native thumbs through the first screen and p2 wave", () => {
    jest.useFakeTimers();
    const { getByTestId, queryByTestId } = render(
      <LibraryPhotoGrid
        assets={[]}
        indexSession={{ token: 7, count: 40 }}
        loadingPage
        onEndReached={jest.fn()}
        selectedIds={new Set()}
        selectionOrderByKey={new Map()}
        onPressAsset={jest.fn()}
        testIdPrefix="g"
        paintResetKey="all:7"
      />,
    );

    expect(getByTestId("g__tile_image_t7_0")).toBeTruthy();
    expect(queryByTestId("g__tile_image_t7_3")).toBeNull();

    act(() => {
      jest.advanceTimersByTime(32 * 8);
    });

    expect(getByTestId("g__tile_image_t7_11")).toBeTruthy();
    expect(getByTestId("g__tile_image_t7_17")).toBeTruthy();
    expect(queryByTestId("g__tile_image_t7_18")).toBeNull();

    const range = mockStartPhotokitRangeCaching.mock.calls[0];
    expect(range[0]).toBe(7);
    expect(range[1]).toBe(12);
    expect(range[2]).toBe(27);

    jest.useRealTimers();
  });

  it("resolves press via idAt", () => {
    const onPressAsset = jest.fn();
    const { getByTestId } = render(
      <LibraryPhotoGrid
        assets={[]}
        indexSession={{ token: 7, count: 40 }}
        loadingPage={false}
        onEndReached={jest.fn()}
        selectedIds={new Set()}
        selectionOrderByKey={new Map()}
        onPressAsset={onPressAsset}
        testIdPrefix="g"
        paintResetKey="all:7"
      />,
    );

    fireEvent.press(getByTestId("g__tile_t7_5"));
    expect(onPressAsset).toHaveBeenCalledWith("t7_5");
  });

  it("does not keep old album ids on the first render after token change", () => {
    const onPressAsset = jest.fn();
    const props = {
      assets: [] as const,
      loadingPage: false,
      onEndReached: jest.fn(),
      selectedIds: new Set<string>(),
      selectionOrderByKey: new Map<string, number>(),
      onPressAsset,
      testIdPrefix: "g",
    };
    const { getByTestId, queryByTestId, rerender } = render(
      <LibraryPhotoGrid
        {...props}
        indexSession={{ token: 7, count: 40 }}
        paintResetKey="all:7"
      />,
    );

    fireEvent.press(getByTestId("g__tile_t7_5"));
    expect(onPressAsset).toHaveBeenCalledWith("t7_5");
    onPressAsset.mockClear();

    rerender(
      <LibraryPhotoGrid
        {...props}
        indexSession={{ token: 9, count: 5 }}
        paintResetKey="small:9"
      />,
    );

    expect(getByTestId("g__tile_image_t9_0")).toBeTruthy();
    expect(queryByTestId("g__tile_image_t7_0")).toBeNull();
    expect(queryByTestId("g__tile_t7_5")).toBeNull();
    fireEvent.press(getByTestId("g__tile_t9_0"));
    expect(onPressAsset).toHaveBeenCalledWith("t9_0");
    expect(onPressAsset).not.toHaveBeenCalledWith("t7_0");
  });
});
