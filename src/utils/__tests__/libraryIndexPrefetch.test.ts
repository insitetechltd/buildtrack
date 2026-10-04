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
}));

describe("libraryIndexPrefetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPhotokitLibraryIndexPrefetch();
    resetLibraryPickerTimingForTests();
    mockIs2bApi.mockReturnValue(true);
    mockOpen.mockResolvedValue({ token: 2, count: 100 });
    mockOpenLimited.mockResolvedValue({ token: 5, count: 90 });
    mockExpand.mockResolvedValue({ token: 5, count: 50000 });
  });

  it("dedupes in-flight user-library walks for the same album key", async () => {
    const first = prefetchPhotokitLibraryIndex(null);
    const second = prefetchPhotokitLibraryIndex(null);
    expect(first).not.toBeNull();
    expect(second).toBe(first);
    await first;
    expect(mockOpenLimited).toHaveBeenCalledTimes(1);
    expect(mockOpen).not.toHaveBeenCalled();
    expect(peekPhotokitLibraryIndex(null)).toEqual({ token: 5, count: 90 });
  });

  it("reopens when album key changes", async () => {
    await prefetchPhotokitLibraryIndex(null);
    mockOpenLimited.mockResolvedValueOnce({ token: 3, count: 50 });
    await prefetchPhotokitLibraryIndex("album-a");
    expect(mockOpenLimited).toHaveBeenCalledTimes(2);
    expect(mockOpen).not.toHaveBeenCalled();
    expect(peekPhotokitLibraryIndex("album-a")).toEqual({ token: 3, count: 50 });
  });

  it("returns a limited session without expanding", async () => {
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
    await prefetchPhotokitLibraryIndex(null);
    mockOpenLimited.mockResolvedValueOnce({ token: 9, count: 90 });
    const next = await prefetchPhotokitLibraryIndex(null);
    expect(mockOpenLimited).toHaveBeenCalledTimes(2);
    expect(next).toEqual({ token: 9, count: 90 });
  });

  it("does not join a walk that started before this open", async () => {
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
    mockOpenLimited.mockResolvedValueOnce(null);
    const limited = await prefetchPhotokitLibraryIndex(null);
    expect(limited).toBeNull();
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it("expands same token after first screen paints", async () => {
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
    await prefetchPhotokitLibraryIndex(null);
    const onExpanded = jest.fn();
    requestPhotokitLibraryExpandIfScrolled(null, 5, 178, 180, true, onExpanded);
    await Promise.resolve();
    await Promise.resolve();
    expect(mockExpand).toHaveBeenCalledWith(5, false, null, null);
  });

  it("does not reuse the newest-first session when the sort is oldest first", async () => {
    await prefetchPhotokitLibraryIndex(null);
    expect(mockOpenLimited).toHaveBeenCalledTimes(1);
    mockOpenLimited.mockResolvedValueOnce({ token: 9, count: 10 });
    const oldest = await prefetchPhotokitLibraryIndex(null, true);
    expect(mockOpenLimited).toHaveBeenCalledTimes(2);
    expect(mockOpenLimited).toHaveBeenLastCalledWith(null, 90, true, null, null);
    expect(mockOpen).not.toHaveBeenCalled();
    expect(oldest).toEqual({ token: 9, count: 10 });
    expect(peekPhotokitLibraryIndex(null)).toBeNull();
  });

  it("uses the sorted open when the user-library walk API is missing", async () => {
    mockIs2bApi.mockReturnValue(false);
    const session = await prefetchPhotokitLibraryIndex(null);
    expect(mockOpen).toHaveBeenCalledWith(null, false, null, null);
    expect(mockOpenLimited).not.toHaveBeenCalled();
    expect(session).toEqual({ token: 2, count: 100 });
  });

  it("falls through to the sorted open for a date window when the walk returns nothing", async () => {
    mockOpenLimited.mockResolvedValueOnce(null);
    const session = await prefetchPhotokitLibraryIndex(null, false, 100, 200);
    expect(mockOpenLimited).toHaveBeenCalledWith(null, 90, false, 100, 200);
    expect(mockOpen).toHaveBeenCalledWith(null, false, 100, 200);
    expect(session).toEqual({ token: 2, count: 100 });
  });

  it("falls through to the sorted open for a named album when the walk returns nothing", async () => {
    mockOpenLimited.mockResolvedValueOnce(null);
    mockOpen.mockResolvedValueOnce({ token: 4, count: 8 });
    const session = await prefetchPhotokitLibraryIndex("album-a");
    expect(mockOpen).toHaveBeenCalledWith("album-a", false, null, null);
    expect(session).toEqual({ token: 4, count: 8 });
  });
});
