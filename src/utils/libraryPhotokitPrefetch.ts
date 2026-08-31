import {
  LIBRARY_FILL_UNTIL_COUNT,
  LIBRARY_GRID_COLUMNS,
} from "@/modules/mediaLibrary/libraryAlbumConstants";
import { LIBRARY_SCROLL_LOOKAHEAD_ITEMS } from "./libraryPickerPerf";

/** Extra rows after the first screen that count as HUD `p2`. */
export const LIBRARY_SECOND_WAVE_ITEMS = LIBRARY_GRID_COLUMNS * 2;

export function photokitIndexInBounds(index: number, count: number): boolean {
  return index >= 0 && index < count;
}

/** Row-based FlatList layout. Do not add ListHeaderComponent height. */
export function photokitGridItemLayout(
  index: number,
  rowHeight: number,
  columns: number = LIBRARY_GRID_COLUMNS,
): { length: number; offset: number; index: number } {
  const cols = Math.max(1, columns);
  const row = Math.floor(index / cols);
  return { length: rowHeight, offset: row * rowHeight, index };
}

export function photokitGridRowCount(
  itemCount: number,
  columns: number = LIBRARY_GRID_COLUMNS,
): number {
  if (itemCount <= 0) {
    return 0;
  }
  return Math.ceil(itemCount / Math.max(1, columns));
}

/** One FlatList row = one getItemLayout entry (avoids 3-column content-size jumps). */
export function photokitGridRowLayout(
  row: number,
  rowHeight: number,
): { length: number; offset: number; index: number } {
  return { length: rowHeight, offset: row * rowHeight, index: row };
}

/**
 * Cache only *ahead* of the first screen / current last visible index.
 * Never include 0..fillUntil-1 (TF 212).
 */
export function photokitLookaheadRange(
  lastVisibleIndex: number,
  itemCount: number,
  fillUntil: number = LIBRARY_FILL_UNTIL_COUNT,
  lookahead: number = LIBRARY_SCROLL_LOOKAHEAD_ITEMS,
): { from: number; to: number } | null {
  if (itemCount <= fillUntil || lookahead < 1) {
    return null;
  }
  // TF 234: lastVisible -1 is pre-viewability — do not cache page 2 during first paint.
  if (lastVisibleIndex < 0) {
    return null;
  }
  const from = Math.max(lastVisibleIndex + 1, fillUntil);
  const to = Math.min(itemCount, from + lookahead);
  if (to <= from) {
    return null;
  }
  return { from, to };
}

/**
 * Paged native path only. Index mode uses shouldBindPhotokitIndexCell.
 */
export function shouldBindPhotokitThumb(
  index: number,
  fillUntil: number,
  visibleMin: number,
  visibleMax: number,
): boolean {
  if (index < fillUntil) {
    return true;
  }
  if (visibleMax < visibleMin) {
    return false;
  }
  return index >= visibleMin && index <= visibleMax;
}

/**
 * Index mode: bind the first screen immediately. Do not requestImage for
 * off-screen windowSize mounts until the user has left the first screen
 * (Grok Gate A — otherwise ~60 parallel decodes starve TF 213).
 * After that, bind whatever FlatList has mounted (no per-cell viewability wait).
 */
export function shouldBindPhotokitIndexCell(
  index: number,
  fillUntil: number,
  bindBeyondFirstScreen: boolean,
): boolean {
  if (index < fillUntil) {
    return true;
  }
  return bindBeyondFirstScreen;
}
