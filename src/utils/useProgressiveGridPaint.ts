import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_PROGRESSIVE_PAINT_BATCH_SIZE = 3;
/** Intentionally shared with FlatList `updateCellsBatchingPeriod` in library grids. */
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
  /**
   * Indices 0..initialFillCount-1 unlock via the pump only until complete.
   * Viewport bypass is ignored until then so FlatList's first viewability
   * callback does not decode the whole above-the-fold grid at once.
   */
  initialFillCount?: number;
};

export type UseProgressiveGridPaintResult = {
  /** True when the tile at `index` may bind a PhotoKit / network image URI. */
  shouldDecodeIndex: (index: number) => boolean;
  /** Feed FlatList viewable item indices (and neighbors) to bypass the paint gate. */
  onViewableIndicesChanged: (indices: number[]) => void;
  /** Highest index unlocked by the progressive pump (diagnostics / tests). */
  maxUnlockedIndex: number;
  /** Pump finished unlocking the configured initial above-the-fold window. */
  initialFillComplete: boolean;
};

function computeInitialUnlock(batchSize: number, itemCount: number): number {
  return Math.max(0, Math.min(batchSize - 1, Math.max(itemCount - 1, 0)));
}

/**
 * Spreads thumbnail decode work across frames for device photo library grids.
 * Viewport bypass activates only after the initial fill window completes so
 * fast scroll still gets lookahead without defeating the first-paint cadence.
 *
 * Reset semantics: full reset on `resetKey` change or fresh load (0 → N).
 * Pagination (N → N+M, same key) preserves earned unlock state.
 */
export function useProgressiveGridPaint({
  itemCount,
  batchSize = DEFAULT_PROGRESSIVE_PAINT_BATCH_SIZE,
  intervalMs = DEFAULT_PROGRESSIVE_PAINT_INTERVAL_MS,
  resetKey = "",
  columns = 3,
  lookaheadRows = 2,
  initialFillCount = batchSize * 3,
}: UseProgressiveGridPaintOptions): UseProgressiveGridPaintResult {
  const initialUnlockTarget = Math.max(
    0,
    Math.min(initialFillCount - 1, Math.max(itemCount - 1, 0)),
  );
  const initialUnlock = computeInitialUnlock(batchSize, itemCount);
  const [maxUnlockedIndex, setMaxUnlockedIndex] = useState(initialUnlock);
  const [priorityIndices, setPriorityIndices] = useState<Set<number>>(() => new Set());
  const [initialFillComplete, setInitialFillComplete] = useState(
    () => itemCount > 0 && initialUnlock >= initialUnlockTarget,
  );
  const pumpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevResetKeyRef = useRef(resetKey);
  const prevItemCountRef = useRef(itemCount);

  useEffect(() => {
    const resetKeyChanged = prevResetKeyRef.current !== resetKey;
    const previousCount = prevItemCountRef.current;
    const freshLoad = previousCount === 0 && itemCount > 0;

    if (resetKeyChanged || freshLoad) {
      const nextInitial = computeInitialUnlock(batchSize, itemCount);
      setMaxUnlockedIndex(nextInitial);
      setPriorityIndices(new Set());
      setInitialFillComplete(itemCount > 0 && nextInitial >= initialUnlockTarget);
    } else if (itemCount === 0) {
      setMaxUnlockedIndex(0);
      setPriorityIndices(new Set());
      setInitialFillComplete(false);
    } else if (itemCount > previousCount) {
      // Pagination append — keep unlock/priority state; pump continues below.
    } else if (itemCount < previousCount) {
      setMaxUnlockedIndex((current) => Math.min(current, Math.max(itemCount - 1, 0)));
      setPriorityIndices((current) => {
        const next = new Set<number>();
        current.forEach((index) => {
          if (index < itemCount) {
            next.add(index);
          }
        });
        return next;
      });
    }

    prevResetKeyRef.current = resetKey;
    prevItemCountRef.current = itemCount;
  }, [batchSize, initialUnlockTarget, itemCount, resetKey]);

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

  useEffect(() => {
    if (itemCount <= 0 || maxUnlockedIndex < itemCount - 1) {
      return;
    }
    if (pumpTimerRef.current) {
      clearInterval(pumpTimerRef.current);
      pumpTimerRef.current = null;
    }
  }, [itemCount, maxUnlockedIndex]);

  useEffect(() => {
    if (maxUnlockedIndex >= initialUnlockTarget) {
      setInitialFillComplete(true);
    }
  }, [initialUnlockTarget, maxUnlockedIndex]);

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
      if (indices.length === 0 || !initialFillComplete) {
        return;
      }

      const lookahead = Math.max(0, lookaheadRows) * Math.max(1, columns);
      setPriorityIndices((current) => {
        const next = new Set(current);
        let changed = false;
        for (const index of indices) {
          const upper = Math.min(itemCount - 1, index + lookahead);
          for (let cursor = index; cursor <= upper; cursor += 1) {
            if (!next.has(cursor)) {
              next.add(cursor);
              changed = true;
            }
          }
        }
        return changed ? next : current;
      });
    },
    [columns, initialFillComplete, itemCount, lookaheadRows],
  );

  return {
    shouldDecodeIndex,
    onViewableIndicesChanged,
    maxUnlockedIndex,
    initialFillComplete,
  };
}
