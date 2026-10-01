import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { ensureMediaLibraryAccess } from "@/utils/mediaLibraryPermission";
import { LibraryAlbumPickerModal } from "@/modules/mediaLibrary/LibraryAlbumPickerModal";
import { LibraryFilterModal } from "@/modules/mediaLibrary/LibraryFilterModal";
import { LibraryPhotoGrid } from "@/modules/mediaLibrary/LibraryPhotoGrid";
import {
  LibraryFullscreenViewer,
  type AssetAnnotation,
} from "@/modules/mediaLibrary/LibraryFullscreenViewer";
import { LibrarySelectedTray } from "@/modules/mediaLibrary/LibrarySelectedTray";
import {
  LIBRARY_GRID_GAP,
  libraryGridColumns,
} from "@/modules/mediaLibrary/libraryAlbumConstants";
import { librarySkeletonTileCount } from "@/utils/libraryPickerPerf";
import {
  assetToSelectionDraft,
  materializeLibrarySelections,
} from "@/modules/mediaLibrary/materializeLibrarySave";
import { pinLibraryPreviews } from "@/utils/libraryPreviewPin";
import { useLibraryAlbumPicker } from "@/modules/mediaLibrary/useLibraryAlbumPicker";
import { photokitIdAt } from "@/modules/mediaLibrary/PhotokitThumbView";
import { bakeStrokesOntoPhoto } from "@/utils/bakePhotoDraw";
import type { DrawStroke } from "@/utils/photoPreviewDraw";
import type { SelectedPhoto } from "../navigation/navigationTypes";

export type InAppLibraryPickerResult = SelectedPhoto[];

type InAppLibraryPickerScreenProps = {
  onCancel: () => void;
  onSave: (photos: InAppLibraryPickerResult) => void;
  selectionLimit?: number;
  initiallySelectedPhotos?: SelectedPhoto[];
};

type PermissionPhase = "checking" | "granted" | "denied";

function selectionMapFromPhotos(
  photos: SelectedPhoto[],
): Map<string, number> {
  const next = new Map<string, number>();
  let order = 0;
  for (const photo of photos) {
    if (!photo.mediaLibraryAssetId) {
      continue;
    }
    order += 1;
    next.set(photo.mediaLibraryAssetId, order);
  }
  return next;
}

function permissionPhaseFrom(permission: string | null): PermissionPhase {
  if (permission === null) {
    return "checking";
  }
  if (permission === "granted") {
    return "granted";
  }
  return "denied";
}

export { ensureMediaLibraryAccess };

const IN_APP_THEME = {
  skeletonColor: "#E5E7EB",
  badgeBackground: "#2563EB",
  badgeText: "#fff",
  loadingIndicator: "#2563EB",
};

/**
 * MediaLibrary multi-select gallery. Photo Edit stays on Select Photos.
 */
export default function InAppLibraryPickerScreen({
  onCancel,
  onSave,
  selectionLimit = 20,
  initiallySelectedPhotos = [],
}: InAppLibraryPickerScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const skeletonTileCount = useMemo(() => {
    const columns = libraryGridColumns(width);
    const tileSize =
      (width - LIBRARY_GRID_GAP * (columns - 1)) / columns;
    const rowHeight = tileSize + LIBRARY_GRID_GAP;
    const gridArea = Math.max(200, height - insets.top - insets.bottom - 120);
    return librarySkeletonTileCount(gridArea, rowHeight, columns);
  }, [height, insets.bottom, insets.top, width]);

  const [isPinning, setIsPinning] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [actionPromptOpen, setActionPromptOpen] = useState(false);
  const [selectionOrderByKey, setSelectionOrderByKey] = useState(() =>
    selectionMapFromPhotos(initiallySelectedPhotos),
  );
  const [annotations, setAnnotations] = useState<Map<string, AssetAnnotation>>(
    new Map(),
  );

  const albumPicker = useLibraryAlbumPicker({
    enabled: true,
    consumeWarmPage: true,
  });

  const permissionPhase = permissionPhaseFrom(albumPicker.permission);

  const selectedIds = useMemo(
    () => new Set(selectionOrderByKey.keys()),
    [selectionOrderByKey],
  );

  const selectedCount = selectionOrderByKey.size;

  const toggleSelection = useCallback(
    (assetId: string) => {
      setSelectionOrderByKey((current) => {
        const next = new Map(current);
        if (next.has(assetId)) {
          const removedOrder = next.get(assetId)!;
          next.delete(assetId);
          for (const [id, order] of next.entries()) {
            if (order > removedOrder) {
              next.set(id, order - 1);
            }
          }
          return next;
        }
        if (next.size >= selectionLimit) {
          Alert.alert(
            "Limit reached",
            `You can select up to ${selectionLimit} photos.`,
          );
          return current;
        }
        next.set(assetId, next.size + 1);
        return next;
      });
    },
    [selectionLimit],
  );

  const onPressAsset = toggleSelection;

  const onCenterPressAsset = useCallback(
    (assetId: string, index: number) => {
      setViewerInitialIndex(index);
      setViewerOpen(true);
    },
    [],
  );

  const handleTrayThumbPress = useCallback(
    (assetId: string) => {
      const asset = albumPicker.assetsByIdRef.current.get(assetId);
      if (!asset) return;

      const index = albumPicker.indexSession
        ? Array.from({ length: albumPicker.indexSession.count }, (_, i) => {
            const id = photokitIdAt(albumPicker.indexSession!.token, i);
            return id;
          }).indexOf(assetId)
        : albumPicker.assets.findIndex((a) => a.id === assetId);

      if (index >= 0) {
        setViewerInitialIndex(index);
        setViewerOpen(true);
      }
    },
    [albumPicker.assets, albumPicker.assetsByIdRef, albumPicker.indexSession],
  );

  const handleDeselectAll = useCallback(() => {
    setSelectionOrderByKey(new Map());
    setAnnotations(new Map());
  }, []);

  const handleUpdateAnnotation = useCallback(
    (assetId: string, annotation: AssetAnnotation) => {
      setAnnotations((prev) => {
        const next = new Map(prev);
        next.set(assetId, annotation);
        return next;
      });
    },
    [],
  );

  const handleCommitAnnotation = useCallback(
    async (assetId: string, strokes: DrawStroke[]): Promise<string | null> => {
      const asset = albumPicker.assetsByIdRef.current.get(assetId);
      if (!asset) return null;

      try {
        const sourceUri = asset.uri;
        const annotatedUri = await bakeStrokesOntoPhoto(sourceUri, strokes);
        return annotatedUri;
      } catch (error) {
        console.error("❌ [InAppLibrary] Annotation failed:", error);
        Alert.alert("Error", "Could not apply annotations. Please try again.");
        return null;
      }
    },
    [albumPicker.assetsByIdRef],
  );

  const handleAcceptAction = useCallback(async () => {
    if (selectedCount === 0) {
      Alert.alert("Select photos", "Highlight at least one photo to continue.");
      return;
    }
    setIsPinning(true);
    try {
      const priorById = new Map(
        initiallySelectedPhotos
          .filter((photo) => photo.mediaLibraryAssetId)
          .map((photo) => [photo.mediaLibraryAssetId as string, photo]),
      );
      const drafts = [...selectionOrderByKey.entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([assetId, order]) => {
          const asset = albumPicker.assetsByIdRef.current.get(assetId);
          if (asset) {
            return assetToSelectionDraft(asset, order);
          }
          const prior = priorById.get(assetId);
          return {
            assetId,
            uri: prior?.uri ?? `ph://${assetId}`,
            fileName: prior?.fileName ?? `library_${assetId}.jpg`,
            order,
          };
        });
      let photos = materializeLibrarySelections(
        drafts,
        initiallySelectedPhotos,
      );

      photos = photos.map((photo) => {
        const annotation = annotations.get(photo.mediaLibraryAssetId || "");
        if (annotation?.annotatedUri) {
          return {
            ...photo,
            uri: annotation.annotatedUri,
            annotatedUri: annotation.annotatedUri,
            isAnnotated: true,
          };
        }
        return photo;
      });

      onSave(await pinLibraryPreviews(photos));
    } catch (error) {
      console.error("❌ [InAppLibraryPicker] pin failed:", error);
      Alert.alert("Error", "Could not prepare selected photos. Please try again.");
    } finally {
      setIsPinning(false);
    }
  }, [
    albumPicker.assetsByIdRef,
    initiallySelectedPhotos,
    onSave,
    selectedCount,
    selectionOrderByKey,
  ]);

  const handleDone = useCallback(() => {
    if (selectedCount === 0) {
      return;
    }
    // Phase B: Action target chosen after checkmark
    // TODO: Wire to report/update/assign entry points when available
    // For now, proceed to accept (existing post-select flow)
    void handleAcceptAction();
  }, [selectedCount, handleAcceptAction]);

  const albumRow = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: 12,
        marginTop: 10,
        marginBottom: 6,
      }}
    >
      <Pressable
        testID="in-app-library__album_picker"
        onPress={() => albumPicker.setAlbumPickerOpen(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 4,
          paddingRight: 8,
        }}
        accessibilityRole="button"
        accessibilityLabel={`Album ${albumPicker.selectedAlbumTitle}`}
      >
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#10222B" }}>
          {albumPicker.selectedAlbumTitle}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#666" />
      </Pressable>
      
      <Pressable
        testID="in-app-library__filter_button"
        onPress={() => setFilterModalOpen(true)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: "#f3f4f6",
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        }}
        accessibilityRole="button"
        accessibilityLabel="Filter photos"
      >
        <Ionicons name="funnel-outline" size={16} color="#374151" />
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>
          Filter
        </Text>
      </Pressable>
    </View>
  );

  if (permissionPhase === "denied") {
    return (
      <View
        testID="in-app-library__permission_denied"
        style={{
          flex: 1,
          backgroundColor: "#fff",
          paddingHorizontal: 24,
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        <StatusBar style="dark" />
        <Text style={{ color: "#111827", fontSize: 17, fontWeight: "600", textAlign: "center" }}>
          Photo access is required
        </Text>
        <Text style={{ color: "#6b7280", fontSize: 15, textAlign: "center", lineHeight: 22 }}>
          Allow photo library access in Settings to attach jobsite photos to this task.
        </Text>
        <Pressable
          testID="in-app-library__open_settings"
          onPress={() => {
            void Linking.openSettings();
          }}
          style={{
            marginTop: 8,
            backgroundColor: "#2563EB",
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Open Settings</Text>
        </Pressable>
        <Pressable testID="in-app-library__permission_cancel" onPress={onCancel}>
          <Text style={{ color: "#2563EB", fontSize: 16, fontWeight: "600" }}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View testID="in-app-library__screen" accessible={true} style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" />
      <View
        testID="in-app-library__header"
        style={{
          paddingTop: Math.max(insets.top, 12),
          paddingHorizontal: 12,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          testID="in-app-library__cancel"
          accessible={true}
          onPress={onCancel}
          style={{
            height: 44,
            width: 44,
            borderRadius: 22,
            backgroundColor: "#f3f4f6",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={22} color="#111827" />
        </Pressable>
        <Text testID="in-app-library__title" style={{ fontSize: 17, fontWeight: "600" }}>
          {selectedCount > 0 ? `${selectedCount} selected` : "Library"}
        </Text>
        <Pressable
          testID="in-app-library__done"
          accessible={true}
          onPress={handleDone}
          disabled={selectedCount === 0}
          style={{
            height: 44,
            width: 44,
            borderRadius: 22,
            backgroundColor: selectedCount > 0 ? "#2563EB" : "#d1d5db",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="checkmark" size={24} color="#fff" />
        </Pressable>
      </View>

      <LibraryPhotoGrid
          listTestID="in-app-library__grid"
          testIdPrefix="in-app-library"
          assets={albumPicker.assets}
          indexSession={albumPicker.indexSession}
          loadingPage={albumPicker.loadingPage}
          onEndReached={albumPicker.onEndReached}
          onIndexNearEnd={albumPicker.onIndexNearEnd}
          selectedIds={selectedIds}
          selectionOrderByKey={selectionOrderByKey}
          onPressAsset={onPressAsset}
          onCenterPressAsset={onCenterPressAsset}
          theme={IN_APP_THEME}
          contentPaddingBottom={insets.bottom + 120}
          placeholderCount={
            albumPicker.indexSession ? 0 : skeletonTileCount
          }
          paintResetKey={`${albumPicker.selectedAlbumId}:${albumPicker.indexSession?.token ?? "paged"}`}
          ListHeaderComponent={albumRow}
        />

      <LibrarySelectedTray
        selectedAssets={(() => {
          const entries = [...selectionOrderByKey.entries()]
            .sort((a, b) => a[1] - b[1])
            .map(([assetId, order]) => {
              const asset = albumPicker.assetsByIdRef.current.get(assetId);
              if (!asset) {
                return null;
              }
              return {
                assetId,
                uri: asset.uri,
                order,
              };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);
          return entries;
        })()}
        onRemove={toggleSelection}
        onDeselectAll={handleDeselectAll}
        onPressThumb={handleTrayThumbPress}
        testIdPrefix="in-app-library"
        accentColor="#2563EB"
      />

      <LibraryFullscreenViewer
        visible={viewerOpen}
        initialIndex={viewerInitialIndex}
        assets={albumPicker.assets}
        indexSession={albumPicker.indexSession}
        selectedIds={selectedIds}
        annotations={annotations}
        onToggleSelect={toggleSelection}
        onClose={() => setViewerOpen(false)}
        onUpdateAnnotation={handleUpdateAnnotation}
        onCommitAnnotation={handleCommitAnnotation}
        testIdPrefix="in-app-library"
        accentColor="#2563EB"
      />

      <LibraryAlbumPickerModal
        visible={albumPicker.albumPickerOpen}
        albums={albumPicker.albums}
        selectedAlbumId={albumPicker.selectedAlbumId}
        onClose={() => albumPicker.setAlbumPickerOpen(false)}
        onSelectAlbum={albumPicker.onSelectAlbum}
        testIdPrefix="in-app-library"
        accentColor="#2563EB"
      />

      <LibraryFilterModal
        visible={filterModalOpen}
        filterState={albumPicker.filterState}
        onClose={() => setFilterModalOpen(false)}
        onApply={(newFilter) => {
          albumPicker.setFilterState(newFilter);
        }}
        testIdPrefix="in-app-library"
        accentColor="#2563EB"
      />
    </View>
  );
}
