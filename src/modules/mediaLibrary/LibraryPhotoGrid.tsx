import React, { memo, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  PixelRatio,
  type ViewToken,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import type * as MediaLibrary from "expo-media-library";

import {
  computeLibraryThumbPixelSize,
  prefetchLibraryThumbnails,
} from "@/utils/libraryThumbnailCache";
import {
  LIBRARY_GRID_BATCH_MS,
  LIBRARY_SCROLL_LOOKAHEAD_ITEMS,
  LIBRARY_THUMB_PRIORITY_VIEWPORT,
  LIBRARY_VIEWABILITY_MIN_TIME_MS,
  LIBRARY_VIEWABILITY_THRESHOLD,
} from "@/utils/libraryPickerPerf";
import { useLibraryThumbnailUri } from "@/utils/useLibraryThumbnailUri";
import {
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

const LibraryGridTile = memo(function LibraryGridTile({
  assetId,
  uri,
  tileSize,
  thumbPixelSize,
  selected,
  order,
  onPress,
  testIdPrefix,
  theme,
}: {
  assetId: string;
  uri: string;
  tileSize: number;
  thumbPixelSize: number;
  selected: boolean;
  order: number | undefined;
  onPress: (assetId: string) => void;
  testIdPrefix: string;
  theme: LibraryGridTileTheme;
}) {
  const thumbUri = useLibraryThumbnailUri(assetId, thumbPixelSize, uri, true);
  const displayUri = thumbUri ?? null;

  return (
    <Pressable
      testID={`${testIdPrefix}__tile_${assetId}`}
      onPress={() => onPress(assetId)}
      style={{ width: tileSize, height: tileSize, marginBottom: LIBRARY_GRID_GAP }}
    >
      {displayUri ? (
        <Image
          source={{ uri: displayUri }}
          resizeMode="cover"
          style={{ width: tileSize, height: tileSize }}
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

  const thumbPixelSize = useMemo(
    () => computeLibraryThumbPixelSize(tileSize, PixelRatio.get()),
    [tileSize],
  );

  const rowHeight = tileSize + LIBRARY_GRID_GAP;

  const prefetchScrollAhead = useCallback(
    (indices: number[]) => {
      if (indices.length === 0 || assets.length === 0) {
        return;
      }
      const minIndex = Math.min(...indices);
      const maxIndex = Math.max(...indices);
      const end = Math.min(
        assets.length - 1,
        maxIndex + LIBRARY_SCROLL_LOOKAHEAD_ITEMS,
      );
      const requests = [];
      for (let index = minIndex; index <= end; index += 1) {
        const asset = assets[index];
        if (!asset) {
          continue;
        }
        requests.push({
          assetId: asset.id,
          pixelSize: thumbPixelSize,
          fallbackUri: asset.uri,
          shouldDownloadFromNetwork: false,
          priority: LIBRARY_THUMB_PRIORITY_VIEWPORT,
        });
      }
      prefetchLibraryThumbnails(requests);
    },
    [assets, thumbPixelSize],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const indices = viewableItems
        .map((token) => token.index)
        .filter((index): index is number => typeof index === "number");
      prefetchScrollAhead(indices);
    },
    [prefetchScrollAhead],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: LIBRARY_VIEWABILITY_THRESHOLD,
    minimumViewTime: LIBRARY_VIEWABILITY_MIN_TIME_MS,
  }).current;

  const extraData = useMemo(
    () => ({ selectedIds, selectionOrderByKey }),
    [selectedIds, selectionOrderByKey],
  );

  const renderItem = useCallback(
    ({ item }: { item: MediaLibrary.Asset }) => (
      <LibraryGridTile
        assetId={item.id}
        uri={item.uri}
        tileSize={tileSize}
        thumbPixelSize={thumbPixelSize}
        selected={selectedIds.has(item.id)}
        order={selectionOrderByKey.get(item.id)}
        onPress={onPressAsset}
        testIdPrefix={testIdPrefix}
        theme={theme}
      />
    ),
    [
      onPressAsset,
      selectedIds,
      selectionOrderByKey,
      testIdPrefix,
      theme,
      thumbPixelSize,
      tileSize,
    ],
  );

  if (assets.length === 0 && !loadingPage) {
    return (
      <View style={styles.emptyWrap}>
        {ListHeaderComponent}
        <Text style={styles.emptyAlbum}>No photos in this album</Text>
      </View>
    );
  }

  return (
    <View style={styles.listRoot} testID={listTestID}>
      <FlashList
        data={assets}
        keyExtractor={(item) => item.id}
        numColumns={LIBRARY_GRID_COLUMNS}
        estimatedItemSize={rowHeight}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        extraData={extraData}
        drawDistance={rowHeight * 8}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={
          loadingPage ? (
            <ActivityIndicator
              style={{ marginVertical: 16 }}
              color={theme.loadingIndicator}
            />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
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
