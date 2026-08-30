import { startLibraryCapturePrefetch } from "../libraryCapturePrefetch";
import { isLibraryPickerNative2b } from "../libraryPickerPerf";

const mockWarm = jest.fn(async () => undefined);
const mockPrefetchIndex = jest.fn(() => Promise.resolve(null));
const mockEnsure = jest.fn(async () => ({ granted: true }));
const mockIs2b = isLibraryPickerNative2b as jest.MockedFunction<
  typeof isLibraryPickerNative2b
>;

jest.mock("../libraryWarmPrefetch", () => ({
  warmLibraryFirstPage: (...args: unknown[]) => mockWarm(...args),
}));

jest.mock("../libraryIndexPrefetch", () => ({
  prefetchPhotokitLibraryIndex: (...args: unknown[]) =>
    mockPrefetchIndex(...args),
}));

jest.mock("../mediaLibraryPermission", () => ({
  ensureMediaLibraryChecked: (...args: unknown[]) => mockEnsure(...args),
}));

jest.mock("../libraryPickerPerf", () => ({
  isLibraryPickerNative2b: jest.fn(() => false),
}));

describe("startLibraryCapturePrefetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsure.mockResolvedValue({ granted: true });
    mockWarm.mockResolvedValue(undefined);
    mockPrefetchIndex.mockReturnValue(Promise.resolve(null));
    mockIs2b.mockReturnValue(false);
  });

  it("awaits warm before starting openLibrary prefetch", async () => {
    const order: string[] = [];
    mockWarm.mockImplementation(async () => {
      order.push("warm");
    });
    mockPrefetchIndex.mockImplementation(() => {
      order.push("index");
      return Promise.resolve(null);
    });

    startLibraryCapturePrefetch();
    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();
    await Promise.resolve();

    expect(order).toEqual(["warm", "index"]);
  });

  it("warms then indexes on native2b path (serialized first paint)", async () => {
    mockIs2b.mockReturnValue(true);
    const order: string[] = [];
    mockWarm.mockImplementation(async () => {
      order.push("warm");
    });
    mockPrefetchIndex.mockImplementation(() => {
      order.push("index");
      return Promise.resolve(null);
    });
    startLibraryCapturePrefetch();
    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();
    await Promise.resolve();
    expect(order).toEqual(["warm", "index"]);
  });

  it("skips warm and index when permission denied", async () => {
    mockEnsure.mockResolvedValue({ granted: false });
    startLibraryCapturePrefetch();
    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();
    expect(mockWarm).not.toHaveBeenCalled();
    expect(mockPrefetchIndex).not.toHaveBeenCalled();
  });

  it("single-flights overlapping capture prefetch calls", async () => {
    let releaseWarm!: () => void;
    mockWarm.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseWarm = resolve;
        }),
    );
    startLibraryCapturePrefetch();
    startLibraryCapturePrefetch();
    await new Promise((r) => setTimeout(r, 0));
    expect(mockWarm).toHaveBeenCalledTimes(1);
    releaseWarm();
    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();
    expect(mockPrefetchIndex).toHaveBeenCalledTimes(1);
  });
});
