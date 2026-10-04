import {
  isLibraryCapturePrefetchInFlight,
  resetLibraryCapturePrefetchForTests,
  startLibraryCapturePrefetch,
} from "../libraryCapturePrefetch";

const mockPrefetchIndex = jest.fn(() => Promise.resolve(null));
const mockEnsure = jest.fn(async () => ({ granted: true }));

jest.mock("../libraryIndexPrefetch", () => ({
  prefetchPhotokitLibraryIndex: (...args: unknown[]) =>
    mockPrefetchIndex(...args),
}));

jest.mock("../mediaLibraryPermission", () => ({
  ensureMediaLibraryChecked: (...args: unknown[]) => mockEnsure(...args),
}));

describe("startLibraryCapturePrefetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLibraryCapturePrefetchForTests();
    mockEnsure.mockResolvedValue({ granted: true });
    mockPrefetchIndex.mockReturnValue(Promise.resolve(null));
  });

  it("checks permission and does not start a library walk from the camera tab", async () => {
    startLibraryCapturePrefetch();
    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();
    expect(mockEnsure).toHaveBeenCalledTimes(1);
    expect(mockPrefetchIndex).not.toHaveBeenCalled();
    expect(isLibraryCapturePrefetchInFlight()).toBe(false);
  });

  it("still checks permission when access is denied", async () => {
    mockEnsure.mockResolvedValue({ granted: false });
    startLibraryCapturePrefetch();
    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();
    expect(mockEnsure).toHaveBeenCalledTimes(1);
    expect(mockPrefetchIndex).not.toHaveBeenCalled();
  });

  it("single-flights overlapping capture prefetch calls", async () => {
    let releaseEnsure!: (value: { granted: boolean }) => void;
    mockEnsure.mockImplementation(
      () =>
        new Promise<{ granted: boolean }>((resolve) => {
          releaseEnsure = resolve;
        }),
    );
    startLibraryCapturePrefetch();
    startLibraryCapturePrefetch();
    await new Promise((r) => setTimeout(r, 0));
    expect(mockEnsure).toHaveBeenCalledTimes(1);
    expect(isLibraryCapturePrefetchInFlight()).toBe(true);
    releaseEnsure({ granted: true });
    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();
    expect(mockPrefetchIndex).not.toHaveBeenCalled();
    expect(isLibraryCapturePrefetchInFlight()).toBe(false);
  });
});
