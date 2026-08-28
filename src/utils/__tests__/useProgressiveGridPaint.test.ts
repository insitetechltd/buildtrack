import { act, renderHook } from "@testing-library/react-native";

import {
  DEFAULT_PROGRESSIVE_PAINT_BATCH_SIZE,
  useProgressiveGridPaint,
} from "../useProgressiveGridPaint";

describe("useProgressiveGridPaint", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("unlocks the first batch immediately and expands on interval", () => {
    const { result } = renderHook(() =>
      useProgressiveGridPaint({ itemCount: 12, batchSize: 3, intervalMs: 50 }),
    );

    expect(result.current.shouldDecodeIndex(0)).toBe(true);
    expect(result.current.shouldDecodeIndex(2)).toBe(true);
    expect(result.current.shouldDecodeIndex(3)).toBe(false);

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(result.current.shouldDecodeIndex(5)).toBe(true);
    expect(result.current.shouldDecodeIndex(6)).toBe(false);
  });

  it("resets when resetKey changes", () => {
    const { result, rerender } = renderHook(
      ({ resetKey }: { resetKey: string }) =>
        useProgressiveGridPaint({ itemCount: 9, resetKey }),
      { initialProps: { resetKey: "album-a" } },
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current.shouldDecodeIndex(8)).toBe(true);

    rerender({ resetKey: "album-b" });
    expect(result.current.shouldDecodeIndex(2)).toBe(true);
    expect(result.current.shouldDecodeIndex(3)).toBe(false);
  });

  it("ignores viewport until the initial above-the-fold fill completes", () => {
    const { result } = renderHook(() =>
      useProgressiveGridPaint({
        itemCount: 30,
        batchSize: DEFAULT_PROGRESSIVE_PAINT_BATCH_SIZE,
        columns: 3,
        lookaheadRows: 2,
        initialFillCount: 9,
      }),
    );

    expect(result.current.initialFillComplete).toBe(false);
    expect(result.current.shouldDecodeIndex(8)).toBe(false);

    act(() => {
      result.current.onViewableIndicesChanged([18]);
    });

    expect(result.current.shouldDecodeIndex(20)).toBe(false);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.initialFillComplete).toBe(true);

    act(() => {
      result.current.onViewableIndicesChanged([18]);
    });

    expect(result.current.shouldDecodeIndex(20)).toBe(true);
    expect(result.current.shouldDecodeIndex(24)).toBe(true);
    expect(result.current.shouldDecodeIndex(25)).toBe(false);
  });

  it("returns false for out-of-range indices", () => {
    const { result } = renderHook(() =>
      useProgressiveGridPaint({ itemCount: 3 }),
    );

    expect(result.current.shouldDecodeIndex(-1)).toBe(false);
    expect(result.current.shouldDecodeIndex(3)).toBe(false);
  });
});
