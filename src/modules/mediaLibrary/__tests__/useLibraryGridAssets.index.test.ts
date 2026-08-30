import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as MediaLibrary from "expo-media-library";

import { invalidateMediaLibraryPermissionCache } from "@/utils/mediaLibraryPermission";
import {
  consumeWarmLibraryPageAsync,
  peekWarmLibraryPage,
} from "@/utils/libraryWarmPrefetch";
import { isPhotokitLibraryIndexPrefetchInFlight } from "@/utils/libraryIndexPrefetch";

const mockAwaitPhotokitLibraryIndex = jest.fn(async () => ({
  token: 3,
  count: 50000,
}));
const mockPreviewNewestIds = jest.fn(async () =>
  Array.from({ length: 30 }, (_, i) => `n${i}`),
);

jest.mock("@/utils/libraryIndexPrefetch", () => ({
  awaitPhotokitLibraryIndex: (...args: unknown[]) =>
    mockAwaitPhotokitLibraryIndex(...args),
  peekPhotokitLibraryIndex: jest.fn(() => null),
  isPhotokitLibraryIndexPrefetchInFlight: jest.fn(() => false),
}));

jest.mock("expo-media-library", () => ({
  MediaType: { photo: "photo" },
  SortBy: { creationTime: "creationTime" },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAssetsAsync: jest.fn(),
  getAlbumsAsync: jest.fn(),
}));

jest.mock("@/utils/libraryWarmPrefetch", () => ({
  consumeWarmLibraryPageAsync: jest.fn(async () => ({
    assets: [{ id: "warm", uri: "ph://warm", filename: "warm.jpg" }],
    endCursor: "w1",
    hasNextPage: true,
  })),
  peekWarmLibraryPage: jest.fn(() => null),
  awaitWarmLibraryPage: jest.fn(async () => null),
}));

jest.mock("../PhotokitThumbView", () => ({
  isPhotokitLibraryIndexAvailable: () => true,
  previewPhotokitNewestIds: (...args: unknown[]) =>
    mockPreviewNewestIds(...args),
}));

import { useLibraryGridAssets } from "../useLibraryGridAssets";

const mockGetAssetsAsync = MediaLibrary.getAssetsAsync as jest.Mock;
const mockGetPermissionsAsync = MediaLibrary.getPermissionsAsync as jest.Mock;
const mockConsumeWarm = consumeWarmLibraryPageAsync as jest.Mock;
const mockPeekWarm = peekWarmLibraryPage as jest.Mock;
const mockIndexInFlight = isPhotokitLibraryIndexPrefetchInFlight as jest.Mock;

describe("useLibraryGridAssets Photos index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateMediaLibraryPermissionCache();
    mockGetPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      status: "granted",
    });
    mockAwaitPhotokitLibraryIndex.mockResolvedValue({ token: 3, count: 50000 });
    mockPreviewNewestIds.mockResolvedValue(
      Array.from({ length: 30 }, (_, i) => `n${i}`),
    );
    mockConsumeWarm.mockResolvedValue({
      assets: [{ id: "warm", uri: "ph://warm", filename: "warm.jpg" }],
      endCursor: "w1",
      hasNextPage: true,
    });
    mockPeekWarm.mockReturnValue(null);
    mockIndexInFlight.mockReturnValue(false);
    mockGetAssetsAsync.mockResolvedValue({
      assets: [],
      endCursor: undefined,
      hasNextPage: false,
    });
  });

  it("uses warm bridge then prefetched index without preview", async () => {
    const { result } = renderHook(() =>
      useLibraryGridAssets({
        enabled: true,
        selectedAlbumId: "__all__",
        consumeWarmPage: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.indexSession).toEqual({ token: 3, count: 50000 });
      expect(result.current.initialLoadDone).toBe(true);
    });
    expect(mockPreviewNewestIds).not.toHaveBeenCalled();
    expect(mockAwaitPhotokitLibraryIndex).toHaveBeenCalledWith(null);
    expect(result.current.assets).toHaveLength(0);

    await act(async () => {
      result.current.onEndReached();
    });
    const callsAfterIndex = mockGetAssetsAsync.mock.calls.length;
    await act(async () => {
      result.current.onEndReached();
    });
    expect(mockGetAssetsAsync).toHaveBeenCalledTimes(callsAfterIndex);
  });

  it("paints preview bridge before awaiting prefetched index when warm is empty", async () => {
    mockConsumeWarm.mockResolvedValue(null);
    mockPeekWarm.mockReturnValue(null);
    const order: string[] = [];
    mockPreviewNewestIds.mockImplementation(async () => {
      order.push("preview");
      return Array.from({ length: 30 }, (_, i) => `n${i}`);
    });
    mockAwaitPhotokitLibraryIndex.mockImplementation(async () => {
      order.push("index");
      return { token: 4, count: 50000 };
    });

    const { result } = renderHook(() =>
      useLibraryGridAssets({
        enabled: true,
        selectedAlbumId: "__all__",
        consumeWarmPage: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.indexSession).toEqual({ token: 4, count: 50000 });
    });
    expect(order).toEqual(["preview", "index"]);
    expect(mockGetAssetsAsync).not.toHaveBeenCalled();
  });

  it("never loadPage fallback while index prefetch is in flight", async () => {
    mockConsumeWarm.mockResolvedValue(null);
    mockPeekWarm.mockReturnValue(null);
    mockIndexInFlight.mockReturnValue(true);

    const { result } = renderHook(() =>
      useLibraryGridAssets({
        enabled: true,
        selectedAlbumId: "__all__",
        consumeWarmPage: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.indexSession).toEqual({ token: 3, count: 50000 });
    });
    expect(mockPreviewNewestIds).not.toHaveBeenCalled();
    expect(mockGetAssetsAsync).not.toHaveBeenCalled();
  });
});
