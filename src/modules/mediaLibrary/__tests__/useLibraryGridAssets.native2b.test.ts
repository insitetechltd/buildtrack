/**
 * Default album: limited index first; expand only after the user scrolls near the end.
 */
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as MediaLibrary from "expo-media-library";

import { invalidateMediaLibraryPermissionCache } from "@/utils/mediaLibraryPermission";
import { resetLibraryAlbumPickerMemory } from "../libraryAlbumPickerMemory";

const mockAwaitIndex = jest.fn();
const mockAwaitExpand = jest.fn();
const mockPeekIndex = jest.fn(() => null);
const mockIndexInFlight = jest.fn(() => false);
const mockRequestExpand = jest.fn();
const mockIs2bApi = jest.fn(() => true);
const mockIsIndexApi = jest.fn(() => true);

jest.mock("@/utils/libraryIndexPrefetch", () => ({
  awaitPhotokitLibraryIndex: (...args: unknown[]) => mockAwaitIndex(...args),
  awaitPhotokitLibraryExpand: (...args: unknown[]) => mockAwaitExpand(...args),
  peekPhotokitLibraryIndex: (...args: unknown[]) => mockPeekIndex(...args),
  isPhotokitLibraryIndexPrefetchInFlight: (...args: unknown[]) =>
    mockIndexInFlight(...args),
  requestPhotokitLibraryExpandIfScrolled: (...args: unknown[]) =>
    mockRequestExpand(...args),
}));

jest.mock("../PhotokitThumbView", () => ({
  isPhotokitLibraryIndexAvailable: () => mockIsIndexApi(),
  isPhotokitLibrary2bAvailable: () => mockIs2bApi(),
}));

jest.mock("expo-media-library", () => ({
  MediaType: { photo: "photo" },
  SortBy: { creationTime: "creationTime" },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAssetsAsync: jest.fn(),
  getAlbumsAsync: jest.fn(),
}));

import { useLibraryGridAssets } from "../useLibraryGridAssets";

const mockGetPermissionsAsync = MediaLibrary.getPermissionsAsync as jest.Mock;
const mockGetAssetsAsync = MediaLibrary.getAssetsAsync as jest.Mock;

describe("useLibraryGridAssets native2b limited-then-expand", () => {
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
    mockRequestExpand.mockImplementation(
      (
        _album: unknown,
        _token: unknown,
        _lastVisible: unknown,
        _count: unknown,
        _scrolled: unknown,
        onExpanded?: (session: { token: number; count: number }) => void,
      ) => {
        (
          globalThis as {
            __fireNative2bExpand?: (session: {
              token: number;
              count: number;
            }) => void;
          }
        ).__fireNative2bExpand = (session) => onExpanded?.(session);
      },
    );
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

  it("keeps gray tiles until the live walk resolves", async () => {
    const { result } = renderHook(() =>
      useLibraryGridAssets({
        enabled: true,
        selectedAlbumId: "__all__",
      }),
    );

    await waitFor(() => {
      expect(mockAwaitIndex).toHaveBeenCalled();
    });
    expect(result.current.assets).toHaveLength(0);
    expect(result.current.indexSession).toBeNull();
    expect(result.current.initialLoadDone).toBe(false);
    expect(mockGetAssetsAsync).not.toHaveBeenCalled();

    await act(async () => {
      (globalThis as { __releaseIndex?: () => void }).__releaseIndex?.();
    });

    await waitFor(() => {
      expect(result.current.indexSession).toEqual({ token: 9, count: 30 });
    });
    expect(mockRequestExpand).not.toHaveBeenCalled();
    expect(mockAwaitExpand).not.toHaveBeenCalled();
    expect(mockGetAssetsAsync).not.toHaveBeenCalled();

    await act(async () => {
      result.current.onIndexNearEnd(28, true);
    });
    expect(mockRequestExpand).toHaveBeenCalledWith(
      null,
      9,
      28,
      30,
      true,
      expect.any(Function),
      false,
      null,
      null,
    );

    await act(async () => {
      (
        globalThis as {
          __fireNative2bExpand?: (session: {
            token: number;
            count: number;
          }) => void;
        }
      ).__fireNative2bExpand?.({ token: 9, count: 1200 });
    });

    await waitFor(() => {
      expect(result.current.indexSession).toEqual({ token: 9, count: 1200 });
    });
  });

  it("stays empty when the live walk returns nothing", async () => {
    mockAwaitIndex.mockResolvedValue(null);
    const { result } = renderHook(() =>
      useLibraryGridAssets({
        enabled: true,
        selectedAlbumId: "__all__",
      }),
    );
    await waitFor(() => {
      expect(result.current.initialLoadDone).toBe(true);
    });
    expect(result.current.assets).toHaveLength(0);
    expect(result.current.indexSession).toBeNull();
    expect(mockGetAssetsAsync).not.toHaveBeenCalled();
  });

  it("stays empty when the native walk API is missing", async () => {
    mockIs2bApi.mockReturnValue(false);
    const { result } = renderHook(() =>
      useLibraryGridAssets({
        enabled: true,
        selectedAlbumId: "__all__",
      }),
    );
    await waitFor(() => {
      expect(result.current.initialLoadDone).toBe(true);
    });
    expect(result.current.assets).toHaveLength(0);
    expect(mockAwaitIndex).not.toHaveBeenCalled();
    expect(mockGetAssetsAsync).not.toHaveBeenCalled();
  });

  it("reopens the index when the album sort changes to oldest first", async () => {
    mockIs2bApi.mockReturnValue(true);
    mockAwaitIndex.mockReset();
    mockAwaitIndex.mockResolvedValue({ token: 3, count: 50000 });
    const { result, rerender } = renderHook(
      (props: { sortOrder: "descending" | "ascending" }) =>
        useLibraryGridAssets({
          enabled: true,
          selectedAlbumId: "__all__",
          sortOrder: props.sortOrder,
        }),
      { initialProps: { sortOrder: "descending" as const } },
    );

    await waitFor(() => {
      expect(result.current.indexSession).toEqual({ token: 3, count: 50000 });
    });
    expect(mockAwaitIndex).toHaveBeenCalledWith(null, false, null, null);
    expect(mockGetAssetsAsync).not.toHaveBeenCalled();

    mockAwaitIndex.mockResolvedValue({ token: 9, count: 12 });
    rerender({ sortOrder: "ascending" });

    await waitFor(() => {
      expect(result.current.indexSession).toEqual({ token: 9, count: 12 });
    });
    expect(mockAwaitIndex).toHaveBeenCalledWith(null, true, null, null);
    expect(mockGetAssetsAsync).not.toHaveBeenCalled();
  });

  it("loads MediaLibrary pages when the PhotoKit module is missing", async () => {
    mockIsIndexApi.mockReturnValue(false);
    mockGetAssetsAsync.mockResolvedValue({
      assets: [{ id: "a", uri: "ph://a", filename: "a.jpg" }],
      endCursor: undefined,
      hasNextPage: false,
    });
    const { result } = renderHook(() =>
      useLibraryGridAssets({
        enabled: true,
        selectedAlbumId: "__all__",
      }),
    );
    await waitFor(() => {
      expect(result.current.initialLoadDone).toBe(true);
    });
    expect(mockAwaitIndex).not.toHaveBeenCalled();
    expect(mockGetAssetsAsync).toHaveBeenCalled();
    expect(result.current.assets.map((asset) => asset.id)).toEqual(["a"]);
  });
});
