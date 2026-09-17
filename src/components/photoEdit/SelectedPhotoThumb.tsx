import React, { useMemo } from "react";
import { PixelRatio, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Image as ExpoImage } from "expo-image";

import { getPhotokitThumbNativeView } from "@/modules/mediaLibrary/PhotokitThumbView";
import { libraryPhotokitThumbPixelSize } from "@/utils/libraryPickerPerf";
import { selectedPhotoUsesPhotokitThumb } from "@/utils/selectedPhotoDisplay";
import type { SelectedPhoto } from "@/utils/usePhotoSelection";

type SelectedPhotoThumbProps = {
  photo: SelectedPhoto;
  width: number;
  height: number;
  contentFit?: "cover" | "contain";
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Tile / preview bitmap for Select Photos.
 * Library `ph://` rows use PhotoKit targetSize thumbs — never expo-image,
 * which requests PHImageManagerMaximumSize and can stall for minutes.
 */
export function SelectedPhotoThumb({
  photo,
  width,
  height,
  contentFit = "cover",
  style,
  testID,
}: SelectedPhotoThumbProps) {
  const useNative = selectedPhotoUsesPhotokitThumb(photo);
  const NativeThumb = useNative ? getPhotokitThumbNativeView() : null;
  const pixelSize = useMemo(
    () => libraryPhotokitThumbPixelSize(Math.max(width, height), PixelRatio.get()),
    [height, width],
  );
  const displayUri = photo.annotatedUri || photo.uri;

  if (useNative && NativeThumb && photo.mediaLibraryAssetId) {
    return (
      <View collapsable={false} style={[{ width, height }, style]} testID={testID}>
        <View style={[StyleSheet.absoluteFill, styles.skeleton]} />
        <NativeThumb
          assetId={photo.mediaLibraryAssetId}
          pixelSize={pixelSize}
          contentFit={contentFit}
          style={{ width, height }}
        />
      </View>
    );
  }

  return (
    <View style={[{ width, height }, style]} testID={testID}>
      <ExpoImage
        source={{ uri: displayUri }}
        cachePolicy="memory-disk"
        contentFit={contentFit}
        style={{ width, height }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#e5e7eb",
  },
});
