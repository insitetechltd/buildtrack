import React from "react";
import { act, render, waitFor, fireEvent } from "@testing-library/react-native";

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetAssetInfoAsync = jest.fn();
const mockGetAssetsAsync = jest.fn();
const mockGetAlbumsAsync = jest.fn();
const mockPinDraftMedia = jest.fn(async (uri: string) => `pinned:${uri}`);

jest.mock("expo-media-library", () => ({
  SortBy: {
    creationTime: "creationTime",
    modificationTime: "modificationTime",
  },
  MediaType: { photo: "photo" },
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissionsAsync(...args),
  requestPermissionsAsync: (...args: unknown[]) =>
    mockRequestPermissionsAsync(...args),
  getAssetInfoAsync: (...args: unknown[]) => mockGetAssetInfoAsync(...args),
  getAssetsAsync: (...args: unknown[]) => mockGetAssetsAsync(...args),
  getAlbumsAsync: (...args: unknown[]) => mockGetAlbumsAsync(...args),
}));

jest.mock("@/modules/mediaLibrary/LibraryAlbumPickerModal", () => ({
  LibraryAlbumPickerModal: () => null,
}));

jest.mock("@/modules/mediaLibrary/LibraryPhotoGrid", () => {
  const React = require("react");
  const { View, Pressable } = require("react-native");
  return {
    LibraryPhotoGrid: ({ ListHeaderComponent, onPressAsset }: any) =>
      React.createElement(
        View,
        { testID: "in-app-library__grid" },
        ListHeaderComponent,
        React.createElement(Pressable, {
          testID: "in-app-library__tile_asset-42",
          onPress: () => onPressAsset?.("asset-42"),
        }),
      ),
  };
});

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("../../utils/draftMediaCache", () => ({
  pinDraftMedia: (...args: unknown[]) => mockPinDraftMedia(...args),
}));

import InAppLibraryPickerScreen, {
  ensureMediaLibraryAccess,
} from "../InAppLibraryPickerScreen";
import { invalidateMediaLibraryPermissionCache } from "../../utils/mediaLibraryPermission";

const sampleAsset = {
  id: "asset-42",
  uri: "ph://asset-42",
  filename: "site.jpg",
};

describe("ensureMediaLibraryAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateMediaLibraryPermissionCache();
  });

  it("returns true when already granted without prompting", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
    await expect(ensureMediaLibraryAccess()).resolves.toBe(true);
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("requests permission when not granted and can ask again", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    mockRequestPermissionsAsync.mockResolvedValue({ granted: true });
    await expect(ensureMediaLibraryAccess()).resolves.toBe(true);
    expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it("returns false when permanently denied", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    await expect(ensureMediaLibraryAccess()).resolves.toBe(false);
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe("InAppLibraryPickerScreen permission gate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateMediaLibraryPermissionCache();
    mockGetAlbumsAsync.mockResolvedValue([]);
    mockGetAssetsAsync.mockResolvedValue({
      assets: [sampleAsset],
      endCursor: "cursor",
      hasNextPage: false,
    });
  });

  it("shows skeleton grid chrome while permission is pending and does not fetch assets yet", async () => {
    let resolveRequest: (value: { granted: boolean }) => void = () => {};
    mockGetPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    mockRequestPermissionsAsync.mockImplementation(
      () =>
        new Promise<{ granted: boolean }>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const { queryByTestId, getByTestId } = render(
      <InAppLibraryPickerScreen onCancel={jest.fn()} onSave={jest.fn()} />,
    );

    expect(getByTestId("in-app-library__screen")).toBeTruthy();
    expect(getByTestId("in-app-library__grid")).toBeTruthy();
    expect(queryByTestId("in-app-library__loading")).toBeNull();
    expect(queryByTestId("in-app-library__permission_denied")).toBeNull();
    expect(mockGetAssetsAsync).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockRequestPermissionsAsync).toHaveBeenCalled();
    });

    await act(async () => {
      resolveRequest({ granted: true });
    });

    await waitFor(() => {
      expect(mockGetAssetsAsync).toHaveBeenCalled();
    });
    expect(getByTestId("in-app-library__grid")).toBeTruthy();
    expect(getByTestId("in-app-library__screen")).toBeTruthy();
  });

  it("shows denied UI instead of a blank gallery when access is refused", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    const onCancel = jest.fn();

    const { findByTestId, queryByTestId } = render(
      <InAppLibraryPickerScreen onCancel={onCancel} onSave={jest.fn()} />,
    );

    expect(await findByTestId("in-app-library__permission_denied")).toBeTruthy();
    expect(queryByTestId("in-app-library__grid")).toBeNull();

    fireEvent.press(await findByTestId("in-app-library__permission_cancel"));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("InAppLibraryPickerScreen save / cancel (upload-flow handoff)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateMediaLibraryPermissionCache();
    mockGetPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
    mockGetAlbumsAsync.mockResolvedValue([]);
    mockGetAssetsAsync.mockResolvedValue({
      assets: [sampleAsset],
      endCursor: "cursor",
      hasNextPage: false,
    });
    mockGetAssetInfoAsync.mockResolvedValue({
      ...sampleAsset,
      localUri: "file:///tmp/site.jpg",
    });
  });

  it("pins library assets and passes mediaLibraryAssetId through onSave", async () => {
    const onSave = jest.fn();
    const { findByTestId } = render(
      <InAppLibraryPickerScreen onCancel={jest.fn()} onSave={onSave} />,
    );

    await findByTestId("in-app-library__grid");
    await waitFor(() => {
      expect(mockGetAssetsAsync).toHaveBeenCalled();
    });
    fireEvent.press(await findByTestId("in-app-library__tile_asset-42"));
    await act(async () => {
      fireEvent.press(await findByTestId("in-app-library__accept"));
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    expect(mockPinDraftMedia).toHaveBeenCalledWith("file:///tmp/site.jpg", "site.jpg");
    expect(onSave).toHaveBeenCalledWith([
      expect.objectContaining({
        uri: "pinned:file:///tmp/site.jpg",
        fileName: "site.jpg",
        mediaLibraryAssetId: "asset-42",
        isAnnotated: false,
      }),
    ]);
  });

  it("header Cancel forwards to onCancel (form reopen dismiss path)", async () => {
    const onCancel = jest.fn();
    const { findByTestId } = render(
      <InAppLibraryPickerScreen onCancel={onCancel} onSave={jest.fn()} />,
    );

    await findByTestId("in-app-library__screen");
    fireEvent.press(await findByTestId("in-app-library__cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("accepts preselected photos not present in the first paginated grid page", async () => {
    const preselectedAsset = {
      id: "asset-old-page-99",
      uri: "ph://asset-old-page-99",
      filename: "old-site.jpg",
    };
    const onSave = jest.fn();

    mockGetAssetsAsync.mockResolvedValue({
      assets: [sampleAsset],
      endCursor: "cursor",
      hasNextPage: true,
    });
    mockGetAssetInfoAsync.mockResolvedValue({
      ...preselectedAsset,
      localUri: "file:///tmp/old-site.jpg",
    });

    const { findByTestId } = render(
      <InAppLibraryPickerScreen
        onCancel={jest.fn()}
        onSave={onSave}
        initiallySelectedPhotos={[
          {
            uri: "pinned:file:///tmp/old-site.jpg",
            fileName: "old-site.jpg",
            isAnnotated: false,
            mediaLibraryAssetId: preselectedAsset.id,
          },
        ]}
      />,
    );

    await findByTestId("in-app-library__grid");
    await waitFor(() => {
      expect(mockGetAssetInfoAsync).toHaveBeenCalledWith(preselectedAsset.id);
    });

    await act(async () => {
      fireEvent.press(await findByTestId("in-app-library__accept"));
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    expect(onSave).toHaveBeenCalledWith([
      expect.objectContaining({
        fileName: "old-site.jpg",
        mediaLibraryAssetId: preselectedAsset.id,
        isAnnotated: false,
      }),
    ]);
    expect(mockPinDraftMedia).not.toHaveBeenCalled();
  });
});
