/**
 * native2b: limited index first; expand only after the user scrolls near the end.
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
const mockIs2b = jest.fn(() => true);
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
    mockIs2b.mockReturnValue(true);
    mockIs2bApi.mockReturnValue(true);
    mockIsIndexApi.mockReturnValue(true);
    mockPeekWarm.mockReturnValue(null);
    mockConsumeWarm.mockResolvedValue(null);
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

  it("peeks ready warm assets before limited index resolves", async () => {
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
    expect(mockConsumeWarm).not.toHaveBeenCalled();
    expect(mockAwaitWarm).not.toHaveBeenCalled();

    await act(async () => {
      (globalThis as { __releaseIndex?: () => void }).__releaseIndex?.();
    });

    await waitFor(() => {
      expect(result.current.indexSession).toEqual({ token: 9, count: 30 });
    });
    expect(mockRequestExpand).not.toHaveBeenCalled();
    expect(mockAwaitExpand).not.toHaveBeenCalled();

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

  it("does not wait for in-flight warm before limited open", async () => {
    mockWarmInFlight.mockReturnValue(true);

    const { result } = renderHook(() =>
      useLibraryGridAssets({
        enabled: true,
        selectedAlbumId: "__all__",
        consumeWarmPage: true,
      }),
    );

    await waitFor(() => {
      expect(mockAwaitIndex).toHaveBeenCalled();
    });

    await act(async () => {
      (globalThis as { __releaseIndex?: () => void }).__releaseIndex?.();
    });

    await waitFor(() => {
      expect(result.current.indexSession).toEqual({ token: 9, count: 30 });
    });
    expect(mockConsumeWarm).not.toHaveBeenCalled();
    expect(mockAwaitWarm).not.toHaveBeenCalled();
    expect(mockRequestExpand).not.toHaveBeenCalled();
  });
});
