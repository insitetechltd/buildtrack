import { act, renderHook } from "@testing-library/react-native";
import { useUnattachedPhotoBatchStore } from "../unattachedPhotoBatchStore";

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe("unattachedPhotoBatchStore", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    useUnattachedPhotoBatchStore.setState({
      batches: [],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("addBatch -> getBatchesForProject returns 1 batch for matching project", () => {
    jest.setSystemTime(new Date("2026-08-05T10:00:00.000Z"));
    const { result } = renderHook(() => useUnattachedPhotoBatchStore());

    act(() => {
      result.current.addBatch({
        id: "batch-1",
        projectId: "proj-1",
        companyId: "co-1",
        userId: "u-1",
        photoUrls: ["https://example.com/1.jpg"],
        captions: ["Front view"],
        savedAt: Date.now(),
      });
    });

    const found = result.current.getBatchesForProject("proj-1");
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe("batch-1");
    expect(found[0].captions).toEqual(["Front view"]);
  });

  it("dismissBatch removes a batch by id", () => {
    jest.setSystemTime(new Date("2026-08-05T10:00:00.000Z"));
    const { result } = renderHook(() => useUnattachedPhotoBatchStore());

    act(() => {
      result.current.addBatch({
        id: "batch-1",
        projectId: "proj-1",
        companyId: "co-1",
        userId: "u-1",
        photoUrls: ["https://example.com/1.jpg"],
        captions: [],
        savedAt: Date.now(),
      });
    });

    act(() => {
      result.current.dismissBatch("batch-1");
    });

    expect(result.current.getBatchesForProject("proj-1")).toHaveLength(0);
  });

  it("excludes batches older than 5 days from getBatchesForProject", () => {
    const NOW = new Date("2026-08-07T10:00:00.000Z");
    jest.setSystemTime(NOW);
    const NOW_MS = NOW.getTime();
    const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
    const { result } = renderHook(() => useUnattachedPhotoBatchStore());

    act(() => {
      result.current.addBatch({
        id: "fresh",
        projectId: "proj-1",
        companyId: "co-1",
        userId: "u-1",
        photoUrls: ["https://example.com/fresh.jpg"],
        captions: [],
        savedAt: NOW_MS - 2 * 24 * 60 * 60 * 1000,
      });
      result.current.addBatch({
        id: "old",
        projectId: "proj-1",
        companyId: "co-1",
        userId: "u-1",
        photoUrls: ["https://example.com/old.jpg"],
        captions: [],
        savedAt: NOW_MS - (FIVE_DAYS_MS + 1),
      });
    });

    const found = result.current.getBatchesForProject("proj-1");
    expect(found.map((b) => b.id)).toEqual(["fresh"]);
  });

  it("does not include batches for other projects in getBatchesForProject", () => {
    jest.setSystemTime(new Date("2026-08-05T10:00:00.000Z"));
    const { result } = renderHook(() => useUnattachedPhotoBatchStore());

    act(() => {
      result.current.addBatch({
        id: "batch-a",
        projectId: "proj-1",
        companyId: "co-1",
        userId: "u-1",
        photoUrls: ["https://example.com/a.jpg"],
        captions: [],
        savedAt: Date.now(),
      });
      result.current.addBatch({
        id: "batch-b",
        projectId: "proj-2",
        companyId: "co-1",
        userId: "u-1",
        photoUrls: ["https://example.com/b.jpg"],
        captions: [],
        savedAt: Date.now(),
      });
    });

    expect(result.current.getBatchesForProject("proj-1").map((b) => b.id)).toEqual(["batch-a"]);
    expect(result.current.getBatchesForProject("proj-2").map((b) => b.id)).toEqual(["batch-b"]);
    expect(result.current.getBatchesForProject("proj-99")).toHaveLength(0);
  });
});
