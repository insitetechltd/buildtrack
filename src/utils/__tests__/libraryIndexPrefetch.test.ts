import {
  cancelPhotokitLibraryExpandForAccept,
  clearPhotokitLibraryIndexPrefetch,
  peekPhotokitLibraryIndex,
  prefetchPhotokitLibraryIndex,
  requestPhotokitLibraryExpandIfScrolled,
  resumePhotokitLibraryExpandAfterAccept,
  schedulePhotokitLibraryExpandAfterFirstPaint,
} from "../libraryIndexPrefetch";
import {
  beginLibraryPickerSession,
  markLibraryPickerMetadata,
  markLibraryPickerTilePainted,
  resetLibraryPickerTimingForTests,
} from "../libraryPickerTiming";

const mockOpen = jest.fn(async () => ({ token: 2, count: 100 }));
const mockOpenLimited = jest.fn(async () => ({ token: 5, count: 30 }));
const mockOpenWithIds = jest.fn(async () => ({ token: 8, count: 12 }));
const mockExpand = jest.fn(async () => ({ token: 5, count: 50000 }));
const mockIdAt = jest.fn((token: number, index: number) => `id${index}`);
const mockIs2b = jest.fn(() => false);
const mockIs2bApi = jest.fn(() => true);
const mockIsWithIds = jest.fn(() => true);
const mockPeekIds = jest.fn(() => null as string[] | null);
const mockHydrateIds = jest.fn(async () => null);
const mockPersistIds = jest.fn(async () => undefined);

jest.mock("@/modules/mediaLibrary/PhotokitThumbView", () => ({
  isPhotokitLibraryIndexAvailable: () => true,
  isPhotokitLibrary2bAvailable: () => mockIs2bApi(),
  isPhotokitLibraryWithIdsAvailable: () => mockIsWithIds(),
  openPhotokitLibrary: (...args: unknown[]) => mockOpen(...args),
  openPhotokitLibraryLimited: (...args: unknown[]) => mockOpenLimited(...args),
  openPhotokitLibraryWithIds: (...args: unknown[]) => mockOpenWithIds(...args),
  expandPhotokitLibraryFull: (...args: unknown[]) => mockExpand(...args),
  photokitIdAt: (token: number, index: number) => mockIdAt(token, index),
}));

jest.mock("@/utils/libraryPreviewIds", () => ({
  peekPhotokitPreviewIds: () => mockPeekIds(),
  hydratePhotokitPreviewIds: () => mockHydrateIds(),
  persistPhotokitPreviewIds: (...args: unknown[]) => mockPersistIds(...args),
}));

jest.mock("@/utils/libraryPickerPerf", () => ({
  LIBRARY_PICKER_2B_FIRST_BATCH: 30,
  LIBRARY_FIRST_PHOTO_BUDGET_MS: 3000,
  isLibraryPickerNative2b: () => mockIs2b(),
}));

describe("libraryIndexPrefetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPhotokitLibraryIndexPrefetch();
    resetLibraryPickerTimingForTests();
    mockIs2b.mockReturnValue(false);
    mockIs2bApi.mockReturnValue(true);
    mockOpen.mockResolvedValue({ token: 2, count: 100 });
    mockOpenLimited.mockResolvedValue({ token: 5, count: 30 });
    mockOpenWithIds.mockResolvedValue({ token: 8, count: 12 });
    mockPeekIds.mockReturnValue(null);
    mockHydrateIds.mockResolvedValue(null);
    mockIsWithIds.mockReturnValue(true);
    mockExpand.mockResolvedValue({ token: 5, count: 50000 });
  });

  it("dedupes in-flight openLibrary for the same album key", async () => {
    const first = prefetchPhotokitLibraryIndex(null);
    const second = prefetchPhotokitLibraryIndex(null);
    expect(first).not.toBeNull();
    expect(second).toBe(first);
    await first;
    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(peekPhotokitLibraryIndex(null)).toEqual({ token: 2, count: 100 });
  });

  it("reopens when album key changes", async () => {
    await prefetchPhotokitLibraryIndex(null);
    mockOpen.mockResolvedValueOnce({ token: 3, count: 50 });
    await prefetchPhotokitLibraryIndex("album-a");
    expect(mockOpen).toHaveBeenCalledTimes(2);
    expect(peekPhotokitLibraryIndex("album-a")).toEqual({ token: 3, count: 50 });
  });

  it("native2b returns limited session without expanding", async () => {
    mockIs2b.mockReturnValue(true);
    const limited = await prefetchPhotokitLibraryIndex(null);
    expect(limited).toEqual({ token: 5, count: 30 });
    expect(mockOpenLimited).toHaveBeenCalledWith(null, 30);
    expect(mockOpen).not.toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();
    expect(mockExpand).not.toHaveBeenCalled();
    expect(peekPhotokitLibraryIndex(null)).toEqual({ token: 5, count: 30 });
    expect(mockPersistIds).toHaveBeenCalled();
  });

  it("native2b opens persisted ids without Recents limited fetch", async () => {
    mockIs2b.mockReturnValue(true);
    mockPeekIds.mockReturnValue(["p0", "p1"]);
    const preview = await prefetchPhotokitLibraryIndex(null);
    expect(preview).toEqual({ token: 8, count: 12 });
    expect(mockOpenWithIds).toHaveBeenCalledWith(["p0", "p1"]);
    expect(mockOpenLimited).not.toHaveBeenCalled();
  });

  it("expands same token after first screen paints", async () => {
    mockIs2b.mockReturnValue(true);
    await prefetchPhotokitLibraryIndex(null);
    beginLibraryPickerSession();
    markLibraryPickerMetadata(12);
    const onExpanded = jest.fn();
    const cancel = schedulePhotokitLibraryExpandAfterFirstPaint(
      null,
      5,
      onExpanded,
    );
    expect(mockExpand).not.toHaveBeenCalled();
    for (let i = 0; i < 12; i += 1) {
      markLibraryPickerTilePainted(`p${i}`);
    }
    await Promise.resolve();
    await Promise.resolve();
    expect(mockExpand).toHaveBeenCalledWith(5);
    await Promise.resolve();
    expect(onExpanded).toHaveBeenCalledWith({ token: 5, count: 50000 });
    expect(peekPhotokitLibraryIndex(null)).toEqual({ token: 5, count: 50000 });
    cancel();
  });

  it("does not expand on first paint when Accept cancelled the job", async () => {
    mockIs2b.mockReturnValue(true);
    await prefetchPhotokitLibraryIndex(null);
    beginLibraryPickerSession();
    markLibraryPickerMetadata(12);
    cancelPhotokitLibraryExpandForAccept();
    const onExpanded = jest.fn();
    schedulePhotokitLibraryExpandAfterFirstPaint(null, 5, onExpanded);
    for (let i = 0; i < 12; i += 1) {
      markLibraryPickerTilePainted(`p${i}`);
    }
    await Promise.resolve();
    await Promise.resolve();
    expect(mockExpand).not.toHaveBeenCalled();
    resumePhotokitLibraryExpandAfterAccept();
  });

  it("expands when the user scrolls near the end of a limited session", async () => {
    mockIs2b.mockReturnValue(true);
    await prefetchPhotokitLibraryIndex(null);
    const onExpanded = jest.fn();
    requestPhotokitLibraryExpandIfScrolled(null, 5, 18, 30, false, onExpanded);
    expect(mockExpand).not.toHaveBeenCalled();
    requestPhotokitLibraryExpandIfScrolled(null, 5, 28, 30, true, onExpanded);
    await Promise.resolve();
    await Promise.resolve();
    expect(mockExpand).toHaveBeenCalledWith(5);
    await Promise.resolve();
    expect(onExpanded).toHaveBeenCalledWith({ token: 5, count: 50000 });
  });
});
