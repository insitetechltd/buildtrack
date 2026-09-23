import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Image as ExpoImage } from "expo-image";

import {
  selectedPhotoCanPaintWithExpoImage,
  selectedPhotoDisplayUri,
} from "@/utils/selectedPhotoDisplay";
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
 * Library rows must already carry a file:// `previewUri` from Accept.
 * Never bind `ph://` to expo-image (PHImageManagerMaximumSize stall) and
 * never mount PhotokitThumbView inside the Reanimated sortable grid.
 */
export function SelectedPhotoThumb({
  photo,
  width,
  height,
  contentFit = "cover",
  style,
  testID,
}: SelectedPhotoThumbProps) {
  const displayUri = selectedPhotoDisplayUri(photo);
  const paintUri = selectedPhotoCanPaintWithExpoImage(photo) ? displayUri : null;

  return (
    <View
      collapsable={false}
      style={[{ width, height }, styles.skeleton, style]}
      testID={testID}
    >
      {paintUri ? (
        <ExpoImage
          testID={testID ? `${testID}__image` : undefined}
          source={{ uri: paintUri }}
          cachePolicy="memory-disk"
          contentFit={contentFit}
          style={{ width, height }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#e5e7eb",
  },
});
