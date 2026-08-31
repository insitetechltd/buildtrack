import React from "react";
import { act, render } from "@testing-library/react-native";
import type * as MediaLibrary from "expo-media-library";

jest.mock("../PhotokitThumbView", () => ({
  isPhotokitThumbsAvailable: () => false,
  isPhotokitLibraryIndexAvailable: () => false,
  getPhotokitThumbNativeView: () => null,
  photokitIdAt: jest.fn(),
  startPhotokitThumbCaching: jest.fn(),
  startPhotokitRangeCaching: jest.fn(),
  stopPhotokitThumbCaching: jest.fn(),
}));

import { LibraryPhotoGrid } from "../LibraryPhotoGrid";

function asset(id: string): MediaLibrary.Asset {
  return {
    id,
    uri: `ph://${id}`,
    filename: `${id}.jpg`,
  } as MediaLibrary.Asset;
}

const emptyHandlers = {
  loadingPage: false,
  onEndReached: jest.fn(),
  selectedIds: new Set<string>(),
  selectionOrderByKey: new Map<string, number>(),
  onPressAsset: jest.fn(),
  testIdPrefix: "g",
  listTestID: "g-list",
};

describe("LibraryPhotoGrid L2 paint", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows placeholder skeletons before metadata arrives", () => {
    const { getAllByTestId, queryByTestId } = render(
      <LibraryPhotoGrid
        {...emptyHandlers}
        assets={[]}
        loadingPage
        placeholderCount={12}
      />,
    );

    expect(getAllByTestId(/g__tile_skeleton_/).length).toBe(12);
    expect(queryByTestId("g__tile_image_p0")).toBeNull();
  });

  it("binds the first bridge tile immediately, then staggers the rest", () => {
    const assets = Array.from({ length: 12 }, (_, i) => asset(`p${i}`));
    const { getByTestId, queryByTestId } = render(
      <LibraryPhotoGrid {...emptyHandlers} assets={assets} paintResetKey="all" />,
    );

    expect(getByTestId("g__tile_image_p0")).toBeTruthy();
    expect(getByTestId("g__tile_image_p1")).toBeTruthy();
    expect(queryByTestId("g__tile_image_p2")).toBeNull();
    expect(getByTestId("g__tile_skeleton_p2")).toBeTruthy();
  });

  it("unlocks the next tiles after the bridge paint interval", () => {
    const assets = Array.from({ length: 12 }, (_, i) => asset(`p${i}`));
    const { getByTestId, queryByTestId } = render(
      <LibraryPhotoGrid {...emptyHandlers} assets={assets} paintResetKey="all" />,
    );

    act(() => {
      jest.advanceTimersByTime(48 * 2);
    });

    expect(getByTestId("g__tile_image_p5")).toBeTruthy();
    expect(queryByTestId("g__tile_image_p6")).toBeNull();
  });
});
