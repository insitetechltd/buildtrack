import { pinDraftMedia } from "../../../utils/draftMediaCache";
import {
  enqueueCameraDraftPin,
  flushCameraDraftPins,
  prepareCaptureSessionAccept,
  resetCameraDraftPinQueueForTests,
} from "../cameraDraftPinQueue";
import {
  resetCaptureSession,
  useCaptureSessionStore,
} from "../sessionDraftStore";

jest.mock("../../../utils/draftMediaCache", () => ({
  pinDraftMedia: jest.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("cameraDraftPinQueue", () => {
  beforeEach(() => {
    resetCameraDraftPinQueueForTests();
    resetCaptureSession();
    useCaptureSessionStore.getState().setSelectionLimit(20);
    jest.clearAllMocks();
  });

  it("starts pins immediately and does not wait for the first copy", () => {
    const first = deferred<string>();
    const second = deferred<string>();
    let call = 0;
    (pinDraftMedia as jest.Mock).mockImplementation(() => {
      call += 1;
      return call === 1 ? first.promise : second.promise;
    });

    useCaptureSessionStore.getState().addCameraPhoto({
      id: "a",
      uri: "file://cache-a.jpg",
      fileName: "a.jpg",
    });
    useCaptureSessionStore.getState().addCameraPhoto({
      id: "b",
      uri: "file://cache-b.jpg",
      fileName: "b.jpg",
    });
    enqueueCameraDraftPin({
      id: "a",
      sourceUri: "file://cache-a.jpg",
      fileName: "a.jpg",
    });
    enqueueCameraDraftPin({
      id: "b",
      sourceUri: "file://cache-b.jpg",
      fileName: "b.jpg",
    });

    expect(pinDraftMedia).toHaveBeenCalledTimes(2);
    expect(useCaptureSessionStore.getState().photos.map((p) => p.uri)).toEqual([
      "file://cache-a.jpg",
      "file://cache-b.jpg",
    ]);
  });

  it("patches uri in place after pin and flush reports no failures", async () => {
    const pin = deferred<string>();
    (pinDraftMedia as jest.Mock).mockReturnValue(pin.promise);
    useCaptureSessionStore.getState().addCameraPhoto({
      id: "a",
      uri: "file://cache-a.jpg",
      fileName: "a.jpg",
    });
    enqueueCameraDraftPin({
      id: "a",
      sourceUri: "file://cache-a.jpg",
      fileName: "a.jpg",
    });

    pin.resolve("file://draft/a.jpg");
    await expect(flushCameraDraftPins()).resolves.toEqual({ failedCount: 0 });
    expect(useCaptureSessionStore.getState().photos[0].uri).toBe(
      "file://draft/a.jpg",
    );
  });

  it("removes the row on pin failure and counts it on flush", async () => {
    const pin = deferred<string>();
    (pinDraftMedia as jest.Mock).mockReturnValue(pin.promise);
    useCaptureSessionStore.getState().addCameraPhoto({
      id: "a",
      uri: "file://cache-a.jpg",
      fileName: "a.jpg",
    });
    enqueueCameraDraftPin({
      id: "a",
      sourceUri: "file://cache-a.jpg",
      fileName: "a.jpg",
    });

    pin.reject(new Error("disk"));
    await expect(flushCameraDraftPins()).resolves.toEqual({ failedCount: 1 });
    expect(useCaptureSessionStore.getState().photos).toHaveLength(0);
  });

  it("ignores late pin completion after session reset", async () => {
    const pin = deferred<string>();
    (pinDraftMedia as jest.Mock).mockReturnValue(pin.promise);
    useCaptureSessionStore.getState().addCameraPhoto({
      id: "a",
      uri: "file://cache-a.jpg",
      fileName: "a.jpg",
    });
    enqueueCameraDraftPin({
      id: "a",
      sourceUri: "file://cache-a.jpg",
      fileName: "a.jpg",
    });
    resetCaptureSession();
    useCaptureSessionStore.getState().addCameraPhoto({
      id: "b",
      uri: "file://cache-b.jpg",
      fileName: "b.jpg",
    });

    pin.resolve("file://draft/stale.jpg");
    await flushCameraDraftPins();
    const photos = useCaptureSessionStore.getState().photos;
    expect(photos).toHaveLength(1);
    expect(photos[0].id).toBe("b");
    expect(photos[0].uri).toBe("file://cache-b.jpg");
  });

  it("prepareCaptureSessionAccept flushes camera pins and maps library ph:// without export", async () => {
    const pin = deferred<string>();
    (pinDraftMedia as jest.Mock).mockReturnValue(pin.promise);
    useCaptureSessionStore.getState().addCameraPhoto({
      id: "a",
      uri: "file://cache-a.jpg",
      fileName: "a.jpg",
    });
    enqueueCameraDraftPin({
      id: "a",
      sourceUri: "file://cache-a.jpg",
      fileName: "a.jpg",
    });
    useCaptureSessionStore.getState().addOrSelectLibraryPhoto({
      id: "lib_1",
      uri: "ph://keep",
      fileName: "keep.jpg",
      mediaLibraryAssetId: "keep",
    });

    const acceptPromise = prepareCaptureSessionAccept();
    pin.resolve("file://draft/a.jpg");
    const result = await acceptPromise;

    expect(result.failedCount).toBe(0);
    expect(result.photos).toEqual([
      {
        uri: "file://draft/a.jpg",
        fileName: "a.jpg",
        isAnnotated: false,
        mediaLibraryAssetId: undefined,
      },
      {
        uri: "ph://keep",
        fileName: "keep.jpg",
        isAnnotated: false,
        mediaLibraryAssetId: "keep",
      },
    ]);
  });

  it("does not wait on a previous session's hung pin", async () => {
    const hung = deferred<string>();
    const next = deferred<string>();
    let call = 0;
    (pinDraftMedia as jest.Mock).mockImplementation(() => {
      call += 1;
      return call === 1 ? hung.promise : next.promise;
    });

    useCaptureSessionStore.getState().addCameraPhoto({
      id: "old",
      uri: "file://old.jpg",
      fileName: "old.jpg",
    });
    enqueueCameraDraftPin({
      id: "old",
      sourceUri: "file://old.jpg",
      fileName: "old.jpg",
    });
    resetCaptureSession();
    useCaptureSessionStore.getState().addCameraPhoto({
      id: "new",
      uri: "file://new.jpg",
      fileName: "new.jpg",
    });
    enqueueCameraDraftPin({
      id: "new",
      sourceUri: "file://new.jpg",
      fileName: "new.jpg",
    });

    next.resolve("file://draft/new.jpg");
    await expect(flushCameraDraftPins()).resolves.toEqual({ failedCount: 0 });
    expect(useCaptureSessionStore.getState().photos[0].uri).toBe(
      "file://draft/new.jpg",
    );
  });
});
