import { useMemo } from "react";
import { Platform, useWindowDimensions } from "react-native";

export const TABLET_CARD_GRID_GAP = 12;
/** Matches `px-4` list padding (16 left + 16 right). */
export const TABLET_CARD_GRID_HORIZONTAL_PADDING = 32;

/**
 * iPhone: 1 column. iPad portrait: 2. iPad landscape: 3.
 * Shared by Tasks + Activity (critical / recent) card grids.
 */
export function useTabletCardGridLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = Platform.OS === "ios" && Platform.isPad;
  const isLandscape = width > height;
  const columnCount = !isTablet ? 1 : isLandscape ? 3 : 2;
  const isGrid = columnCount > 1;

  const itemWidth = useMemo(() => {
    if (!isGrid) {
      return undefined;
    }
    const availableWidth = width - TABLET_CARD_GRID_HORIZONTAL_PADDING;
    const totalGaps = (columnCount - 1) * TABLET_CARD_GRID_GAP;
    return Math.floor((availableWidth - totalGaps) / columnCount);
  }, [columnCount, isGrid, width]);

  return {
    isTablet,
    isLandscape,
    columnCount,
    isGrid,
    itemWidth,
    gap: TABLET_CARD_GRID_GAP,
  };
}
