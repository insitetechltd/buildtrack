/**
 * Focused Jest for Phase B in-picker chrome (UI-09 amend).
 * Device taps remain Maestro; this covers select badge / tray remove / filter apply /
 * crop+draw control visibility with mocked assets.
 */
import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { LibraryFilterModal } from "../LibraryFilterModal";
import {
  LibraryFullscreenViewer,
  shouldPlaceFullscreenScroll,
} from "../LibraryFullscreenViewer";
import { LibrarySelectedTray } from "../LibrarySelectedTray";

jest.mock("expo-image", () => ({
  Image: "ExpoImage",
}));

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

jest.mock("react-native/Libraries/Modal/Modal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: function MockModal(props: {
      children?: React.ReactNode;
      visible?: boolean;
    }) {
      if (props.visible === false) return null;
      return React.createElement(View, { testID: "MockModal" }, props.children);
    },
  };
});

jest.mock("../../../components/photoEdit/DrawOverlay", () => ({
  DrawOverlay: "DrawOverlay",
}));

jest.mock("../../../components/photoEdit/CropOverlay", () => ({
  CropOverlay: "CropOverlay",
}));

jest.mock("../PhotokitThumbView", () => ({
  isPhotokitThumbsAvailable: () => false,
  getPhotokitThumbNativeView: () => null,
  photokitIdAt: () => null,
}));

const sampleAsset = {
  id: "asset-1",
  uri: "ph://asset-1",
  filename: "site.jpg",
  mediaType: "photo",
  width: 100,
  height: 100,
  creationTime: 0,
  modificationTime: 0,
  duration: 0,
} as const;

describe("LibrarySelectedTray", () => {
  it("renders nothing when selection is empty", () => {
    const { queryByTestId } = render(
      <LibrarySelectedTray
        selectedAssets={[]}
        onRemove={jest.fn()}
        onDeselectAll={jest.fn()}
        testIdPrefix="tray"
      />,
    );
    expect(queryByTestId("tray__container")).toBeNull();
  });

  it("removes via badge control only (remove testID)", () => {
    const onRemove = jest.fn();
    const { getByTestId } = render(
      <LibrarySelectedTray
        selectedAssets={[
          { assetId: "asset-1", uri: "ph://asset-1", order: 1 },
        ]}
        onRemove={onRemove}
        onDeselectAll={jest.fn()}
        testIdPrefix="tray"
      />,
    );
    expect(getByTestId("tray__container")).toBeTruthy();
    fireEvent.press(getByTestId("tray__remove_asset-1"), {
      // RN Pressable may call e.stopPropagation in product code
      stopPropagation: jest.fn(),
    } as any);
    expect(onRemove).toHaveBeenCalledWith("asset-1");
  });
});

describe("LibraryFilterModal", () => {
  it("applies ascending sort via filter controls", () => {
    const onApply = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <LibraryFilterModal
        visible
        filterState={{ sortOrder: "descending", timeFilter: "all" }}
        onClose={onClose}
        onApply={onApply}
        testIdPrefix="filter"
      />,
    );

    fireEvent.press(getByTestId("filter__sort_ascending"));
    fireEvent.press(getByTestId("filter__apply"));

    expect(onApply).toHaveBeenCalledWith({
      sortOrder: "ascending",
      timeFilter: "all",
    });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("shouldPlaceFullscreenScroll", () => {
  it("places once per open and ignores later library growth", () => {
    expect(shouldPlaceFullscreenScroll(null, 4, 0)).toBe(false);
    expect(shouldPlaceFullscreenScroll(null, 4, 40)).toBe(true);
    expect(shouldPlaceFullscreenScroll("4", 4, 4000)).toBe(false);
    expect(shouldPlaceFullscreenScroll("4", 7, 4000)).toBe(true);
  });
});

describe("LibraryFullscreenViewer", () => {
  it("selects only via toggle badge and exposes crop/draw when onCommitEdit is set", () => {
    const onToggleSelect = jest.fn();
    const onClose = jest.fn();
    const onCommitEdit = jest.fn().mockResolvedValue(undefined);

    const { getByTestId, queryByTestId, rerender } = render(
      <LibraryFullscreenViewer
        visible
        initialIndex={0}
        assets={[sampleAsset as any]}
        selectedIds={new Set()}
        annotations={new Map()}
        onToggleSelect={onToggleSelect}
        onClose={onClose}
        onCommitEdit={onCommitEdit}
        testIdPrefix="viewer"
      />,
    );

    expect(getByTestId("viewer__fullscreen")).toBeTruthy();
    expect(getByTestId("viewer__start_crop")).toBeTruthy();
    expect(getByTestId("viewer__start_draw")).toBeTruthy();

    fireEvent.press(getByTestId("viewer__toggle_select"));
    expect(onToggleSelect).toHaveBeenCalledWith("asset-1");

    // Without onCommitEdit, edit tools stay hidden (select-only path).
    rerender(
      <LibraryFullscreenViewer
        visible
        initialIndex={0}
        assets={[sampleAsset as any]}
        selectedIds={new Set(["asset-1"])}
        annotations={new Map()}
        onToggleSelect={onToggleSelect}
        onClose={onClose}
        testIdPrefix="viewer"
      />,
    );
    expect(queryByTestId("viewer__start_crop")).toBeNull();
    expect(queryByTestId("viewer__start_draw")).toBeNull();
  });

  it("replaces picker chrome with the crop editor", () => {
    const { getByTestId, queryByTestId } = render(
      <LibraryFullscreenViewer
        visible
        initialIndex={0}
        assets={[sampleAsset as any]}
        selectedIds={new Set()}
        annotations={new Map()}
        onToggleSelect={jest.fn()}
        onClose={jest.fn()}
        onCommitEdit={jest.fn().mockResolvedValue(undefined)}
        testIdPrefix="viewer"
      />,
    );

    fireEvent.press(getByTestId("viewer__start_crop"));

    expect(queryByTestId("viewer__close")).toBeNull();
    expect(queryByTestId("viewer__toggle_select")).toBeNull();
    expect(queryByTestId("viewer__fullscreen")).toBeTruthy();
  });
});
