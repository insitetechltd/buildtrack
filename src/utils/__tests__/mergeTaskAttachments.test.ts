import {
  mergeUniqueAttachments,
  taskAttachmentKey,
} from "../mergeTaskAttachments";
import type { SelectedPhoto } from "../usePhotoSelection";

const photo = (
  overrides: Partial<SelectedPhoto> & Pick<SelectedPhoto, "uri" | "fileName">,
): SelectedPhoto => ({
  isAnnotated: false,
  ...overrides,
});

describe("taskAttachmentKey", () => {
  it("keys durable URLs, library assets, and local URIs", () => {
    expect(taskAttachmentKey("https://cdn.example.com/a.jpg")).toBe(
      "url:https://cdn.example.com/a.jpg",
    );
    expect(
      taskAttachmentKey(
        photo({
          uri: "file:///draft.jpg",
          fileName: "draft.jpg",
          mediaLibraryAssetId: "asset-1",
        }),
      ),
    ).toBe("ml:asset-1");
    expect(
      taskAttachmentKey(
        photo({
          uri: "file:///raw.jpg",
          fileName: "raw.jpg",
          annotatedUri: "file:///edited.jpg",
        }),
      ),
    ).toBe("uri:file:///raw.jpg");
  });
});

describe("mergeUniqueAttachments", () => {
  it("prefers the incoming draft when the same camera photo was edited", () => {
    const original = photo({
      uri: "file:///cam.jpg",
      fileName: "cam.jpg",
    });
    const edited = photo({
      uri: "file:///cam.jpg",
      fileName: "cam.jpg",
      isAnnotated: true,
      annotatedUri: "file:///cam-edited.jpg",
    });

    expect(mergeUniqueAttachments([original], [edited])).toEqual([edited]);
  });
  it("appends new photos without duplicating prior ones", () => {
    const a = photo({
      uri: "file:///a.jpg",
      fileName: "a.jpg",
      mediaLibraryAssetId: "a",
    });
    const b = photo({
      uri: "file:///b.jpg",
      fileName: "b.jpg",
      mediaLibraryAssetId: "b",
    });
    const c = photo({
      uri: "file:///c.jpg",
      fileName: "c.jpg",
      mediaLibraryAssetId: "c",
    });

    expect(mergeUniqueAttachments([a, b], [a, b, c])).toEqual([a, b, c]);
  });

  it("is idempotent when the same batch is merged twice", () => {
    const a = photo({
      uri: "file:///a.jpg",
      fileName: "a.jpg",
      mediaLibraryAssetId: "a",
    });
    const b = photo({
      uri: "file:///b.jpg",
      fileName: "b.jpg",
      mediaLibraryAssetId: "b",
    });

    const once = mergeUniqueAttachments([], [a, b]);
    expect(mergeUniqueAttachments(once, [a, b])).toEqual([a, b]);
  });

  it("prefers the incoming draft when the same library asset was edited", () => {
    const original = photo({
      uri: "file:///a.jpg",
      fileName: "a.jpg",
      mediaLibraryAssetId: "a",
    });
    const edited = photo({
      uri: "file:///a.jpg",
      fileName: "a.jpg",
      mediaLibraryAssetId: "a",
      isAnnotated: true,
      annotatedUri: "file:///a-edited.jpg",
    });

    expect(mergeUniqueAttachments([original], [edited])).toEqual([edited]);
  });

  it("keeps durable URL attachments that are not in the incoming batch", () => {
    const draft = photo({
      uri: "file:///new.jpg",
      fileName: "new.jpg",
      mediaLibraryAssetId: "new",
    });
    expect(
      mergeUniqueAttachments(["https://cdn.example.com/existing.jpg"], [draft]),
    ).toEqual(["https://cdn.example.com/existing.jpg", draft]);
  });
});
