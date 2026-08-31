import {
  assetToSelectionDraft,
  materializeLibrarySelections,
} from "../materializeLibrarySave";

describe("materializeLibrarySelections", () => {
  it("keeps ph:// and merges prior annotated rows by asset id", () => {
    const drafts = [
      assetToSelectionDraft(
        { id: "a", uri: "ph://a", filename: "a.jpg" },
        1,
      ),
      {
        assetId: "b",
        uri: "ph://b",
        fileName: "b.jpg",
        order: 2,
      },
    ];
    const previous = [
      {
        uri: "file://edited.jpg",
        fileName: "b.jpg",
        isAnnotated: true,
        annotatedUri: "file://edited.jpg",
        caption: "north wall",
        mediaLibraryAssetId: "b",
      },
    ];
    expect(materializeLibrarySelections(drafts, previous)).toEqual([
      {
        uri: "ph://a",
        fileName: "a.jpg",
        isAnnotated: false,
        mediaLibraryAssetId: "a",
      },
      {
        uri: "file://edited.jpg",
        fileName: "b.jpg",
        isAnnotated: true,
        annotatedUri: "file://edited.jpg",
        caption: "north wall",
        mediaLibraryAssetId: "b",
      },
    ]);
  });
});
