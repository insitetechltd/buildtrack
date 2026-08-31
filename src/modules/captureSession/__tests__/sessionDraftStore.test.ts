import {
  mapSessionSelectionToSelectedPhotos,
} from "../mapToSelectedPhotos";
import {
  resetCaptureSession,
  useCaptureSessionStore,
} from "../sessionDraftStore";
import type { CaptureSessionPhoto } from "../types";
import {
  peekRememberedAlbumId,
  rememberAlbumId,
} from "../../mediaLibrary/libraryAlbumPickerMemory";

describe("captureSession sessionDraftStore", () => {
  beforeEach(() => {
    resetCaptureSession();
    useCaptureSessionStore.getState().setSelectionLimit(3);
  });

  it("adds camera photos selected by default and enforces limit", () => {
    const { addCameraPhoto } = useCaptureSessionStore.getState();
    addCameraPhoto({ id: "1", uri: "file://a.jpg", fileName: "a.jpg" });
    addCameraPhoto({ id: "2", uri: "file://b.jpg", fileName: "b.jpg" });
    addCameraPhoto({ id: "3", uri: "file://c.jpg", fileName: "c.jpg" });
    addCameraPhoto({ id: "4", uri: "file://d.jpg", fileName: "d.jpg" });

    const photos = useCaptureSessionStore.getState().photos;
    expect(photos).toHaveLength(3);
    expect(photos.every((p) => p.source === "camera" && p.selected)).toBe(true);
  });

  it("patches camera uri in place and ignores missing ids", () => {
    const store = useCaptureSessionStore.getState();
    store.addCameraPhoto({ id: "1", uri: "file://cache.jpg", fileName: "a.jpg" });
    store.updatePhotoUri("1", "file://draft/a.jpg");
    expect(useCaptureSessionStore.getState().photos[0].uri).toBe(
      "file://draft/a.jpg",
    );
    expect(useCaptureSessionStore.getState().photos[0].selected).toBe(true);
    store.updatePhotoUri("missing", "file://nope.jpg");
    expect(useCaptureSessionStore.getState().photos).toHaveLength(1);
  });

  it("toggles library asset selection by mediaLibraryAssetId", () => {
    const { addOrSelectLibraryPhoto } = useCaptureSessionStore.getState();
    const base = {
      id: "lib_x",
      uri: "file://x.jpg",
      fileName: "x.jpg",
      mediaLibraryAssetId: "asset-x",
    };
    addOrSelectLibraryPhoto(base);
    expect(useCaptureSessionStore.getState().photos[0].selected).toBe(true);
    addOrSelectLibraryPhoto(base);
    expect(useCaptureSessionStore.getState().photos[0].selected).toBe(false);
  });

  it("selectAllSessionCamera selects only camera rows within limit", () => {
    const store = useCaptureSessionStore.getState();
    store.addCameraPhoto({ id: "1", uri: "file://a.jpg", fileName: "a.jpg" });
    store.addOrSelectLibraryPhoto({
      id: "lib_1",
      uri: "file://l.jpg",
      fileName: "l.jpg",
      mediaLibraryAssetId: "L1",
    });
    store.toggleSelected("1");
    expect(useCaptureSessionStore.getState().photos.find((p) => p.id === "1")?.selected).toBe(
      false,
    );
    store.selectAllSessionCamera();
    const photos = useCaptureSessionStore.getState().photos;
    expect(photos.find((p) => p.id === "1")?.selected).toBe(true);
    expect(photos.find((p) => p.id === "lib_1")?.selected).toBe(true);
  });

  it("records library picks without requiring a file:// uri (defer pin to annotation/upload)", () => {
    const { addOrSelectLibraryPhoto } = useCaptureSessionStore.getState();
    addOrSelectLibraryPhoto({
      id: "lib_ph",
      uri: "ph://asset-ph",
      fileName: "job.jpg",
      mediaLibraryAssetId: "asset-ph",
    });
    const row = useCaptureSessionStore.getState().photos[0];
    expect(row.uri).toBe("ph://asset-ph");
    expect(row.selected).toBe(true);
  });
});

describe("mapSessionSelectionToSelectedPhotos", () => {
  it("maps only selected rows into SelectedPhoto shape", () => {
    const input: CaptureSessionPhoto[] = [
      {
        id: "1",
        uri: "file://a.jpg",
        fileName: "a.jpg",
        source: "camera",
        selected: true,
      },
      {
        id: "2",
        uri: "file://b.jpg",
        fileName: "b.jpg",
        source: "library",
        mediaLibraryAssetId: "B",
        selected: false,
      },
      {
        id: "3",
        uri: "file://c.jpg",
        fileName: "c.jpg",
        source: "library",
        mediaLibraryAssetId: "C",
        selected: true,
      },
    ];
    expect(mapSessionSelectionToSelectedPhotos(input)).toEqual([
      { uri: "file://a.jpg", fileName: "a.jpg", isAnnotated: false, mediaLibraryAssetId: undefined },
      {
        uri: "file://c.jpg",
        fileName: "c.jpg",
        isAnnotated: false,
        mediaLibraryAssetId: "C",
      },
    ]);
  });

  it("clears remembered library album when the capture session resets", () => {
    rememberAlbumId("shots");
    resetCaptureSession();
    expect(peekRememberedAlbumId()).toBe("__all__");
  });
});
