/**
 * native2b: warm bridge paints before limited index resolves.
 */
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as MediaLibrary from "expo-media-library";

import { invalidateMediaLibraryPermissionCache } from "@/utils/mediaLibraryPermission";

const mockAwaitIndex = jest.fn();
const mockAwaitExpand = jest.fn();
const mockPeekIndex = jest.fn(() => null);
const mockIndexInFlight = jest.fn(() => false);
const mockIs2b = jest.fn(() => true);
const mockIs2bApi = jest.fn(() => true);
const mockIsIndexApi = jest.fn(() => true);

jest.mock("@/utils/libraryIndexPrefetch", () => ({
  awaitPhotokitLibraryIndex: (...args: unknown[]) => mockAwaitIndex(...args),
  awaitPhotokitLibraryExpand: (...args: unknown[]) => mockAwaitExpand(...args),
  peekPhotokitLibraryIndex: (...args: unknown[]) => mockPeekIndex(...args),
  isPhotokitLibraryIndexPrefetchInFlight: (...args: unknown[]) =>
    mockIndexInFlight(...args),
}));

jest.mock("@/utils/libraryPickerPerf", () => ({
  isLibraryPickerNative2b: () => mockIs2b(),
}));

jest.mock("../PhotokitThumbView", () => ({
  isPhotokitLibraryIndexAvailable: () => mockIsIndexApi(),
  isPhotokitLibrary2bAvailable: () => mockIs2bApi(),
  previewPhotokitNewestIds: jest.fn(async () => []),
}));

jest.mock("expo-media-library", () => ({
  MediaType: { photo: "photo" },
  SortBy: { creationTime: "creationTime" },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAssetsAsync: jest.fn(),
  getAlbumsAsync: jest.fn(),
}));

const mockPeekWarm = jest.fn();
const mockConsumeWarm = jest.fn();
const mockAwaitWarm = jest.fn(async () => null);
const mockWarmInFlight = jest.fn(() => false);

jest.mock("@/utils/libraryWarmPrefetch", () => ({
  peekWarmLibraryPage: (...args: unknown[]) => mockPeekWarm(...args),
  consumeWarmLibraryPageAsync: (...args: unknown[]) => mockConsumeWarm(...args),
  consumeWarmLibraryPage: jest.fn(() => null),
  awaitWarmLibraryPage: (...args: unknown[]) => mockAwaitWarm(...args),
  isWarmLibraryPrefetchInFlight: (...args: unknown[]) => mockWarmInFlight(...args),
}));

import { useLibraryGridAssets } from "../useLibraryGridAssets";

const mockGetPermissionsAsync = MediaLibrary.getPermissionsAsync as jest.Mock;

describe("useLibraryGridAssets native2b warm-then-index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateMediaLibraryPermissionCache();
    mockGetPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      status: "granted",
    });
    mockIs2b.mockReturnValue(true);
    mockIs2bApi.mockReturnValue(true);
    mockIsIndexApi.mockReturnValue(true);
    mockPeekWarm.mockReturnValue({
      assets: [
        {
          id: "warm0",
          uri: "ph://warm0",
          filename: "w0.jpg",
          mediaType: "photo",
        },
      ],
      endCursor: "c1",
      hasNextPage: true,
    });
    mockConsumeWarm.mockResolvedValue(null);
    let releaseIndex!: (v: { token: number; count: number }) => void;
    mockAwaitIndex.mockImplementation(
      () =>
        new Promise<{ token: number; count: number }>((resolve) => {
          releaseIndex = resolve;
        }),
    );
    (globalThis as { __releaseIndex?: typeof releaseIndex }).__releaseIndex =
      () => releaseIndex!({ token: 9, count: 30 });
    mockAwaitExpand.mockResolvedValue({ token: 9, count: 1200 });
  });

  it("exposes warm bridge assets before limited index resolves", async () => {
    const { result } = renderHook(() =>
      useLibraryGridAssets({
        enabled: true,
        selectedAlbumId: "__all__",
        consumeWarmPage: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.assets.length).toBeGreaterThan(0);
      expect(result.current.initialLoadDone).toBe(true);
    });
    expect(result.current.indexSession).toBeNull();
    expect(result.current.assets[0]?.id).toBe("warm0");

    await act(async () => {
      (globalThis as { __releaseIndex?: () => void }).__releaseIndex?.();
    });

    await waitFor(() => {
      expect(result.current.indexSession?.token).toBe(9);
      expect(result.current.indexSession?.count).toBeGreaterThanOrEqual(30);
    });
    expect(mockAwaitExpand).toHaveBeenCalledWith(null, 9);
    await waitFor(() => {
      expect(result.current.indexSession).toEqual({ token: 9, count: 1200 });
    });
  });
});