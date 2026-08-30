import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
  PixelRatio,
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
  LIBRARY_BRIDGE_PAINT_BATCH_SIZE,
  LIBRARY_BRIDGE_PAINT_INTERVAL_MS,
  LIBRARY_PAINT_BATCH_SIZE,
  LIBRARY_PAINT_INTERVAL_MS,
  LIBRARY_SKELETON_MIN_ROWS,
  LIBRARY_VIEWABILITY_MIN_TIME_MS,
  LIBRARY_VIEWABILITY_THRESHOLD,
} from "@/utils/libraryPickerPerf";
import {
  beginLibraryPickerScrollUp,
  markLibraryPickerTilePainted,
} from "@/utils/libraryPickerTiming";
import { useProgressiveGridPaint } from "@/utils/useProgressiveGridPaint";
import {
  getPhotokitThumbNativeView,
  isPhotokitThumbsAvailable,
  photokitIdAt,
  startPhotokitRangeCaching,
  startPhotokitThumbCaching,
  stopPhotokitThumbCaching,
  type PhotokitLibrarySession,
} from "./PhotokitThumbView";
import {
  photokitGridRowCount,
  photokitGridRowLayout,
  photokitLookaheadRange,
  LIBRARY_SECOND_WAVE_ITEMS,
} from "@/utils/libraryPhotokitPrefetch";
import {
  LIBRARY_FILL_UNTIL_COUNT,
  LIBRARY_GRID_COLUMNS,
  LIBRARY_GRID_GAP,
  LIBRARY_PREFETCH_UNTIL_COUNT,
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
  pixelSize,
  selected,
  order,
  bindImage,
  useNativeThumb,
  photokitToken,
  photokitIndex,
  onPress,
  testIdPrefix,
  theme,
  bottomGap = LIBRARY_GRID_GAP,
  marginRight = 0,
}: {
  assetId: string;
  uri: string;
  tileSize: number;
  pixelSize: number;
  selected: boolean;
  order: number | undefined;
  bindImage: boolean;
  useNativeThumb: boolean;
  photokitToken?: number;
  photokitIndex?: number;
  bottomGap?: number;
  marginRight?: number;
  onPress: (assetId: string) => void;
  testIdPrefix: string;
  theme: LibraryGridTileTheme;
}) {
  const indexMode = photokitToken != null && photokitIndex != null;
  const displayUri = bindImage && !useNativeThumb ? libraryGridDisplayUri(uri) : null;
  const NativeThumb = useNativeThumb ? getPhotokitThumbNativeView() : null;

  return (
    <Pressable
      testID={`${testIdPrefix}__tile_${assetId}`}
      onPress={() => {
        if (assetId.startsWith("__idx_") || assetId.startsWith("__sk_")) {
          return;
        }
        onPress(assetId);
      }}
      style={{
        width: tileSize,
        height: tileSize,
        marginBottom: bottomGap,
        marginRight,
      }}
    >
      {bindImage && NativeThumb ? (
        <View style={{ width: tileSize, height: tileSize }}>
          <View
            testID={`${testIdPrefix}__tile_skeleton_${assetId}`}
            style={[
              styles.tileSkeleton,
              StyleSheet.absoluteFillObject,
              { backgroundColor: theme.skeletonColor },
            ]}
          />
          <NativeThumb
            testID={`${testIdPrefix}__tile_image_${assetId}`}
            {...(indexMode
              ? { token: photokitToken, index: photokitIndex }
              : { assetId })}
            pixelSize={pixelSize}
            style={StyleSheet.absoluteFillObject}
            onPainted={() => markLibraryPickerTilePainted(assetId)}
          />
        </View>
      ) : displayUri ? (
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
  /** Native PHFetchResult session — virtual count, no JS Asset page. */
  indexSession?: PhotokitLibrarySession | null;
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
  indexSession = null,
}: LibraryPhotoGridProps) {
  const { width } = useWindowDimensions();
  const theme = useMemo(
    () => ({ ...DEFAULT_THEME, ...themeOverride }),
    [themeOverride],
  );

  const tileSize = useMemo(() => {
    const inner = width - LIBRARY_GRID_GAP * (LIBRARY_GRID_COLUMNS - 1);
    return Math.max(1, Math.floor(inner / LIBRARY_GRID_COLUMNS));
  }, [width]);
  const pixelSize = useMemo(
    () => Math.max(1, Math.round(tileSize * PixelRatio.get())),
    [tileSize],
  );
  const rowHeight = tileSize + LIBRARY_GRID_GAP;
  const indexMode = indexSession != null;
  const indexCount = indexSession?.count ?? 0;
  const indexToken = indexSession?.token ?? 0;
  const useNativeThumbs = isPhotokitThumbsAvailable();

  const indexInitialFill =
    LIBRARY_FILL_UNTIL_COUNT + LIBRARY_SECOND_WAVE_ITEMS;

  const paint = useProgressiveGridPaint({
    itemCount: indexMode ? indexCount : assets.length,
    batchSize: indexMode ? LIBRARY_PAINT_BATCH_SIZE : LIBRARY_BRIDGE_PAINT_BATCH_SIZE,
    intervalMs: indexMode ? LIBRARY_PAINT_INTERVAL_MS : LIBRARY_BRIDGE_PAINT_INTERVAL_MS,
    resetKey: paintResetKey,
    columns: LIBRARY_GRID_COLUMNS,
    initialFillCount: indexMode ? indexInitialFill : assets.length,
  });

  const [visibleRange, setVisibleRange] = useState({ min: 0, max: -1 });
  const [bindBeyondFirstScreen, setBindBeyondFirstScreen] = useState(false);
  const leftFirstScreenRef = useRef(false);
  const idCacheRef = useRef<{ token: number; ids: Map<number, string> }>({
    token: 0,
    ids: new Map(),
  });
  const bindTokenRef = useRef(indexToken);

  const extraData = useMemo(
    () =>
      indexMode
        ? {
            selectedIds,
            selectionOrderByKey,
            bindBeyondFirstScreen,
            maxUnlockedIndex: paint.maxUnlockedIndex,
            token: indexToken,
            count: indexCount,
          }
        : {
            selectedIds,
            selectionOrderByKey,
            maxUnlockedIndex: paint.maxUnlockedIndex,
            visibleMin: visibleRange.min,
            visibleMax: visibleRange.max,
          },
    [
      bindBeyondFirstScreen,
      indexCount,
      indexMode,
      indexToken,
      paint.maxUnlockedIndex,
      selectedIds,
      selectionOrderByKey,
      visibleRange.max,
      visibleRange.min,
    ],
  );

  const indexRowCount = photokitGridRowCount(indexCount);
  const indexData = useMemo(() => {
    if (!indexMode) {
      return null;
    }
    const rows = new Array<number>(indexRowCount);
    for (let i = 0; i < indexRowCount; i += 1) {
      rows[i] = i;
    }
    return rows;
  }, [indexMode, indexRowCount, indexToken, indexCount]);

  const listData = useMemo((): GridListItem[] => {
    if (indexMode) {
      return [];
    }
    const assetItems: GridListItem[] = assets.map((asset, index) => ({
      kind: "asset",
      id: asset.id,
      asset,
      index,
    }));
    // Pad with skeletons so bridge (warm N) does not shrink a full-screen
    // placeholder grid — keeps height stable until index mode expands.
    const pad = Math.max(0, placeholderCount - assetItems.length);
    if (pad === 0) {
      return assetItems;
    }
    const pads: GridListItem[] = Array.from({ length: pad }, (_, i) => ({
      kind: "placeholder" as const,
      id: `__sk_${assetItems.length + i}`,
      index: assetItems.length + i,
    }));
    return [...assetItems, ...pads];
  }, [assets, indexMode, placeholderCount]);

  const viewabilityRef = useRef(paint.onViewableIndicesChanged);
  viewabilityRef.current = paint.onViewableIndicesChanged;
  const assetsRef = useRef(assets);
  assetsRef.current = assets;
  const pixelSizeRef = useRef(pixelSize);
  pixelSizeRef.current = pixelSize;
  const indexSessionRef = useRef(indexSession);
  indexSessionRef.current = indexSession;

  const resolveIndexId = useCallback(
    (index: number): string | null => {
      if (!indexSession || !photokitIndexInSession(indexSession, index)) {
        return null;
      }
      if (idCacheRef.current.token !== indexSession.token) {
        idCacheRef.current = { token: indexSession.token, ids: new Map() };
      }
      const cached = idCacheRef.current.ids.get(index);
      if (cached) {
        return cached;
      }
      const id = photokitIdAt(indexSession.token, index);
      if (!id) {
        return null;
      }
      idCacheRef.current.ids.set(index, id);
      return id;
    },
    [indexSession],
  );

  useEffect(() => {
    if (indexMode && paint.initialFillComplete && !bindBeyondFirstScreen) {
      setBindBeyondFirstScreen(true);
    }
  }, [bindBeyondFirstScreen, indexMode, paint.initialFillComplete]);

  useEffect(() => {
    leftFirstScreenRef.current = false;
    setVisibleRange({ min: 0, max: -1 });
    setBindBeyondFirstScreen(false);
    idCacheRef.current = { token: indexToken, ids: new Map() };
  }, [paintResetKey, indexToken]);

  useEffect(() => {
    if (!useNativeThumbs) {
      return;
    }
    if (indexSession) {
      const range = photokitLookaheadRange(-1, indexSession.count);
      if (range) {
        startPhotokitRangeCaching(
          indexSession.token,
          range.from,
          range.to,
          pixelSize,
        );
      }
      return;
    }
    const range = photokitLookaheadRange(-1, assets.length);
    if (range) {
      startPhotokitThumbCaching(
        assets.slice(range.from, range.to).map((asset) => asset.id),
        pixelSize,
      );
    }
  }, [assets, indexSession, pixelSize, useNativeThumbs]);

  useEffect(() => {
    if (!useNativeThumbs) {
      return;
    }
    return () => {
      stopPhotokitThumbCaching();
    };
  }, [useNativeThumbs]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const indices = viewableItems
        .map((token) => token.index)
        .filter((index): index is number => typeof index === "number");
      if (indices.length === 0) {
        return;
      }
      const minIdx = Math.min(...indices);
      const last = Math.max(...indices);
      const session = indexSessionRef.current;
      if (session) {
        const minItem = minIdx * LIBRARY_GRID_COLUMNS;
        const lastItem = Math.min(
          session.count - 1,
          (last + 1) * LIBRARY_GRID_COLUMNS - 1,
        );
        const itemIndices: number[] = [];
        for (let row = minIdx; row <= last; row += 1) {
          for (let col = 0; col < LIBRARY_GRID_COLUMNS; col += 1) {
            const item = row * LIBRARY_GRID_COLUMNS + col;
            if (item < session.count) {
              itemIndices.push(item);
            }
          }
        }
        viewabilityRef.current(itemIndices);
        if (minItem >= LIBRARY_FILL_UNTIL_COUNT) {
          leftFirstScreenRef.current = true;
          setBindBeyondFirstScreen(true);
        }
        if (leftFirstScreenRef.current && minIdx < 1) {
          beginLibraryPickerScrollUp();
        }
        const range = photokitLookaheadRange(lastItem, session.count);
        if (range) {
          startPhotokitRangeCaching(
            session.token,
            range.from,
            range.to,
            pixelSizeRef.current,
          );
        }
        return;
      }
      viewabilityRef.current(indices);
      setVisibleRange({ min: minIdx, max: last });
      if (last >= LIBRARY_FILL_UNTIL_COUNT) {
        leftFirstScreenRef.current = true;
      }
      if (leftFirstScreenRef.current && minIdx < LIBRARY_GRID_COLUMNS) {
        beginLibraryPickerScrollUp();
      }
      if (!isPhotokitThumbsAvailable()) {
        return;
      }
      const range = photokitLookaheadRange(last, assetsRef.current.length);
      if (!range) {
        return;
      }
      startPhotokitThumbCaching(
        assetsRef.current.slice(range.from, range.to).map((asset) => asset.id),
        pixelSizeRef.current,
      );
    },
    [],
  );

  const handleEndReached = useCallback(() => {
    if (indexSession != null) {
      return;
    }
    if (assets.length === 0) {
      return;
    }
    onEndReached();
  }, [assets.length, indexSession, onEndReached]);

  const getItemLayout = useCallback(
    (_: unknown, row: number) => photokitGridRowLayout(row, rowHeight),
    [rowHeight],
  );

  const renderIndexRow = useCallback(
    ({ item: row }: { item: number }) => {
      const start = row * LIBRARY_GRID_COLUMNS;
      const tiles = [];
      for (let col = 0; col < LIBRARY_GRID_COLUMNS; col += 1) {
        const index = start + col;
        if (index >= indexCount) {
          tiles.push(
            <View
              key={`sp_${col}`}
              style={{
                width: tileSize,
                height: tileSize,
                marginRight: col < LIBRARY_GRID_COLUMNS - 1 ? LIBRARY_GRID_GAP : 0,
              }}
            />,
          );
          continue;
        }
        const resolvedId = resolveIndexId(index);
        const assetId = resolvedId ?? `__idx_${index}`;
        tiles.push(
          <LibraryGridTile
            key={`idx_${index}`}
            assetId={assetId}
            uri={resolvedId ? `ph://${resolvedId}` : ""}
            tileSize={tileSize}
            pixelSize={pixelSize}
            selected={resolvedId ? selectedIds.has(resolvedId) : false}
            order={resolvedId ? selectionOrderByKey.get(resolvedId) : undefined}
            bindImage={paint.shouldDecodeIndex(index)}
            useNativeThumb={useNativeThumbs}
            photokitToken={indexToken}
            photokitIndex={index}
            onPress={onPressAsset}
            testIdPrefix={testIdPrefix}
            theme={theme}
            bottomGap={0}
            marginRight={col < LIBRARY_GRID_COLUMNS - 1 ? LIBRARY_GRID_GAP : 0}
          />,
        );
      }
      return (
        <View
          style={{
            flexDirection: "row",
            height: rowHeight,
            overflow: "hidden",
          }}
        >
          {tiles}
        </View>
      );
    },
    [
      indexCount,
      indexToken,
      onPressAsset,
      paint.shouldDecodeIndex,
      pixelSize,
      resolveIndexId,
      rowHeight,
      selectedIds,
      selectionOrderByKey,
      testIdPrefix,
      theme,
      tileSize,
      useNativeThumbs,
    ],
  );

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
          pixelSize={pixelSize}
          selected={selectedIds.has(item.asset.id)}
          order={selectionOrderByKey.get(item.asset.id)}
          bindImage={paint.shouldDecodeIndex(item.index)}
          useNativeThumb={useNativeThumbs}
          onPress={onPressAsset}
          testIdPrefix={testIdPrefix}
          theme={theme}
        />
      );
    },
    [
      onPressAsset,
      paint.shouldDecodeIndex,
      pixelSize,
      selectedIds,
      selectionOrderByKey,
      testIdPrefix,
      theme,
      tileSize,
      useNativeThumbs,
    ],
  );

  // After all hooks: reset first-12 isolation + id cache on this render.
  // An effect is too late (new thumbs would resolve against the old map).
  if (bindTokenRef.current !== indexToken) {
    bindTokenRef.current = indexToken;
    leftFirstScreenRef.current = false;
    idCacheRef.current = { token: indexToken, ids: new Map() };
    if (bindBeyondFirstScreen) {
      setBindBeyondFirstScreen(false);
    }
    if (visibleRange.min !== 0 || visibleRange.max !== -1) {
      setVisibleRange({ min: 0, max: -1 });
    }
  }

  const showEmpty =
    (!indexMode && assets.length === 0 && placeholderCount === 0 && !loadingPage) ||
    (indexMode && indexCount === 0);

  if (showEmpty) {
    return (
      <View style={styles.emptyWrap}>
        {ListHeaderComponent}
        <Text style={styles.emptyAlbum}>No photos in this album</Text>
      </View>
    );
  }

  return (
    <View style={styles.listRoot} testID={listTestID}>
      {indexMode && indexData ? (
        <FlatList
          key={indexToken}
          data={indexData}
          keyExtractor={(row) => String(row)}
          numColumns={1}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          extraData={extraData}
          getItemLayout={getItemLayout}
          initialNumToRender={LIBRARY_GRID_INITIAL_ROWS}
          maxToRenderPerBatch={LIBRARY_GRID_BATCH_ROWS}
          updateCellsBatchingPeriod={LIBRARY_GRID_BATCH_MS}
          windowSize={LIBRARY_GRID_WINDOW_SIZE}
          removeClippedSubviews={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY_CONFIG}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={null}
          contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
          renderItem={renderIndexRow}
        />
      ) : (
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
            loadingPage && assets.length >= LIBRARY_PREFETCH_UNTIL_COUNT ? (
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
      )}
    </View>
  );
}

function photokitIndexInSession(
  session: PhotokitLibrarySession,
  index: number,
): boolean {
  return index >= 0 && index < session.count;
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
