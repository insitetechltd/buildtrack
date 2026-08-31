import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as MediaLibrary from "expo-media-library";

import { invalidateMediaLibraryPermissionCache } from "@/utils/mediaLibraryPermission";
import { resetLibraryAlbumPickerMemory } from "../libraryAlbumPickerMemory";
import { useLibraryGridAssets } from "../useLibraryGridAssets";

jest.mock("expo-media-library", () => ({
  MediaType: { photo: "photo" },
  SortBy: { creationTime: "creationTime" },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAssetsAsync: jest.fn(),
  getAlbumsAsync: jest.fn(),
}));

jest.mock("@/utils/libraryWarmPrefetch", () => ({
  consumeWarmLibraryPage: jest.fn(() => null),
  consumeWarmLibraryPageAsync: jest.fn(async () => null),
}));

const mockGetAssetsAsync = MediaLibrary.getAssetsAsync as jest.Mock;
const mockGetPermissionsAsync = MediaLibrary.getPermissionsAsync as jest.Mock;

function asset(id: string) {
  return { id, uri: `ph://${id}`, filename: `${id}.jpg` };
}

function page(ids: string[], endCursor: string, hasNextPage: boolean) {
  return {
    assets: ids.map(asset),
    endCursor,
    hasNextPage,
  };
}

describe("useLibraryGridAssets first screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLibraryAlbumPickerMemory();
    invalidateMediaLibraryPermissionCache();
    mockGetPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      status: "granted",
    });
  });

  it("loads one screen (12) then auto-chains one scroll-buffer page of 18", async () => {
    const first = Array.from({ length: 12 }, (_, i) => `p${i}`);
    const second = Array.from({ length: 18 }, (_, i) => `q${i}`);
    mockGetAssetsAsync
      .mockResolvedValueOnce(page(first, "c1", true))
      .mockResolvedValueOnce(page(second, "c2", true));

    const { result } = renderHook(() =>
      useLibraryGridAssets({
        enabled: true,
        selectedAlbumId: "__all__",
        consumeWarmPage: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.assets).toHaveLength(30);
      expect(result.current.initialLoadDone).toBe(true);
    });
    expect(mockGetAssetsAsync).toHaveBeenCalledTimes(2);
    expect(mockGetAssetsAsync.mock.calls[0][0].first).toBe(12);
    expect(mockGetAssetsAsync.mock.calls[1][0].first).toBe(18);
    expect(mockGetAssetsAsync.mock.calls[1][0].after).toBe("c1");
  });

  it("loads another 18 onEndReached after the scroll-buffer page", async () => {
    const first = Array.from({ length: 12 }, (_, i) => `a${i}`);
    const buffer = Array.from({ length: 18 }, (_, i) => `b${i}`);
    const third = Array.from({ length: 18 }, (_, i) => `c${i}`);
    mockGetAssetsAsync
      .mockResolvedValueOnce(page(first, "c1", true))
      .mockResolvedValueOnce(page(buffer, "c2", true))
      .mockResolvedValueOnce(page(third, "c3", true));

    const { result } = renderHook(() =>
      useLibraryGridAssets({
        enabled: true,
        selectedAlbumId: "__all__",
        consumeWarmPage: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.assets).toHaveLength(30);
      expect(result.current.loadingPage).toBe(false);
    });

    await act(async () => {
      result.current.onEndReached();
    });

    await waitFor(() => {
      expect(result.current.assets).toHaveLength(48);
    });
    expect(mockGetAssetsAsync.mock.calls[2][0].first).toBe(18);
  });
});
