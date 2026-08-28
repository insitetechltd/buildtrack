jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///mock-doc/",
  makeDirectoryAsync: jest.fn(async () => undefined),
  getInfoAsync: jest.fn(async (uri: string) => ({
    exists: uri.includes("cached.jpg"),
    uri,
  })),
  copyAsync: jest.fn(async () => undefined),
}));

jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  manipulateAsync: jest.fn(async (uri: string, actions: unknown[]) => {
    const resize = (actions as Array<{ resize?: { width?: number; height?: number } }>)[0]
      ?.resize;
    return {
      uri: resize ? "file:///mock-doc/temp-resized.jpg" : uri,
      width: resize?.width ?? 4000,
      height: resize?.height ?? 3000,
    };
  }),
}));

jest.mock("expo-media-library", () => ({
  getAssetInfoAsync: jest.fn(async (assetId: string) => ({
    id: assetId,
    localUri: `file:///mock-doc/source/${assetId}.jpg`,
  })),
}));

import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";

import {
  clearLibraryThumbnailMemoryCache,
  computeLibraryThumbPixelSize,
  peekLibraryThumbnailUri,
  requestLibraryThumbnail,
} from "../libraryThumbnailCache";

describe("libraryThumbnailCache", () => {
  beforeEach(() => {
    clearLibraryThumbnailMemoryCache();
    jest.clearAllMocks();
    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (uri: string) => ({
      exists: uri.includes("cached.jpg"),
      uri,
    }));
  });

  it("computes clamped pixel size", () => {
    expect(computeLibraryThumbPixelSize(120, 3)).toBe(320);
    expect(computeLibraryThumbPixelSize(200, 3)).toBe(320);
  });

  it("builds and caches a resized thumb file", async () => {
    const uri = await requestLibraryThumbnail({
      assetId: "asset-1",
      pixelSize: 256,
      fallbackUri: "ph://asset-1",
    });

    expect(uri).toContain("library-thumbs");
    expect(uri).toContain("asset-1");
    expect(MediaLibrary.getAssetInfoAsync).toHaveBeenCalledWith("asset-1", {
      shouldDownloadFromNetwork: false,
    });
    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      expect.any(String),
      [{ resize: { width: 256 } }],
      expect.objectContaining({ format: "jpeg" }),
    );
    expect(FileSystem.copyAsync).toHaveBeenCalled();
  });

  it("returns sync memory peek after cache warm", async () => {
    await requestLibraryThumbnail({
      assetId: "asset-peek",
      pixelSize: 200,
      fallbackUri: "ph://asset-peek",
    });
    expect(peekLibraryThumbnailUri("asset-peek", 200)).toContain("library-thumbs");
  });

  it("returns memory cache on second request without re-decoding", async () => {
    const first = await requestLibraryThumbnail({
      assetId: "asset-2",
      pixelSize: 200,
      fallbackUri: "ph://asset-2",
    });
    jest.clearAllMocks();

    const second = await requestLibraryThumbnail({
      assetId: "asset-2",
      pixelSize: 200,
      fallbackUri: "ph://asset-2",
    });

    expect(second).toBe(first);
    expect(MediaLibrary.getAssetInfoAsync).not.toHaveBeenCalled();
    expect(ImageManipulator.manipulateAsync).not.toHaveBeenCalled();
  });

  it("falls back to ph:// when local source is unavailable", async () => {
    (MediaLibrary.getAssetInfoAsync as jest.Mock).mockResolvedValueOnce({
      id: "icloud-only",
      localUri: null,
    });

    const uri = await requestLibraryThumbnail({
      assetId: "icloud-only",
      pixelSize: 200,
      fallbackUri: "ph://icloud-only",
    });

    expect(uri).toBe("ph://icloud-only");
  });

  it("shares one inflight decode for duplicate requests", async () => {
    let calls = 0;
    (MediaLibrary.getAssetInfoAsync as jest.Mock).mockImplementation(async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 10));
      return {
        id: "asset-3",
        localUri: "file:///mock-doc/source/asset-3.jpg",
      };
    });

    const [a, b] = await Promise.all([
      requestLibraryThumbnail({
        assetId: "asset-3",
        pixelSize: 180,
        fallbackUri: "ph://asset-3",
      }),
      requestLibraryThumbnail({
        assetId: "asset-3",
        pixelSize: 180,
        fallbackUri: "ph://asset-3",
      }),
    ]);

    expect(a).toBe(b);
    expect(calls).toBe(1);
  });
});
