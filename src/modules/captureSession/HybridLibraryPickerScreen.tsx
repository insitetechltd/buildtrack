import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { LibraryAlbumPickerModal } from "@/modules/mediaLibrary/LibraryAlbumPickerModal";
import { LibraryPhotoGrid } from "@/modules/mediaLibrary/LibraryPhotoGrid";
import { LibraryPickerTimingHud } from "@/modules/mediaLibrary/LibraryPickerTimingHud";
import {
  LIBRARY_FILL_UNTIL_COUNT,
  LIBRARY_GRID_COLUMNS,
  LIBRARY_GRID_GAP,
} from "@/modules/mediaLibrary/libraryAlbumConstants";
import { useLibraryAlbumPicker } from "@/modules/mediaLibrary/useLibraryAlbumPicker";
import { markLibraryPickerMetadata } from "@/utils/libraryPickerTiming";
import {
  isLibraryPickerTimingHudEnabled,
  librarySkeletonTileCount,
} from "@/utils/libraryPickerPerf";
import { useCaptureSessionHost } from "./CaptureSessionHostContext";
import { prepareCaptureSessionAccept } from "./cameraDraftPinQueue";
import { useCaptureSessionStore } from "./sessionDraftStore";

function newLibrarySessionId(assetId: string): string {
  return `lib_${assetId}`;
}

/**
 * Hybrid picker: session (camera) strip + MediaLibrary grid (album-scoped).
 * Session drafts stay in-app (pinDraftMedia) — never written to Photos.
 */
export function HybridLibraryPickerScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { onCancel, onComplete, goToCamera } = useCaptureSessionHost();

  const photos = useCaptureSessionStore((s) => s.photos);
  const toggleSelected = useCaptureSessionStore((s) => s.toggleSelected);
  const addOrSelectLibraryPhoto = useCaptureSessionStore(
    (s) => s.addOrSelectLibraryPhoto,
  );

  const [sessionExpanded, setSessionExpanded] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const acceptingRef = useRef(false);

  const tileSize = useMemo(
    () => (width - LIBRARY_GRID_GAP * (LIBRARY_GRID_COLUMNS - 1)) / LIBRARY_GRID_COLUMNS,
    [width],
  );

  const skeletonTileCount = useMemo(() => {
    const rowHeight = tileSize + LIBRARY_GRID_GAP;
    const gridArea = Math.max(200, height - insets.top - insets.bottom - 160);
    return librarySkeletonTileCount(gridArea, rowHeight, LIBRARY_GRID_COLUMNS);
  }, [height, insets.bottom, insets.top, tileSize]);

  const albumPicker = useLibraryAlbumPicker({
    enabled: true,
    consumeWarmPage: true,
  });

  useEffect(() => {
    if (albumPicker.indexSession) {
      markLibraryPickerMetadata(albumPicker.indexSession.count);
      return;
    }
    if (albumPicker.assets.length > 0) {
      markLibraryPickerMetadata(albumPicker.assets.length);
    }
  }, [albumPicker.assets.length, albumPicker.indexSession]);

  const sessionCameraPhotos = useMemo(
    () => photos.filter((p) => p.source === "camera"),
    [photos],
  );

  const sessionVisiblePhotos = useMemo(() => {
    if (sessionExpanded || sessionCameraPhotos.length <= LIBRARY_GRID_COLUMNS) {
      return sessionCameraPhotos;
    }
    return sessionCameraPhotos.slice(0, LIBRARY_GRID_COLUMNS);
  }, [sessionCameraPhotos, sessionExpanded]);

  const sessionCanExpand = sessionCameraPhotos.length > LIBRARY_GRID_COLUMNS;

  const selectedCount = useMemo(
    () => photos.filter((p) => p.selected).length,
    [photos],
  );

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
      const asset = albumPicker.assetsByIdRef.current.get(assetId);
      addOrSelectLibraryPhoto({
        id: newLibrarySessionId(assetId),
        uri: asset?.uri ?? `ph://${assetId}`,
        fileName: asset?.filename || `library_${assetId}.jpg`,
        mediaLibraryAssetId: assetId,
      });
    },
    [addOrSelectLibraryPhoto, albumPicker.assetsByIdRef, toggleSelected],
  );

  const handleAccept = useCallback(async () => {
    if (acceptingRef.current) {
      return;
    }
    acceptingRef.current = true;
    setAccepting(true);
    try {
      const { photos: mapped, failedCount } = await prepareCaptureSessionAccept();
      if (failedCount > 0) {
        Alert.alert(
          "Camera",
          failedCount === 1
            ? "Could not save 1 photo."
            : `Could not save ${failedCount} photos.`,
        );
      }
      if (mapped.length === 0) {
        if (failedCount === 0) {
          Alert.alert(
            "Select photos",
            "Highlight at least one photo to continue.",
          );
        }
        return;
      }
      onComplete({ photos: mapped });
    } catch (error) {
      console.warn("[CaptureSession] accept pin failed", error);
      Alert.alert("Library", "Could not prepare those photos. Try again.");
    } finally {
      acceptingRef.current = false;
      setAccepting(false);
    }
  }, [onComplete]);

  const sessionHeader = sessionCameraPhotos.length > 0 ? (
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
        disabled={!sessionCanExpand}
      >
        <Text style={styles.sessionLabel}>
          This session
          {sessionCameraPhotos.length > 0 ? ` (${sessionCameraPhotos.length})` : ""}
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
            style={{ width: tileSize, height: tileSize }}
          >
            <ExpoImage
              source={{ uri: item.uri }}
              recyclingKey={`${item.id}:${item.uri}`}
              cachePolicy="memory-disk"
              contentFit="cover"
              transition={0}
              style={{ width: tileSize, height: tileSize }}
            />
            {item.selected ? (
              <View
                testID={`capture-session__order_badge_${item.id}`}
                style={styles.orderBadge}
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
  ) : null;

  const albumRow = (
    <Pressable
      testID="capture-session__album_picker"
      onPress={() => albumPicker.setAlbumPickerOpen(true)}
      style={styles.albumRow}
    >
      <Text style={styles.libraryLabel}>{albumPicker.selectedAlbumTitle}</Text>
      <Ionicons name="chevron-down" size={18} color="#666" />
    </Pressable>
  );

  if (albumPicker.permission === "denied") {
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
        <Pressable onPress={() => Linking.openSettings()} style={styles.permButton}>
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

      <LibraryPhotoGrid
          listTestID="capture-session__library_grid"
          testIdPrefix="capture-session"
          assets={albumPicker.assets}
          indexSession={albumPicker.indexSession}
          loadingPage={albumPicker.loadingPage}
          onEndReached={albumPicker.onEndReached}
          onIndexNearEnd={albumPicker.onIndexNearEnd}
          selectedIds={selectedLibraryIds}
          selectionOrderByKey={selectionOrderByKey}
          onPressAsset={onPressLibraryAsset}
          contentPaddingBottom={insets.bottom + 24}
          placeholderCount={
            albumPicker.indexSession ? 0 : skeletonTileCount
          }
          paintResetKey={`${albumPicker.selectedAlbumId}:${albumPicker.indexSession?.token ?? "paged"}`}
          ListHeaderComponent={
            <View>
              {sessionHeader}
              {albumRow}
            </View>
          }
        />

      {(albumPicker.assets.length > 0 || albumPicker.indexSession != null) && (
        <View
          pointerEvents="none"
          testID="capture-session__library_first_ready"
          accessibilityLabel="library first assets ready"
          style={styles.firstReadyProbe}
        />
      )}

      {isLibraryPickerTimingHudEnabled() ? <LibraryPickerTimingHud /> : null}

      <LibraryAlbumPickerModal
        visible={albumPicker.albumPickerOpen}
        albums={albumPicker.albums}
        selectedAlbumId={albumPicker.selectedAlbumId}
        onClose={() => albumPicker.setAlbumPickerOpen(false)}
        onSelectAlbum={albumPicker.onSelectAlbum}
        testIdPrefix="capture-session"
        accentColor="#08576E"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
  },
  firstReadyProbe: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  centered: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
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
    gap: LIBRARY_GRID_GAP,
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
});
