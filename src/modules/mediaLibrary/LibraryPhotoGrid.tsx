import React, { memo, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useWindowDimensions,
  type ViewToken,
} from "react-native";
import type * as MediaLibrary from "expo-media-library";

import { libraryGridDisplayUri } from "@/utils/libraryDisplayUri";
import {
  LIBRARY_GRID_BATCH_MS,
  LIBRARY_GRID_BATCH_ROWS,
  LIBRARY_GRID_INITIAL_ROWS,
  LIBRARY_GRID_WINDOW_SIZE,
  LIBRARY_PAINT_BATCH_SIZE,
  LIBRARY_PAINT_INTERVAL_MS,
  LIBRARY_VIEWABILITY_MIN_TIME_MS,
  LIBRARY_VIEWABILITY_THRESHOLD,
} from "@/utils/libraryPickerPerf";
import { markLibraryPickerTilePainted } from "@/utils/libraryPickerTiming";
import { useProgressiveGridPaint } from "@/utils/useProgressiveGridPaint";
import {
  LIBRARY_FILL_UNTIL_COUNT,
  LIBRARY_GRID_COLUMNS,
  LIBRARY_GRID_GAP,
} from "./libraryAlbumConstants";

export type LibraryGridTileTheme = {
  skeletonColor: string;
  badgeBackground: string;
  badgeText: string;
  loadingIndicator: string;
};

const DEFAULT_THEME: LibraryGridTileTheme = {
  skeletonColor: "#E2E8F0",
  badgeBackground: "#08576E",
  badgeText: "#fff",
  loadingIndicator: "#08576E",
};

const VIEWABILITY_CONFIG = {
  minimumViewTime: LIBRARY_VIEWABILITY_MIN_TIME_MS,
  itemVisiblePercentThreshold: LIBRARY_VIEWABILITY_THRESHOLD,
};

type GridListItem =
  | { kind: "asset"; id: string; asset: MediaLibrary.Asset; index: number }
  | { kind: "placeholder"; id: string; index: number };

const LibraryGridTile = memo(function LibraryGridTile({
  assetId,
  uri,
  tileSize,
  selected,
  order,
  bindImage,
  onPress,
  testIdPrefix,
  theme,
}: {
  assetId: string;
  uri: string;
  tileSize: number;
  selected: boolean;
  order: number | undefined;
  bindImage: boolean;
  onPress: (assetId: string) => void;
  testIdPrefix: string;
  theme: LibraryGridTileTheme;
}) {
  const displayUri = bindImage ? libraryGridDisplayUri(uri) : null;

  return (
    <Pressable
      testID={`${testIdPrefix}__tile_${assetId}`}
      onPress={() => onPress(assetId)}
      style={{ width: tileSize, height: tileSize, marginBottom: LIBRARY_GRID_GAP }}
    >
      {displayUri ? (
        <Image
          testID={`${testIdPrefix}__tile_image_${assetId}`}
          source={{ uri: displayUri }}
          resizeMode="cover"
          style={{ width: tileSize, height: tileSize }}
          onLoad={() => markLibraryPickerTilePainted(assetId)}
        />
      ) : (
        <View
          testID={`${testIdPrefix}__tile_skeleton_${assetId}`}
          style={[
            styles.tileSkeleton,
            { width: tileSize, height: tileSize, backgroundColor: theme.skeletonColor },
          ]}
        />
      )}
      {selected && order != null ? (
        <View
          testID={`${testIdPrefix}__order_badge_${assetId}`}
          style={[styles.orderBadge, { backgroundColor: theme.badgeBackground }]}
          accessibilityLabel={`Selected ${order}`}
        >
          <Text style={[styles.orderBadgeText, { color: theme.badgeText }]}>
            {order}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
});

const LibraryPlaceholderTile = memo(function LibraryPlaceholderTile({
  id,
  tileSize,
  testIdPrefix,
  theme,
}: {
  id: string;
  tileSize: number;
  testIdPrefix: string;
  theme: LibraryGridTileTheme;
}) {
  return (
    <View
      testID={`${testIdPrefix}__tile_skeleton_${id}`}
      style={{
        width: tileSize,
        height: tileSize,
        marginBottom: LIBRARY_GRID_GAP,
        backgroundColor: theme.skeletonColor,
      }}
    />
  );
});

export type LibraryPhotoGridProps = {
  assets: MediaLibrary.Asset[];
  loadingPage: boolean;
  onEndReached: () => void;
  selectedIds: Set<string>;
  selectionOrderByKey: Map<string, number>;
  onPressAsset: (assetId: string) => void;
  testIdPrefix: string;
  theme?: Partial<LibraryGridTileTheme>;
  contentPaddingBottom?: number;
  ListHeaderComponent?: React.ReactElement | null;
  listTestID?: string;
  /** Instant first-screen chrome while metadata is still loading. */
  placeholderCount?: number;
  /** Album / session key — resets URI stagger. */
  paintResetKey?: string;
};

export function LibraryPhotoGrid({
  assets,
  loadingPage,
  onEndReached,
  selectedIds,
  selectionOrderByKey,
  onPressAsset,
  testIdPrefix,
  theme: themeOverride,
  contentPaddingBottom = 24,
  ListHeaderComponent,
  listTestID,
  placeholderCount = 0,
  paintResetKey = "",
}: LibraryPhotoGridProps) {
  const { width } = useWindowDimensions();
  const theme = useMemo(
    () => ({ ...DEFAULT_THEME, ...themeOverride }),
    [themeOverride],
  );

  const tileSize = useMemo(
    () => (width - LIBRARY_GRID_GAP * (LIBRARY_GRID_COLUMNS - 1)) / LIBRARY_GRID_COLUMNS,
    [width],
  );

  const paint = useProgressiveGridPaint({
    itemCount: assets.length,
    batchSize: LIBRARY_PAINT_BATCH_SIZE,
    intervalMs: LIBRARY_PAINT_INTERVAL_MS,
    resetKey: paintResetKey,
    columns: LIBRARY_GRID_COLUMNS,
    initialFillCount: LIBRARY_FILL_UNTIL_COUNT,
  });

  const extraData = useMemo(
    () => ({
      selectedIds,
      selectionOrderByKey,
      maxUnlockedIndex: paint.maxUnlockedIndex,
    }),
    [paint.maxUnlockedIndex, selectedIds, selectionOrderByKey],
  );

  const listData = useMemo((): GridListItem[] => {
    if (assets.length > 0) {
      return assets.map((asset, index) => ({
        kind: "asset",
        id: asset.id,
        asset,
        index,
      }));
    }
    if (placeholderCount > 0) {
      return Array.from({ length: placeholderCount }, (_, index) => ({
        kind: "placeholder" as const,
        id: `__sk_${index}`,
        index,
      }));
    }
    return [];
  }, [assets, placeholderCount]);

  const viewabilityRef = useRef(paint.onViewableIndicesChanged);
  viewabilityRef.current = paint.onViewableIndicesChanged;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const indices = viewableItems
        .map((token) => token.index)
        .filter((index): index is number => typeof index === "number");
      viewabilityRef.current(indices);
    },
    [],
  );

  const handleEndReached = useCallback(() => {
    if (assets.length === 0) {
      return;
    }
    onEndReached();
  }, [assets.length, onEndReached]);

  const renderItem = useCallback(
    ({ item }: { item: GridListItem }) => {
      if (item.kind === "placeholder") {
        return (
          <LibraryPlaceholderTile
            id={item.id}
            tileSize={tileSize}
            testIdPrefix={testIdPrefix}
            theme={theme}
          />
        );
      }
      return (
        <LibraryGridTile
          assetId={item.asset.id}
          uri={item.asset.uri}
          tileSize={tileSize}
          selected={selectedIds.has(item.asset.id)}
          order={selectionOrderByKey.get(item.asset.id)}
          bindImage={paint.shouldDecodeIndex(item.index)}
          onPress={onPressAsset}
          testIdPrefix={testIdPrefix}
          theme={theme}
        />
      );
    },
    [
      onPressAsset,
      paint.shouldDecodeIndex,
      selectedIds,
      selectionOrderByKey,
      testIdPrefix,
      theme,
      tileSize,
    ],
  );

  if (assets.length === 0 && placeholderCount === 0 && !loadingPage) {
    return (
      <View style={styles.emptyWrap}>
        {ListHeaderComponent}
        <Text style={styles.emptyAlbum}>No photos in this album</Text>
      </View>
    );
  }

  return (
    <View style={styles.listRoot} testID={listTestID}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        numColumns={LIBRARY_GRID_COLUMNS}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        extraData={extraData}
        initialNumToRender={LIBRARY_GRID_INITIAL_ROWS * LIBRARY_GRID_COLUMNS}
        maxToRenderPerBatch={LIBRARY_GRID_BATCH_ROWS * LIBRARY_GRID_COLUMNS}
        updateCellsBatchingPeriod={LIBRARY_GRID_BATCH_MS}
        windowSize={LIBRARY_GRID_WINDOW_SIZE}
        removeClippedSubviews={Platform.OS === "ios"}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={
          loadingPage && assets.length >= LIBRARY_FILL_UNTIL_COUNT ? (
            <ActivityIndicator
              style={{ marginVertical: 16 }}
              color={theme.loadingIndicator}
            />
          ) : null
        }
        columnWrapperStyle={listData.length ? { gap: LIBRARY_GRID_GAP } : undefined}
        contentContainerStyle={{
          gap: LIBRARY_GRID_GAP,
          paddingBottom: contentPaddingBottom,
        }}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listRoot: {
    flex: 1,
  },
  emptyWrap: {
    flex: 1,
  },
  emptyAlbum: {
    textAlign: "center",
    color: "#888",
    marginTop: 32,
    fontSize: 14,
  },
  tileSkeleton: {
    backgroundColor: "#E2E8F0",
  },
  orderBadge: {
    position: "absolute",
    right: 6,
    top: 6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  orderBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
