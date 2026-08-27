import * as MediaLibrary from "expo-media-library";

import { pinDraftMedia } from "../../../utils/draftMediaCache";
import { materializeSelectedCapturePhotos } from "../materializeLibrarySelection";
import type { CaptureSessionPhoto } from "../types";

jest.mock("expo-media-library", () => ({
  getAssetInfoAsync: jest.fn(),
}));

jest.mock("../../../utils/draftMediaCache", () => ({
  pinDraftMedia: jest.fn(async (uri: string) => `pinned:${uri}`),
}));

describe("materializeSelectedCapturePhotos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("pins camera file:// rows and resolves library ph:// only for selected assets", async () => {
    (MediaLibrary.getAssetInfoAsync as jest.Mock).mockResolvedValue({
      localUri: "file://resolved.jpg",
    });

    const photos: CaptureSessionPhoto[] = [
      {
        id: "1",
        uri: "file://cam.jpg",
        fileName: "cam.jpg",
        source: "camera",
        selected: true,
      },
      {
        id: "2",
        uri: "ph://skip",
        fileName: "skip.jpg",
        source: "library",
        mediaLibraryAssetId: "skip",
        selected: false,
      },
      {
        id: "3",
        uri: "ph://keep",
        fileName: "keep.jpg",
        source: "library",
        mediaLibraryAssetId: "keep",
        selected: true,
      },
    ];

    const result = await materializeSelectedCapturePhotos(photos);

    expect(MediaLibrary.getAssetInfoAsync).toHaveBeenCalledTimes(1);
    expect(MediaLibrary.getAssetInfoAsync).toHaveBeenCalledWith("keep", {
      shouldDownloadFromNetwork: true,
    });
    expect(pinDraftMedia).toHaveBeenCalledWith("file://cam.jpg", "cam.jpg");
    expect(pinDraftMedia).toHaveBeenCalledWith("file://resolved.jpg", "keep.jpg");
    expect(result).toEqual([
      {
        uri: "pinned:file://cam.jpg",
        fileName: "cam.jpg",
        isAnnotated: false,
        mediaLibraryAssetId: undefined,
      },
      {
        uri: "pinned:file://resolved.jpg",
        fileName: "keep.jpg",
        isAnnotated: false,
        mediaLibraryAssetId: "keep",
      },
    ]);
  });

  it("skips PhotoKit export for library rows that are already file://", async () => {
    const photos: CaptureSessionPhoto[] = [
      {
        id: "1",
        uri: "file://already.jpg",
        fileName: "already.jpg",
        source: "library",
        mediaLibraryAssetId: "already",
        selected: true,
      },
    ];

    const result = await materializeSelectedCapturePhotos(photos);

    expect(MediaLibrary.getAssetInfoAsync).not.toHaveBeenCalled();
    expect(pinDraftMedia).toHaveBeenCalledWith("file://already.jpg", "already.jpg");
    expect(result).toEqual([
      {
        uri: "pinned:file://already.jpg",
        fileName: "already.jpg",
        isAnnotated: false,
        mediaLibraryAssetId: "already",
      },
    ]);
  });

  it("returns an empty list when nothing is selected", async () => {
    const result = await materializeSelectedCapturePhotos([
      {
        id: "1",
        uri: "ph://keep",
        fileName: "keep.jpg",
        source: "library",
        mediaLibraryAssetId: "keep",
        selected: false,
      },
    ]);

    expect(result).toEqual([]);
    expect(MediaLibrary.getAssetInfoAsync).not.toHaveBeenCalled();
    expect(pinDraftMedia).not.toHaveBeenCalled();
  });
});
