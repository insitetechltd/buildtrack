import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  Alert,
  Linking,
  Modal,
  Platform,
  PixelRatio,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as MediaLibrary from "expo-media-library";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { useCaptureSessionHost } from "./CaptureSessionHostContext";
import { materializeSelectedCapturePhotos } from "./materializeLibrarySelection";
import { useCaptureSessionStore } from "./sessionDraftStore";
import {
  clearLibraryThumbnailMemoryCache,
  computeLibraryThumbPixelSize,
  prefetchLibraryThumbnails,
} from "@/utils/libraryThumbnailCache";
import {
  consumeWarmLibraryPage,
  prefetchLibraryPageThumbnails,
} from "@/utils/libraryWarmPrefetch";
import {
  LIBRARY_GRID_BATCH_MS,
  LIBRARY_GRID_BATCH_ROWS,
  LIBRARY_GRID_INITIAL_ROWS,
  LIBRARY_GRID_WINDOW_SIZE,
  LIBRARY_SCROLL_LOOKAHEAD_ITEMS,
  LIBRARY_THUMB_PRIORITY_VIEWPORT,
  LIBRARY_VIEWABILITY_MIN_TIME_MS,
  LIBRARY_VIEWABILITY_THRESHOLD,
} from "@/utils/libraryPickerPerf";
import { useLibraryThumbnailUri } from "@/utils/useLibraryThumbnailUri";

const PAGE_SIZE = 36;
const COLUMNS = 3;
const GAP = 2;

/** Sentinel: all photos (no album filter). */
const ALL_PHOTOS_ALBUM_ID = "__all__";

type AlbumChoice = {
  id: string;
  title: string;
  assetCount: number;
};

function newLibrarySessionId(assetId: string): string {
  return `lib_${assetId}`;
}

const LibraryGridTile = memo(function LibraryGridTile({
  assetId,
  uri,
  tileSize,
  thumbPixelSize,
  selected,
  order,
  onPress,
}: {
  assetId: string;
  uri: string;
  tileSize: number;
  thumbPixelSize: number;
  selected: boolean;
  order: number | undefined;
  onPress: (assetId: string) => void;
}) {
  const thumbUri = useLibraryThumbnailUri(
    assetId,
    thumbPixelSize,
    uri,
    true,
  );
  const displayUri = thumbUri ?? null;

  return (
    <Pressable
      onPress={() => onPress(assetId)}
      style={{ width: tileSize, height: tileSize }}
    >
      {displayUri ? (
        <Image
          source={{ uri: displayUri }}
          resizeMode="cover"
          style={{ width: tileSize, height: tileSize }}
        />
      ) : (
        <View
          testID={`capture-session__library_tile_skeleton_${assetId}`}
          style={[styles.tileSkeleton, { width: tileSize, height: tileSize }]}
        />
      )}
      {selected && order != null ? (
        <View
          testID={`capture-session__order_badge_${assetId}`}
          style={styles.orderBadge}
          accessibilityLabel={`Selected ${order}`}
        >
          <Text style={styles.orderBadgeText}>{order}</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

/**
 * Hybrid picker: session (camera) strip + MediaLibrary grid (album-scoped).
 * Session drafts stay in-app (pinDraftMedia) — never written to Photos.
 */
export function HybridLibraryPickerScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { onCancel, onComplete, goToCamera } = useCaptureSessionHost();

  const photos = useCaptureSessionStore((s) => s.photos);
  const toggleSelected = useCaptureSessionStore((s) => s.toggleSelected);
  const addOrSelectLibraryPhoto = useCaptureSessionStore(
    (s) => s.addOrSelectLibraryPhoto,
  );

  const [permission, setPermission] = useState<string | null>(null);
  const [albums, setAlbums] = useState<AlbumChoice[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] =
    useState<string>(ALL_PHOTOS_ALBUM_ID);
  const [albumPickerOpen, setAlbumPickerOpen] = useState(false);
  const [sessionExpanded, setSessionExpanded] = useState(true);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [endCursor, setEndCursor] = useState<string | undefined>();
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const pageRequestRef = useRef(0);
  const acceptingRef = useRef(false);
  const assetsByIdRef = useRef(new Map<string, MediaLibrary.Asset>());

  const tileSize = useMemo(
    () => (width - GAP * (COLUMNS - 1)) / COLUMNS,
    [width],
  );

  const thumbPixelSize = useMemo(
    () => computeLibraryThumbPixelSize(tileSize, PixelRatio.get()),
    [tileSize],
  );

  /** Session strip uses same cell size as the 3-column library grid. */
  const sessionTileSize = tileSize;

  const sessionCameraPhotos = useMemo(
    () => photos.filter((p) => p.source === "camera"),
    [photos],
  );

  const sessionVisiblePhotos = useMemo(() => {
    if (sessionExpanded || sessionCameraPhotos.length <= COLUMNS) {
      return sessionCameraPhotos;
    }
    return sessionCameraPhotos.slice(0, COLUMNS);
  }, [sessionCameraPhotos, sessionExpanded]);

  const sessionCanExpand = sessionCameraPhotos.length > COLUMNS;

  const selectedCount = useMemo(
    () => photos.filter((p) => p.selected).length,
    [photos],
  );

  /** 1-based selection order for currently selected drafts (array append order). */
  const selectionOrderByKey = useMemo(() => {
    const map = new Map<string, number>();
    let order = 0;
    for (const photo of photos) {
      if (!photo.selected) {
        continue;
      }
      order += 1;
      map.set(photo.id, order);
      if (photo.mediaLibraryAssetId) {
        map.set(photo.mediaLibraryAssetId, order);
      }
    }
    return map;
  }, [photos]);

  const selectedLibraryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of photos) {
      if (p.selected && p.mediaLibraryAssetId) {
        ids.add(p.mediaLibraryAssetId);
      }
    }
    return ids;
  }, [photos]);

  const selectedAlbumTitle = useMemo(() => {
    const match = albums.find((a) => a.id === selectedAlbumId);
    return match?.title ?? "All photos";
  }, [albums, selectedAlbumId]);

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

  const onGridViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const indices = viewableItems
        .map((token) => token.index)
        .filter((index): index is number => typeof index === "number");
      prefetchScrollAhead(indices);
    },
    [prefetchScrollAhead],
  );

  const gridViewabilityConfig = useRef({
    itemVisiblePercentThreshold: LIBRARY_VIEWABILITY_THRESHOLD,
    minimumViewTime: LIBRARY_VIEWABILITY_MIN_TIME_MS,
  }).current;

  const gridExtraData = useMemo(
    () => ({ selectedCount, selectionOrderByKey }),
    [selectedCount, selectionOrderByKey],
  );

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const current = await MediaLibrary.getPermissionsAsync();
    if (current.granted) {
      setPermission(current.status);
      return true;
    }
    if (!current.canAskAgain) {
      setPermission(current.status);
      return false;
    }
    const requested = await MediaLibrary.requestPermissionsAsync();
    setPermission(requested.status);
    return requested.granted;
  }, []);

  const loadAlbums = useCallback(async () => {
    try {
      const list = await MediaLibrary.getAlbumsAsync({
        includeSmartAlbums: true,
      });
      const mapped: AlbumChoice[] = list
        .filter((album) => (album.assetCount ?? 0) > 0)
        .map((album) => ({
          id: album.id,
          title: album.title || "Album",
          assetCount: album.assetCount ?? 0,
        }))
        .sort((a, b) => a.title.localeCompare(b.title));

      const allCount = mapped.reduce((sum, a) => sum + a.assetCount, 0);
      setAlbums([
        {
          id: ALL_PHOTOS_ALBUM_ID,
          title: "All photos",
          assetCount: allCount,
        },
        ...mapped,
      ]);
    } catch (error) {
      console.warn("[CaptureSession] albums failed", error);
      setAlbums([
        { id: ALL_PHOTOS_ALBUM_ID, title: "All photos", assetCount: 0 },
      ]);
    }
  }, []);

  const loadPage = useCallback(async (albumId: string, after?: string) => {
    const requestId = pageRequestRef.current + 1;
    pageRequestRef.current = requestId;
    setLoadingPage(true);
    try {
      const page = await MediaLibrary.getAssetsAsync({
        first: PAGE_SIZE,
        after,
        album: albumId === ALL_PHOTOS_ALBUM_ID ? undefined : albumId,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.modificationTime, false]],
      });
      if (pageRequestRef.current !== requestId) {
        return;
      }
      setAssets((prev) => {
        const next = after ? [...prev, ...page.assets] : page.assets;
        const map = new Map<string, MediaLibrary.Asset>();
        for (const asset of next) {
          map.set(asset.id, asset);
        }
        assetsByIdRef.current = map;
        return next;
      });
      setEndCursor(page.endCursor);
      setHasNextPage(page.hasNextPage);
      prefetchLibraryPageThumbnails(page.assets, thumbPixelSize);
    } catch (error) {
      console.warn("[CaptureSession] library page failed", error);
    } finally {
      if (pageRequestRef.current === requestId) {
        setLoadingPage(false);
      }
    }
  }, [thumbPixelSize]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const granted = await ensurePermission();
      if (cancelled || !granted) return;
      await loadAlbums();
    })();
    return () => {
      cancelled = true;
    };
  }, [ensurePermission, loadAlbums]);

  useEffect(() => {
    if (permission !== "granted") {
      return;
    }
    let cancelled = false;
    (async () => {
      clearLibraryThumbnailMemoryCache();
      const warm = consumeWarmLibraryPage();
      if (warm && selectedAlbumId === ALL_PHOTOS_ALBUM_ID) {
        setAssets(warm.assets);
        setEndCursor(warm.endCursor);
        setHasNextPage(warm.hasNextPage);
        const map = new Map<string, MediaLibrary.Asset>();
        for (const asset of warm.assets) {
          map.set(asset.id, asset);
        }
        assetsByIdRef.current = map;
        return;
      }

      setAssets([]);
      setEndCursor(undefined);
      setHasNextPage(true);
      await loadPage(selectedAlbumId);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAlbumId, loadPage, permission]);

  const onEndReached = useCallback(() => {
    if (!hasNextPage || loadingPage || !endCursor) return;
    void loadPage(selectedAlbumId, endCursor);
  }, [endCursor, hasNextPage, loadPage, loadingPage, selectedAlbumId]);

  const onSelectAlbum = useCallback((albumId: string) => {
    setAlbumPickerOpen(false);
    clearLibraryThumbnailMemoryCache();
    setSelectedAlbumId(albumId);
  }, []);

  const onPressLibraryAsset = useCallback(
    (assetId: string) => {
      const store = useCaptureSessionStore.getState();
      const already = store.photos.find(
        (p) => p.mediaLibraryAssetId === assetId,
      );
      if (already) {
        toggleSelected(already.id);
        return;
      }
      const selectedCountNow = store.photos.filter((p) => p.selected).length;
      if (selectedCountNow >= store.selectionLimit) {
        Alert.alert(
          "Limit reached",
          `You can select up to ${store.selectionLimit} photos.`,
        );
        return;
      }
      const asset = assetsByIdRef.current.get(assetId);
      if (!asset) {
        return;
      }
      addOrSelectLibraryPhoto({
        id: newLibrarySessionId(asset.id),
        uri: asset.uri,
        fileName: asset.filename || `library_${Date.now()}.jpg`,
        mediaLibraryAssetId: asset.id,
      });
    },
    [addOrSelectLibraryPhoto, toggleSelected],
  );

  const handleAccept = useCallback(async () => {
    if (selectedCount === 0) {
      Alert.alert("Select photos", "Highlight at least one photo to continue.");
      return;
    }
    if (acceptingRef.current) {
      return;
    }
    acceptingRef.current = true;
    setAccepting(true);
    try {
      const mapped = await materializeSelectedCapturePhotos(
        useCaptureSessionStore.getState().photos,
      );
      onComplete({ photos: mapped });
    } catch (error) {
      console.warn("[CaptureSession] accept pin failed", error);
      Alert.alert("Library", "Could not prepare those photos. Try again.");
    } finally {
      acceptingRef.current = false;
      setAccepting(false);
    }
  }, [onComplete, selectedCount]);

  const renderLibraryGridItem = useCallback(
    ({ item }: { item: MediaLibrary.Asset; index: number }) => (
      <LibraryGridTile
        assetId={item.id}
        uri={item.uri}
        tileSize={tileSize}
        thumbPixelSize={thumbPixelSize}
        selected={selectedLibraryIds.has(item.id)}
        order={selectionOrderByKey.get(item.id)}
        onPress={onPressLibraryAsset}
      />
    ),
    [
      onPressLibraryAsset,
      selectedLibraryIds,
      selectionOrderByKey,
      thumbPixelSize,
      tileSize,
    ],
  );

  if (permission === "denied") {
    return (
      <View
        style={[
          styles.centered,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <Text style={styles.permTitle}>Photo library access needed</Text>
        <Text style={styles.permBody}>
          Allow Photos to pick existing jobsite images alongside this session.
        </Text>
        <Pressable
          onPress={() => Linking.openSettings()}
          style={styles.permButton}
        >
          <Text style={styles.permButtonText}>Open Settings</Text>
        </Pressable>
        <Pressable onPress={goToCamera} style={styles.linkBtn}>
          <Text style={styles.linkText}>Back to camera</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={styles.linkBtn}>
          <Text style={styles.linkText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { paddingTop: insets.top }]}
      testID="capture-session__hybrid_library"
    >
      <View style={styles.header}>
        <Pressable
          testID="capture-session__hybrid_back"
          onPress={goToCamera}
          disabled={accepting}
          hitSlop={12}
          style={[styles.headerSide, accepting && { opacity: 0.4 }]}
        >
          <Ionicons name="chevron-back" size={26} color="#08576E" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {selectedCount > 0 ? `${selectedCount} selected` : "Select photos"}
        </Text>
        <Pressable
          testID="capture-session__hybrid_accept"
          onPress={handleAccept}
          disabled={accepting}
          style={styles.headerSide}
        >
          {accepting ? (
            <ActivityIndicator color="#08576E" />
          ) : (
            <Ionicons name="checkmark" size={28} color="#08576E" />
          )}
        </Pressable>
      </View>

      {sessionCameraPhotos.length > 0 ? (
        <View style={styles.sessionBlock}>
          <Pressable
            testID="capture-session__session_expand"
            onPress={() => {
              if (!sessionCanExpand) return;
              setSessionExpanded((open) => !open);
            }}
            style={styles.sessionHeaderRow}
            accessibilityRole="button"
            accessibilityState={{ expanded: sessionExpanded }}
            accessibilityLabel={
              sessionExpanded ? "Collapse this session" : "Expand this session"
            }
            disabled={!sessionCanExpand}
          >
            <Text style={styles.sessionLabel}>
              This session
              {sessionCameraPhotos.length > 0
                ? ` (${sessionCameraPhotos.length})`
                : ""}
            </Text>
            {sessionCanExpand ? (
              <Ionicons
                name={sessionExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color="#666"
              />
            ) : null}
          </Pressable>
          <View style={styles.sessionGrid}>
            {sessionVisiblePhotos.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => toggleSelected(item.id)}
                style={{
                  width: sessionTileSize,
                  height: sessionTileSize,
                }}
              >
                <ExpoImage
                  source={{ uri: item.uri }}
                  recyclingKey={item.id}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  transition={0}
                  style={{
                    width: sessionTileSize,
                    height: sessionTileSize,
                  }}
                />
                {item.selected ? (
                  <View
                    testID={`capture-session__order_badge_${item.id}`}
                    style={styles.orderBadge}
                    accessibilityLabel={`Selected ${selectionOrderByKey.get(item.id) ?? ""}`}
                  >
                    <Text style={styles.orderBadgeText}>
                      {selectionOrderByKey.get(item.id) ?? ""}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Pressable
        testID="capture-session__album_picker"
        onPress={() => setAlbumPickerOpen(true)}
        style={styles.albumRow}
        accessibilityRole="button"
        accessibilityLabel={`Album ${selectedAlbumTitle}`}
      >
        <Text style={styles.libraryLabel}>{selectedAlbumTitle}</Text>
        <Ionicons name="chevron-down" size={18} color="#666" />
      </Pressable>

      {permission === null && assets.length === 0 ? (
        <View style={styles.centeredFlex}>
          <ActivityIndicator color="#08576E" />
        </View>
      ) : (
        <FlatList
          data={assets}
          keyExtractor={(item) => item.id}
          numColumns={COLUMNS}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          extraData={gridExtraData}
          initialNumToRender={LIBRARY_GRID_INITIAL_ROWS}
          maxToRenderPerBatch={LIBRARY_GRID_BATCH_ROWS}
          updateCellsBatchingPeriod={LIBRARY_GRID_BATCH_MS}
          windowSize={LIBRARY_GRID_WINDOW_SIZE}
          removeClippedSubviews={Platform.OS === "ios"}
          onViewableItemsChanged={onGridViewableItemsChanged}
          viewabilityConfig={gridViewabilityConfig}
          ListFooterComponent={
            loadingPage ? (
              <ActivityIndicator
                style={{ marginVertical: 16 }}
                color="#08576E"
              />
            ) : null
          }
          ListEmptyComponent={
            !loadingPage ? (
              <Text style={styles.emptyAlbum}>No photos in this album</Text>
            ) : null
          }
          columnWrapperStyle={assets.length ? { gap: GAP } : undefined}
          contentContainerStyle={{
            gap: GAP,
            paddingBottom: insets.bottom + 24,
          }}
          renderItem={renderLibraryGridItem}
        />
      )}

      <Modal
        visible={albumPickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAlbumPickerOpen(false)}
      >
        <View style={[styles.albumModal, { paddingTop: insets.top + 8 }]}>
          <View style={styles.albumModalHeader}>
            <Text style={styles.albumModalTitle}>Choose album</Text>
            <Pressable
              testID="capture-session__album_picker_close"
              onPress={() => setAlbumPickerOpen(false)}
              hitSlop={12}
            >
              <Ionicons name="close" size={26} color="#08576E" />
            </Pressable>
          </View>
          <FlatList
            data={albums}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            renderItem={({ item }) => {
              const active = item.id === selectedAlbumId;
              return (
                <Pressable
                  testID={`capture-session__album_row`}
                  onPress={() => onSelectAlbum(item.id)}
                  style={[
                    styles.albumRowItem,
                    active && styles.albumRowItemActive,
                  ]}
                >
                  <View style={styles.albumRowText}>
                    <Text
                      style={[
                        styles.albumRowTitle,
                        active && styles.albumRowTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.albumRowCount}>
                      {item.assetCount > 0 ? `${item.assetCount} photos` : ""}
                    </Text>
                  </View>
                  {active ? (
                    <Ionicons name="checkmark" size={22} color="#08576E" />
                  ) : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centeredFlex: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  permTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#111",
  },
  permBody: {
    textAlign: "center",
    color: "#555",
    marginBottom: 20,
  },
  permButton: {
    backgroundColor: "#08576E",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  linkBtn: {
    marginTop: 14,
  },
  linkText: {
    color: "#08576E",
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  headerSide: {
    width: 48,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },
  sessionBlock: {
    paddingTop: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  sessionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 12,
    marginBottom: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingRight: 8,
  },
  sessionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#10222B",
  },
  sessionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
    paddingBottom: 12,
  },
  albumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 12,
    marginTop: 10,
    marginBottom: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingRight: 8,
  },
  libraryLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#10222B",
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
    backgroundColor: "#08576E",
    alignItems: "center",
    justifyContent: "center",
  },
  orderBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  albumModal: {
    flex: 1,
    backgroundColor: "#fff",
  },
  albumModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  albumModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  albumRowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  albumRowItemActive: {
    backgroundColor: "#F0F7FA",
  },
  albumRowText: {
    flex: 1,
    paddingRight: 12,
  },
  albumRowTitle: {
    fontSize: 16,
    color: "#10222B",
    fontWeight: "500",
  },
  albumRowTitleActive: {
    color: "#08576E",
    fontWeight: "700",
  },
  albumRowCount: {
    marginTop: 2,
    fontSize: 12,
    color: "#888",
  },
});
