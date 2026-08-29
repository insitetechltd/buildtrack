import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";

import { ensureMediaLibraryAccess } from "@/utils/mediaLibraryPermission";
import { LibraryAlbumPickerModal } from "@/modules/mediaLibrary/LibraryAlbumPickerModal";
import { LibraryPhotoGrid } from "@/modules/mediaLibrary/LibraryPhotoGrid";
import {
  LIBRARY_FILL_UNTIL_COUNT,
} from "@/modules/mediaLibrary/libraryAlbumConstants";
import {
  assetToSelectionDraft,
  materializeLibrarySelections,
} from "@/modules/mediaLibrary/materializeLibrarySave";
import { useLibraryAlbumPicker } from "@/modules/mediaLibrary/useLibraryAlbumPicker";
import type { SelectedPhoto } from "../navigation/navigationTypes";

export type InAppLibraryPickerResult = SelectedPhoto[];

type InAppLibraryPickerScreenProps = {
  onCancel: () => void;
  onSave: (photos: InAppLibraryPickerResult) => void;
  selectionLimit?: number;
  initiallySelectedPhotos?: SelectedPhoto[];
};

type PermissionPhase = "checking" | "granted" | "denied";

async function loadAssetsByIds(assetIds: string[]): Promise<MediaLibrary.Asset[]> {
  const assets: MediaLibrary.Asset[] = [];
  for (const id of assetIds) {
    try {
      const info = await MediaLibrary.getAssetInfoAsync(id);
      assets.push(info);
    } catch (error) {
      console.warn("⚠️ [InAppLibraryPicker] could not restore asset", id, error);
    }
  }
  return assets;
}

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

  const [isPinning, setIsPinning] = useState(false);
  const [selectionOrderByKey, setSelectionOrderByKey] = useState(() =>
    selectionMapFromPhotos(initiallySelectedPhotos),
  );
  /** Restored selections may not appear in the first paginated grid page. */
  const restoredAssetsByIdRef = useRef(new Map<string, MediaLibrary.Asset>());

  const initialAssetIdKey = initiallySelectedPhotos
    .map((photo) => photo.mediaLibraryAssetId)
    .filter(Boolean)
    .join("|");

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

  useEffect(() => {
    if (albumPicker.permission !== "granted") {
      return;
    }
    let cancelled = false;
    (async () => {
      const assetIds = initiallySelectedPhotos
        .map((photo) => photo.mediaLibraryAssetId)
        .filter((id): id is string => Boolean(id));

      if (assetIds.length === 0) {
        return;
      }

      const assets = await loadAssetsByIds(assetIds);
      if (!cancelled && assets.length > 0) {
        const restored = new Map<string, MediaLibrary.Asset>();
        assets.forEach((asset) => {
          restored.set(asset.id, asset);
        });
        restoredAssetsByIdRef.current = restored;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAssetIdKey, albumPicker.permission]);

  const onPressAsset = useCallback(
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

  const handleAccept = useCallback(async () => {
    if (selectedCount === 0) {
      Alert.alert("Select photos", "Highlight at least one photo to continue.");
      return;
    }
    setIsPinning(true);
    try {
      const missingIds = [...selectionOrderByKey.keys()].filter(
        (assetId) =>
          !albumPicker.assetsByIdRef.current.get(assetId) &&
          !restoredAssetsByIdRef.current.get(assetId),
      );
      if (missingIds.length > 0) {
        const loaded = await loadAssetsByIds(missingIds);
        for (const asset of loaded) {
          restoredAssetsByIdRef.current.set(asset.id, asset);
        }
      }
      const drafts = [...selectionOrderByKey.entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([assetId, order]) => {
          const asset =
            albumPicker.assetsByIdRef.current.get(assetId) ??
            restoredAssetsByIdRef.current.get(assetId);
          if (!asset) {
            throw new Error(`Missing asset ${assetId}`);
          }
          return assetToSelectionDraft(asset, order);
        });
      const photos = await materializeLibrarySelections(
        drafts,
        initiallySelectedPhotos,
      );
      onSave(photos);
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

  const albumRow = (
    <Pressable
      testID="in-app-library__album_picker"
      onPress={() => albumPicker.setAlbumPickerOpen(true)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginLeft: 12,
        marginTop: 10,
        marginBottom: 6,
        alignSelf: "flex-start",
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
    <View testID="in-app-library__screen" style={{ flex: 1, backgroundColor: "#fff" }}>
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
          testID="in-app-library__accept"
          onPress={handleAccept}
          disabled={selectedCount === 0 || isPinning}
          style={{
            height: 44,
            width: 44,
            borderRadius: 22,
            backgroundColor: selectedCount > 0 && !isPinning ? "#2563EB" : "#d1d5db",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isPinning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="checkmark" size={24} color="#fff" />
          )}
        </Pressable>
      </View>

      <LibraryPhotoGrid
          listTestID="in-app-library__grid"
          testIdPrefix="in-app-library"
          assets={albumPicker.assets}
          loadingPage={albumPicker.loadingPage}
          onEndReached={albumPicker.onEndReached}
          selectedIds={selectedIds}
          selectionOrderByKey={selectionOrderByKey}
          onPressAsset={onPressAsset}
          theme={IN_APP_THEME}
          contentPaddingBottom={insets.bottom + 24}
          placeholderCount={
            albumPicker.assets.length === 0 && !albumPicker.initialLoadDone
              ? LIBRARY_FILL_UNTIL_COUNT
              : 0
          }
          paintResetKey={albumPicker.selectedAlbumId}
          ListHeaderComponent={albumRow}
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
    </View>
  );
}
