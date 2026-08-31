import { withPhotokitReleasedForOriginals } from "../libraryAcceptGate";
import {
  resetPhotokitGateForTests,
  runExclusivePhotokitJob,
} from "../libraryPhotokitGate";

const mockPause = jest.fn();
const mockResumeThumbs = jest.fn();
const mockCancelExpand = jest.fn();
const mockResumeExpand = jest.fn();

jest.mock("@/modules/mediaLibrary/PhotokitThumbView", () => ({
  pausePhotokitLibraryForAccept: () => mockPause(),
  resumePhotokitLibraryAfterAccept: () => mockResumeThumbs(),
}));

jest.mock("@/utils/libraryIndexPrefetch", () => ({
  cancelPhotokitLibraryExpandForAccept: () => mockCancelExpand(),
  resumePhotokitLibraryExpandAfterAccept: () => mockResumeExpand(),
}));

describe("withPhotokitReleasedForOriginals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPhotokitGateForTests();
  });

  it("pauses thumbs and waits out an in-flight expand before originals", async () => {
    let releaseExpand!: () => void;
    const expandHold = new Promise<void>((resolve) => {
      releaseExpand = resolve;
    });
    const expand = runExclusivePhotokitJob("expandLibraryFull", async () => {
      await expandHold;
    });
    await Promise.resolve();

    const order: string[] = [];
    const originals = withPhotokitReleasedForOriginals(async () => {
      order.push("originals");
      return "ok";
    });

    await Promise.resolve();
    expect(mockCancelExpand).toHaveBeenCalled();
    expect(mockPause).toHaveBeenCalled();
    expect(order).toEqual([]);

    releaseExpand();
    await expand;
    await expect(originals).resolves.toBe("ok");
    expect(order).toEqual(["originals"]);
    expect(mockResumeThumbs).toHaveBeenCalled();
    expect(mockResumeExpand).toHaveBeenCalled();
  });
});
