import { LIBRARY_PREVIEW_MAX_EDGE_PX } from "../ensureCappedLocalPhoto";
import { pinLibraryPreviews, withLibraryPreviewUri } from "../libraryPreviewPin";

const mockExportPreview = jest.fn();
const mockPause = jest.fn();

jest.mock("@/modules/mediaLibrary/PhotokitThumbView", () => ({
  exportPhotokitPreviewJpeg: (...args: unknown[]) => mockExportPreview(...args),
  pausePhotokitLibraryForAccept: () => mockPause(),
}));

describe("libraryPreviewPin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExportPreview.mockResolvedValue("file:///tmp/preview.jpg");
  });

  it("attaches a file:// preview without replacing ph:// uri", async () => {
    await expect(
      withLibraryPreviewUri({
        uri: "ph://ABC/L0/001",
        mediaLibraryAssetId: "ABC/L0/001",
      }),
    ).resolves.toEqual({
      uri: "ph://ABC/L0/001",
      mediaLibraryAssetId: "ABC/L0/001",
      previewUri: "file:///tmp/preview.jpg",
    });
    expect(mockExportPreview).toHaveBeenCalledWith(
      "ABC/L0/001",
      LIBRARY_PREVIEW_MAX_EDGE_PX,
    );
  });

  it("skips export for camera file:// rows", async () => {
    const photo = { uri: "file:///tmp/cam.jpg", fileName: "cam.jpg" };
    await expect(withLibraryPreviewUri(photo)).resolves.toBe(photo);
    expect(mockExportPreview).not.toHaveBeenCalled();
  });

  it("pauses Recents once then pins every library row", async () => {
    const photos = await pinLibraryPreviews([
      { uri: "ph://a", mediaLibraryAssetId: "a" },
      { uri: "ph://b", mediaLibraryAssetId: "b" },
    ]);
    expect(mockPause).toHaveBeenCalledTimes(1);
    expect(mockExportPreview).toHaveBeenCalledTimes(2);
    expect(photos.map((photo) => photo.previewUri)).toEqual([
      "file:///tmp/preview.jpg",
      "file:///tmp/preview.jpg",
    ]);
  });

  it("keeps ph:// when preview export returns null", async () => {
    mockExportPreview.mockResolvedValue(null);
    await expect(
      withLibraryPreviewUri({
        uri: "ph://gone",
        mediaLibraryAssetId: "gone",
      }),
    ).resolves.toEqual({
      uri: "ph://gone",
      mediaLibraryAssetId: "gone",
    });
  });
});
