import { compressImage, MAX_IMAGE_WIDTH } from "@/api/imageCompressionService";
import { exportPhotokitCappedJpeg } from "@/modules/mediaLibrary/PhotokitThumbView";
import { resolveLibraryLocalUri } from "@/modules/captureSession/materializeLibrarySelection";
import { pinDraftMedia } from "@/utils/draftMediaCache";
import {
  ensureCappedLocalPhoto,
  LIBRARY_EXPORT_MAX_EDGE_PX,
  resetEnsureCappedLocalPhotoForTests,
} from "../ensureCappedLocalPhoto";

jest.mock("@/api/imageCompressionService", () => ({
  MAX_IMAGE_WIDTH: 1920,
  compressImage: jest.fn(),
}));

jest.mock("@/modules/mediaLibrary/PhotokitThumbView", () => ({
  exportPhotokitCappedJpeg: jest.fn(),
}));

jest.mock("@/modules/captureSession/materializeLibrarySelection", () => ({
  resolveLibraryLocalUri: jest.fn(),
}));

jest.mock("@/utils/draftMediaCache", () => ({
  pinDraftMedia: jest.fn(async (uri: string) => `pinned:${uri}`),
}));

describe("ensureCappedLocalPhoto", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetEnsureCappedLocalPhotoForTests();
  });

  it("returns file:// without PhotoKit", async () => {
    await expect(
      ensureCappedLocalPhoto({
        uri: "file://cam.jpg",
        fileName: "cam.jpg",
      }),
    ).resolves.toBe("file://cam.jpg");
    expect(exportPhotokitCappedJpeg).not.toHaveBeenCalled();
  });

  it("exports native JPEG at the 1920 cap and pins once per asset", async () => {
    (exportPhotokitCappedJpeg as jest.Mock).mockResolvedValue("file://native.jpg");
    const photo = {
      uri: "ph://keep",
      fileName: "keep.jpg",
      mediaLibraryAssetId: "keep",
    };
    await expect(ensureCappedLocalPhoto(photo)).resolves.toBe("pinned:file://native.jpg");
    await expect(ensureCappedLocalPhoto(photo)).resolves.toBe("pinned:file://native.jpg");
    expect(exportPhotokitCappedJpeg).toHaveBeenCalledTimes(1);
    expect(exportPhotokitCappedJpeg).toHaveBeenCalledWith("keep", LIBRARY_EXPORT_MAX_EDGE_PX);
    expect(LIBRARY_EXPORT_MAX_EDGE_PX).toBe(MAX_IMAGE_WIDTH);
    expect(pinDraftMedia).toHaveBeenCalledTimes(1);
  });

  it("falls back to getAssetInfo + compress when native export misses", async () => {
    (exportPhotokitCappedJpeg as jest.Mock).mockResolvedValue(null);
    (resolveLibraryLocalUri as jest.Mock).mockResolvedValue("file://original.jpg");
    (compressImage as jest.Mock).mockResolvedValue({ uri: "file://compressed.jpg" });

    await expect(
      ensureCappedLocalPhoto({
        uri: "ph://keep",
        fileName: "keep.jpg",
        mediaLibraryAssetId: "keep",
      }),
    ).resolves.toBe("pinned:file://compressed.jpg");
    expect(resolveLibraryLocalUri).toHaveBeenCalledWith("keep", "ph://keep");
    expect(compressImage).toHaveBeenCalledWith("file://original.jpg");
  });
});
