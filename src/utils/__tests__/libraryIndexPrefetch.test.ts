import {
  awaitPhotokitLibraryIndex,
  cancelPhotokitLibraryExpandForAccept,
  clearPhotokitLibraryIndexPrefetch,
  markLibraryPickerOpen,
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
const mockOpenLimited = jest.fn(async () => ({ token: 5, count: 90 }));
const mockExpand = jest.fn(async () => ({ token: 5, count: 50000 }));
const mockIs2b = jest.fn(() => false);
const mockIs2bApi = jest.fn(() => true);

jest.mock("@/modules/mediaLibrary/PhotokitThumbView", () => ({
  isPhotokitLibraryIndexAvailable: () => true,
  isPhotokitLibrary2bAvailable: () => mockIs2bApi(),
  openPhotokitLibrary: (...args: unknown[]) => mockOpen(...args),
  openPhotokitLibraryLimited: (...args: unknown[]) => mockOpenLimited(...args),
  expandPhotokitLibraryFull: (...args: unknown[]) => mockExpand(...args),
}));

jest.mock("@/utils/libraryPickerPerf", () => ({
  LIBRARY_PICKER_2B_FIRST_BATCH: 90,
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
    mockOpenLimited.mockResolvedValue({ token: 5, count: 90 });
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
    expect(limited).toEqual({ token: 5, count: 90 });
    expect(mockOpenLimited).toHaveBeenCalledWith(null, 90, false, null, null);
    expect(mockOpen).not.toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();
    expect(mockExpand).not.toHaveBeenCalled();
    expect(peekPhotokitLibraryIndex(null)).toEqual({ token: 5, count: 90 });
  });

  it("does not reuse a finished walk on the next open", async () => {
    mockIs2b.mockReturnValue(true);
    await prefetchPhotokitLibraryIndex(null);
    mockOpenLimited.mockResolvedValueOnce({ token: 9, count: 90 });
    const next = await prefetchPhotokitLibraryIndex(null);
    expect(mockOpenLimited).toHaveBeenCalledTimes(2);
    expect(next).toEqual({ token: 9, count: 90 });
  });

  it("does not join a walk that started before this open", async () => {
    mockIs2b.mockReturnValue(true);
    let releaseFirst: (session: { token: number; count: number }) => void = () => {};
    mockOpenLimited.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseFirst = resolve;
        }),
    );
    const first = prefetchPhotokitLibraryIndex(null);
    markLibraryPickerOpen();
    const pending = awaitPhotokitLibraryIndex(null);
    expect(mockOpenLimited).toHaveBeenCalledTimes(1);
    releaseFirst({ token: 5, count: 90 });
    const second = await pending;
    expect(mockOpenLimited).toHaveBeenCalledTimes(2);
    expect(second).toEqual({ token: 5, count: 90 });
    await first;
  });

  it("does not fall through to a full library open when the default walk fails", async () => {
    mockIs2b.mockReturnValue(true);
    mockOpenLimited.mockResolvedValueOnce(null);
    const limited = await prefetchPhotokitLibraryIndex(null);
    expect(limited).toBeNull();
    expect(mockOpen).not.toHaveBeenCalled();
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
    expect(mockExpand).toHaveBeenCalledWith(5, false, null, null);
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
    requestPhotokitLibraryExpandIfScrolled(null, 5, 18, 90, false, onExpanded);
    expect(mockExpand).not.toHaveBeenCalled();
    requestPhotokitLibraryExpandIfScrolled(null, 5, 88, 90, true, onExpanded);
    await Promise.resolve();
    await Promise.resolve();
    expect(mockExpand).toHaveBeenCalledWith(5, false, null, null);
    await Promise.resolve();
    expect(onExpanded).toHaveBeenCalledWith({ token: 5, count: 50000 });
  });

  it("keeps walking after the first batch when the user scrolls near the end", async () => {
    mockIs2b.mockReturnValue(true);
    await prefetchPhotokitLibraryIndex(null);
    const onExpanded = jest.fn();
    requestPhotokitLibraryExpandIfScrolled(null, 5, 178, 180, true, onExpanded);
    await Promise.resolve();
    await Promise.resolve();
    expect(mockExpand).toHaveBeenCalledWith(5, false, null, null);
  });

  it("does not reuse the newest-first session when the sort is oldest first", async () => {
    await prefetchPhotokitLibraryIndex(null);
    expect(mockOpen).toHaveBeenCalledTimes(1);
    mockOpen.mockResolvedValueOnce({ token: 9, count: 10 });
    const oldest = await prefetchPhotokitLibraryIndex(null, true);
    expect(mockOpen).toHaveBeenCalledTimes(2);
    expect(mockOpen).toHaveBeenLastCalledWith(null, true, null, null);
    expect(oldest).toEqual({ token: 9, count: 10 });
    expect(peekPhotokitLibraryIndex(null)).toBeNull();
  });
});
