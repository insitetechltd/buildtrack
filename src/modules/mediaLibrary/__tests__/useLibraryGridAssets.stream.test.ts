import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as MediaLibrary from "expo-media-library";

import { invalidateMediaLibraryPermissionCache } from "@/utils/mediaLibraryPermission";
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
    invalidateMediaLibraryPermissionCache();
    mockGetPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      status: "granted",
    });
  });

  it("loads one screen (12) in the first PhotoKit request and does not auto-chain", async () => {
    const ids = Array.from({ length: 12 }, (_, i) => `p${i}`);
    mockGetAssetsAsync.mockResolvedValue(page(ids, "c1", true));

    const { result } = renderHook(() =>
      useLibraryGridAssets({
        enabled: true,
        selectedAlbumId: "__all__",
        consumeWarmPage: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.assets).toHaveLength(12);
      expect(result.current.initialLoadDone).toBe(true);
    });
    expect(mockGetAssetsAsync).toHaveBeenCalledTimes(1);
    expect(mockGetAssetsAsync.mock.calls[0][0].first).toBe(12);
  });

  it("does not let onEndReached fetch until the first screen is filled", async () => {
    mockGetAssetsAsync.mockResolvedValue(page(["a", "b", "c"], "c1", true));

    const { result } = renderHook(() =>
      useLibraryGridAssets({
        enabled: true,
        selectedAlbumId: "__all__",
        consumeWarmPage: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.assets.length).toBeGreaterThanOrEqual(3);
      expect(result.current.assets.length).toBeLessThan(12);
    });
    const callsBefore = mockGetAssetsAsync.mock.calls.length;
    act(() => {
      result.current.onEndReached();
    });
    expect(mockGetAssetsAsync.mock.calls.length).toBe(callsBefore);
  });

  it("loads 18 more when scrolling after the first screen", async () => {
    const first = Array.from({ length: 12 }, (_, i) => `a${i}`);
    const second = Array.from({ length: 18 }, (_, i) => `b${i}`);
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
      expect(result.current.assets).toHaveLength(12);
      expect(result.current.loadingPage).toBe(false);
    });

    await act(async () => {
      result.current.onEndReached();
    });

    await waitFor(() => {
      expect(result.current.assets).toHaveLength(30);
    });
    expect(mockGetAssetsAsync.mock.calls[1][0].first).toBe(18);
  });
});
