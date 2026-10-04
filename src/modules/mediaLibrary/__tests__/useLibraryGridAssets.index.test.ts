import { renderHook, waitFor } from "@testing-library/react-native";
import * as MediaLibrary from "expo-media-library";

import { invalidateMediaLibraryPermissionCache } from "@/utils/mediaLibraryPermission";
import { resetLibraryAlbumPickerMemory } from "../libraryAlbumPickerMemory";

const mockAwaitPhotokitLibraryIndex = jest.fn(async () => ({
  token: 3,
  count: 50000,
}));
const mockIs2bApi = jest.fn(() => true);
const mockIsIndexApi = jest.fn(() => true);

jest.mock("@/utils/libraryIndexPrefetch", () => ({
  awaitPhotokitLibraryIndex: (...args: unknown[]) =>
    mockAwaitPhotokitLibraryIndex(...args),
  peekPhotokitLibraryIndex: jest.fn(() => null),
  isPhotokitLibraryIndexPrefetchInFlight: jest.fn(() => false),
  requestPhotokitLibraryExpandIfScrolled: jest.fn(),
}));

jest.mock("expo-media-library", () => ({
  MediaType: { photo: "photo" },
  SortBy: { creationTime: "creationTime" },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAssetsAsync: jest.fn(),
  getAlbumsAsync: jest.fn(),
}));

jest.mock("../PhotokitThumbView", () => ({
  isPhotokitLibraryIndexAvailable: () => mockIsIndexApi(),
  isPhotokitLibrary2bAvailable: () => mockIs2bApi(),
}));

import { useLibraryGridAssets } from "../useLibraryGridAssets";

const mockGetAssetsAsync = MediaLibrary.getAssetsAsync as jest.Mock;
const mockGetPermissionsAsync = MediaLibrary.getPermissionsAsync as jest.Mock;

describe("useLibraryGridAssets Photos index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLibraryAlbumPickerMemory();
    invalidateMediaLibraryPermissionCache();
    mockGetPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      status: "granted",
    });
    mockIs2bApi.mockReturnValue(true);
    mockIsIndexApi.mockReturnValue(true);
    mockAwaitPhotokitLibraryIndex.mockResolvedValue({ token: 3, count: 50000 });
    mockGetAssetsAsync.mockResolvedValue({
      assets: [],
      endCursor: undefined,
      hasNextPage: false,
    });
  });

  it("passes a date window into the PhotoKit open", async () => {
    const { result } = renderHook(() =>
      useLibraryGridAssets({
        enabled: true,
        selectedAlbumId: "__all__",
        afterEpochSeconds: 100,
        beforeEpochSeconds: 200,
      }),
    );

    await waitFor(() => {
      expect(result.current.indexSession).toEqual({ token: 3, count: 50000 });
    });
    expect(mockAwaitPhotokitLibraryIndex).toHaveBeenCalledWith(
      null,
      false,
      100,
      200,
    );
    expect(mockGetAssetsAsync).not.toHaveBeenCalled();
  });

  it("opens a named album through PhotoKit", async () => {
    const { result } = renderHook(() =>
      useLibraryGridAssets({
        enabled: true,
        selectedAlbumId: "album-a",
      }),
    );

    await waitFor(() => {
      expect(result.current.indexSession).toEqual({ token: 3, count: 50000 });
    });
    expect(mockAwaitPhotokitLibraryIndex).toHaveBeenCalledWith(
      "album-a",
      false,
      null,
      null,
    );
    expect(mockGetAssetsAsync).not.toHaveBeenCalled();
  });

  it("uses the sorted PhotoKit open for oldest-first when the walk API is missing", async () => {
    mockIs2bApi.mockReturnValue(false);
    const { result } = renderHook(() =>
      useLibraryGridAssets({
        enabled: true,
        selectedAlbumId: "__all__",
        sortOrder: "ascending",
      }),
    );

    await waitFor(() => {
      expect(result.current.indexSession).toEqual({ token: 3, count: 50000 });
    });
    expect(mockAwaitPhotokitLibraryIndex).toHaveBeenCalledWith(
      null,
      true,
      null,
      null,
    );
    expect(mockGetAssetsAsync).not.toHaveBeenCalled();
  });
});
