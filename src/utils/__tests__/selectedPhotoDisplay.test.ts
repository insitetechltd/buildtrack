import {
  selectedPhotoHasLocalFile,
  selectedPhotoUsesPhotokitThumb,
} from "../selectedPhotoDisplay";

describe("selectedPhotoDisplay", () => {
  it("treats camera pins and baked edits as local files", () => {
    expect(selectedPhotoHasLocalFile({ uri: "file:///tmp/a.jpg" })).toBe(true);
    expect(
      selectedPhotoHasLocalFile({
        uri: "ph://id",
        annotatedUri: "file:///tmp/drawn.jpg",
      }),
    ).toBe(true);
    expect(
      selectedPhotoHasLocalFile({
        uri: "ph://id",
      }),
    ).toBe(false);
  });

  it("uses PhotoKit thumbs for library ph:// when the native view exists", () => {
    expect(
      selectedPhotoUsesPhotokitThumb(
        {
          uri: "ph://ABC/L0/001",
          mediaLibraryAssetId: "ABC/L0/001",
        },
        true,
      ),
    ).toBe(true);
  });

  it("does not claim native thumbs when PhotokitThumbs is missing", () => {
    expect(
      selectedPhotoUsesPhotokitThumb(
        {
          uri: "ph://ABC/L0/001",
          mediaLibraryAssetId: "ABC/L0/001",
        },
        false,
      ),
    ).toBe(false);
  });

  it("never uses PhotoKit thumbs for file:// camera drafts", () => {
    expect(
      selectedPhotoUsesPhotokitThumb(
        {
          uri: "file:///tmp/cam.jpg",
        },
        true,
      ),
    ).toBe(false);
  });
});
