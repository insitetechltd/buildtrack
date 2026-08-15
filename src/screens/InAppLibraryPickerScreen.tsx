import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import { ImagePicker, type Asset, type HeaderData } from "expo-image-multiple-picker";

import { pinDraftMedia } from "../utils/draftMediaCache";
import type { SelectedPhoto } from "../navigation/navigationTypes";

export type InAppLibraryPickerResult = SelectedPhoto[];

type InAppLibraryPickerScreenProps = {
  onCancel: () => void;
  onSave: (photos: InAppLibraryPickerResult) => void;
  selectionLimit?: number;
  /** Already chosen drafts — library tiles for these asset ids start selected. */
  initiallySelectedPhotos?: SelectedPhoto[];
};

async function resolveLibraryFileUri(asset: Asset): Promise<string> {
  // MediaLibrary.Asset.uri is often ph:// on iOS — pinDraftMedia needs file://.
  if (asset.uri.startsWith("file://")) {
    return asset.uri;
  }
  const info = await MediaLibrary.getAssetInfoAsync(asset, {
    shouldDownloadFromNetwork: true,
  });
  if (info.localUri?.startsWith("file://")) {
    return info.localUri;
  }
  throw new Error(`No local file URI for asset ${asset.id}`);
}

async function loadAssetsByIds(assetIds: string[]): Promise<Asset[]> {
  const assets: Asset[] = [];
  for (const id of assetIds) {
    try {
      const info = await MediaLibrary.getAssetInfoAsync(id);
      assets.push(info as Asset);
    } catch (error) {
      console.warn("⚠️ [InAppLibraryPicker] could not restore asset", id, error);
    }
  }
  return assets;
}

async function assetsToSelectedPhotos(
  assets: Asset[],
  previous: SelectedPhoto[],
): Promise<SelectedPhoto[]> {
  const previousByAssetId = new Map(
    previous
      .filter((photo) => Boolean(photo.mediaLibraryAssetId))
      .map((photo) => [photo.mediaLibraryAssetId as string, photo]),
  );

  const photos: SelectedPhoto[] = [];
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const prior = previousByAssetId.get(asset.id);
    if (prior) {
      // Keep pinned URI + any rotate/crop so re-selecting does not wipe edits.
      photos.push({
        ...prior,
        mediaLibraryAssetId: asset.id,
      });
      continue;
    }

    const fileName = asset.filename || `library_${Date.now()}_${i}.jpg`;
    const sourceUri = await resolveLibraryFileUri(asset);
    const pinnedUri = await pinDraftMedia(sourceUri, fileName);
    photos.push({
      uri: pinnedUri,
      fileName,
      isAnnotated: false,
      mediaLibraryAssetId: asset.id,
    });
  }
  return photos;
}

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
  const [preselectedAssets, setPreselectedAssets] = useState<Asset[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const assetIds = initiallySelectedPhotos
      .map((photo) => photo.mediaLibraryAssetId)
      .filter((id): id is string => Boolean(id));

    (async () => {
      if (assetIds.length === 0) {
        if (!cancelled) setPreselectedAssets([]);
        return;
      }
      const assets = await loadAssetsByIds(assetIds);
      if (!cancelled) setPreselectedAssets(assets);
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally key off id list, not array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initiallySelectedPhotos
      .map((photo) => photo.mediaLibraryAssetId)
      .filter(Boolean)
      .join("|"),
  ]);

  const handleSave = useCallback(
    async (assets: Asset[]) => {
      if (!assets.length) {
        onCancel();
        return;
      }
      setIsPinning(true);
      try {
        const photos = await assetsToSelectedPhotos(assets, initiallySelectedPhotos);
        onSave(photos);
      } catch (error) {
        console.error("❌ [InAppLibraryPicker] pin failed:", error);
        Alert.alert("Error", "Could not prepare selected photos. Please try again.");
        onCancel();
      } finally {
        setIsPinning(false);
      }
    },
    [initiallySelectedPhotos, onCancel, onSave],
  );

  const Header = useCallback(
    (props: HeaderData) => {
      const topPad = Math.max(insets.top, 12);
      return (
        <View
          testID="in-app-library__header"
          style={{
            paddingTop: topPad,
            paddingHorizontal: 12,
            paddingBottom: 12,
            height: topPad + 56,
            width: "100%",
            backgroundColor: "#ffffff",
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable
            testID="in-app-library__cancel"
            onPress={() => {
              if (props.view === "gallery" && props.goToAlbum && !props.noAlbums) {
                props.goToAlbum();
                return;
              }
              onCancel();
            }}
            style={{
              height: 44,
              width: 44,
              borderRadius: 22,
              backgroundColor: "#f3f4f6",
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Ionicons
              name={props.view === "gallery" && !props.noAlbums ? "arrow-back" : "close"}
              size={22}
              color="#111827"
            />
          </Pressable>

          <Text style={{ color: "#111827", fontSize: 17, fontWeight: "600" }}>
            {props.view === "album"
              ? "Albums"
              : props.imagesPicked > 0
                ? `${props.imagesPicked} selected`
                : "Library"}
          </Text>

          <Pressable
            testID="in-app-library__accept"
            onPress={() => props.save?.()}
            disabled={!props.picked || isPinning}
            style={{
              height: 44,
              width: 44,
              borderRadius: 22,
              backgroundColor: props.picked && !isPinning ? "#2563EB" : "#d1d5db",
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityRole="button"
            accessibilityLabel="Accept selected photos"
          >
            {isPinning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={24} color="#fff" />
            )}
          </Pressable>
        </View>
      );
    },
    [insets.top, isPinning, onCancel],
  );

  if (preselectedAssets === null) {
    return (
      <View
        testID="in-app-library__loading"
        style={{ flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}
      >
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View testID="in-app-library__screen" style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" />
      <ImagePicker
        multiple
        noAlbums
        image
        video={false}
        limit={selectionLimit}
        galleryColumns={3}
        selected={preselectedAssets}
        onSave={handleSave}
        onCancel={onCancel}
        theme={{
          header: Header,
          check: () => (
            <View
              style={{
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(37,99,235,0.35)",
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "#2563EB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
              </View>
            </View>
          ),
        }}
      />
    </View>
  );
}
