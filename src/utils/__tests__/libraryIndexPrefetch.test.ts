import {
  clearPhotokitLibraryIndexPrefetch,
  peekPhotokitLibraryIndex,
  prefetchPhotokitLibraryIndex,
} from "../libraryIndexPrefetch";

const mockOpen = jest.fn(async () => ({ token: 2, count: 100 }));
const mockOpenLimited = jest.fn(async () => ({ token: 5, count: 60 }));
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
  LIBRARY_PICKER_2B_FIRST_BATCH: 60,
  isLibraryPickerNative2b: () => mockIs2b(),
}));

describe("libraryIndexPrefetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPhotokitLibraryIndexPrefetch();
    mockIs2b.mockReturnValue(false);
    mockIs2bApi.mockReturnValue(true);
    mockOpen.mockResolvedValue({ token: 2, count: 100 });
    mockOpenLimited.mockResolvedValue({ token: 5, count: 60 });
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

  it("native2b returns limited session then expands same token", async () => {
    mockIs2b.mockReturnValue(true);
    const limited = await prefetchPhotokitLibraryIndex(null);
    expect(limited).toEqual({ token: 5, count: 60 });
    expect(mockOpenLimited).toHaveBeenCalledWith(null, 60);
    expect(mockOpen).not.toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();
    expect(mockExpand).toHaveBeenCalledWith(5);
    expect(peekPhotokitLibraryIndex(null)).toEqual({ token: 5, count: 50000 });
  });
});
