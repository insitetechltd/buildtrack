import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_PROGRESSIVE_PAINT_BATCH_SIZE = 3;
export const DEFAULT_PROGRESSIVE_PAINT_INTERVAL_MS = 48;

export type UseProgressiveGridPaintOptions = {
  /** Total grid items currently rendered. */
  itemCount: number;
  /** How many new indices to unlock each tick. */
  batchSize?: number;
  /** Milliseconds between unlock ticks. */
  intervalMs?: number;
  /** Changing this resets the paint cursor (e.g. album id). */
  resetKey?: string;
  /** Columns in the grid — used for viewport lookahead rows. */
  columns?: number;
  /** Extra rows beyond the viewport to eagerly unlock while scrolling. */
  lookaheadRows?: number;
};

export type UseProgressiveGridPaintResult = {
  /** True when the tile at `index` may bind a PhotoKit / network image URI. */
  shouldDecodeIndex: (index: number) => boolean;
  /** Feed FlatList viewable item indices (and neighbors) to bypass the paint gate. */
  onViewableIndicesChanged: (indices: number[]) => void;
  /** Highest index unlocked by the progressive pump (diagnostics / tests). */
  maxUnlockedIndex: number;
};

/**
 * Spreads thumbnail decode work across frames for device photo library grids.
 * Viewport indices always decode immediately so fast scroll does not show blanks.
 */
export function useProgressiveGridPaint({
  itemCount,
  batchSize = DEFAULT_PROGRESSIVE_PAINT_BATCH_SIZE,
  intervalMs = DEFAULT_PROGRESSIVE_PAINT_INTERVAL_MS,
  resetKey = "",
  columns = 3,
  lookaheadRows = 2,
}: UseProgressiveGridPaintOptions): UseProgressiveGridPaintResult {
  const initialUnlock = Math.max(0, Math.min(batchSize - 1, itemCount - 1));
  const [maxUnlockedIndex, setMaxUnlockedIndex] = useState(initialUnlock);
  const [priorityIndices, setPriorityIndices] = useState<Set<number>>(() => new Set());
  const pumpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMaxUnlockedIndex(Math.max(0, Math.min(batchSize - 1, Math.max(itemCount - 1, 0))));
    setPriorityIndices(new Set());
  }, [batchSize, itemCount, resetKey]);

  useEffect(() => {
    if (pumpTimerRef.current) {
      clearInterval(pumpTimerRef.current);
      pumpTimerRef.current = null;
    }

    if (itemCount <= 0) {
      return;
    }

    pumpTimerRef.current = setInterval(() => {
      setMaxUnlockedIndex((current) => {
        if (current >= itemCount - 1) {
          if (pumpTimerRef.current) {
            clearInterval(pumpTimerRef.current);
            pumpTimerRef.current = null;
          }
          return current;
        }
        return Math.min(current + batchSize, itemCount - 1);
      });
    }, intervalMs);

    return () => {
      if (pumpTimerRef.current) {
        clearInterval(pumpTimerRef.current);
        pumpTimerRef.current = null;
      }
    };
  }, [batchSize, intervalMs, itemCount, resetKey]);

  const shouldDecodeIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= itemCount) {
        return false;
      }
      return index <= maxUnlockedIndex || priorityIndices.has(index);
    },
    [itemCount, maxUnlockedIndex, priorityIndices],
  );

  const onViewableIndicesChanged = useCallback(
    (indices: number[]) => {
      if (indices.length === 0) {
        return;
      }

      const lookahead = Math.max(0, lookaheadRows) * Math.max(1, columns);
      setPriorityIndices((current) => {
        const next = new Set(current);
        for (const index of indices) {
          const upper = Math.min(itemCount - 1, index + lookahead);
          for (let cursor = index; cursor <= upper; cursor += 1) {
            next.add(cursor);
          }
        }
        return next;
      });
    },
    [columns, itemCount, lookaheadRows],
  );

  return {
    shouldDecodeIndex,
    onViewableIndicesChanged,
    maxUnlockedIndex,
  };
}
