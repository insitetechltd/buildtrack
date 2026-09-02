import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  PanResponder,
  Image,
  ActivityIndicator,
  StyleSheet,
} from "react-native";

import {
  defaultCropRectInImageLayout,
  getContainedImageLayout,
  mapCropRectToSourcePixels,
  resolveImageDimensions,
  type Rect,
  type SourceCrop,
} from "../../utils/photoPreviewEdit";

const MIN_CROP_PX = 48;
const HANDLE = 28;

type CropOverlayProps = {
  uri: string;
  containerWidth: number;
  containerHeight: number;
  disabled?: boolean;
  onCancel: () => void;
  onApply: (crop: SourceCrop) => void;
};

type Corner = "tl" | "tr" | "bl" | "br";

export function CropOverlay({
  uri,
  containerWidth,
  containerHeight,
  disabled = false,
  onCancel,
  onApply,
}: CropOverlayProps) {
  const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [loadError, setLoadError] = useState(false);
  const cropRef = useRef<Rect | null>(null);
  const cropStartRef = useRef<Rect | null>(null);

  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  useEffect(() => {
    let cancelled = false;
    setSourceSize(null);
    setCrop(null);
    setLoadError(false);

    resolveImageDimensions(uri)
      .then((size) => {
        if (!cancelled) {
          setSourceSize(size);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("[CropOverlay] Failed to get image size for", uri, error);
          setLoadError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  const imageLayout = useMemo(() => {
    if (!sourceSize) return null;
    return getContainedImageLayout(
      containerWidth,
      containerHeight,
      sourceSize.width,
      sourceSize.height,
    );
  }, [containerWidth, containerHeight, sourceSize]);

  useEffect(() => {
    if (imageLayout && imageLayout.width > 0) {
      setCrop(defaultCropRectInImageLayout(imageLayout));
    }
  }, [imageLayout]);

  const clampCrop = useCallback(
    (next: Rect): Rect => {
      if (!imageLayout) return next;
      let { x, y, width, height } = next;
      width = Math.max(MIN_CROP_PX, Math.min(width, imageLayout.width));
      height = Math.max(MIN_CROP_PX, Math.min(height, imageLayout.height));
      x = Math.max(imageLayout.x, Math.min(x, imageLayout.x + imageLayout.width - width));
      y = Math.max(imageLayout.y, Math.min(y, imageLayout.y + imageLayout.height - height));
      return { x, y, width, height };
    },
    [imageLayout],
  );

  const makeCornerResponder = useCallback(
    (corner: Corner) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: () => {
          cropStartRef.current = cropRef.current;
        },
        onPanResponderMove: (_evt, gesture) => {
          const start = cropStartRef.current;
          if (!start) return;
          const dx = gesture.dx;
          const dy = gesture.dy;
          let next: Rect;
          if (corner === "tl") {
            next = {
              x: start.x + dx,
              y: start.y + dy,
              width: start.width - dx,
              height: start.height - dy,
            };
          } else if (corner === "tr") {
            next = {
              x: start.x,
              y: start.y + dy,
              width: start.width + dx,
              height: start.height - dy,
            };
          } else if (corner === "bl") {
            next = {
              x: start.x + dx,
              y: start.y,
              width: start.width - dx,
              height: start.height + dy,
            };
          } else {
            next = {
              x: start.x,
              y: start.y,
              width: start.width + dx,
              height: start.height + dy,
            };
          }
          setCrop(clampCrop(next));
        },
      }),
    [clampCrop, disabled],
  );

  const tl = useMemo(() => makeCornerResponder("tl"), [makeCornerResponder]);
  const tr = useMemo(() => makeCornerResponder("tr"), [makeCornerResponder]);
  const bl = useMemo(() => makeCornerResponder("bl"), [makeCornerResponder]);
  const br = useMemo(() => makeCornerResponder("br"), [makeCornerResponder]);

  const handleApply = () => {
    if (!crop || !imageLayout || !sourceSize) return;
    const mapped = mapCropRectToSourcePixels(
      crop,
      imageLayout,
      sourceSize.width,
      sourceSize.height,
    );
    if (!mapped) return;
    onApply(mapped);
  };

  if (loadError) {
    return (
      <View
        testID="photo-selection__crop_overlay"
        style={[styles.fill, { width: containerWidth, height: containerHeight }]}
        className="items-center justify-center bg-black/70"
      >
        <Text className="text-white mb-3">Could not load image size</Text>
        <Pressable
          testID="photo-selection__crop_cancel"
          onPress={onCancel}
          className="bg-white/20 px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-semibold">Cancel</Text>
        </Pressable>
      </View>
    );
  }

  if (!sourceSize || !crop || !imageLayout) {
    return (
      <View
        testID="photo-selection__crop_overlay"
        style={[styles.fill, { width: containerWidth, height: containerHeight }]}
        className="items-center justify-center bg-black/40"
      >
        <ActivityIndicator color="white" />
      </View>
    );
  }

  return (
    <View
      testID="photo-selection__crop_overlay"
      style={[styles.fill, { width: containerWidth, height: containerHeight }]}
      pointerEvents="box-none"
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={{ height: crop.y, backgroundColor: "rgba(0,0,0,0.55)" }} />
        <View style={{ flexDirection: "row", height: crop.height }}>
          <View style={{ width: crop.x, backgroundColor: "rgba(0,0,0,0.55)" }} />
          <View
            style={{
              width: crop.width,
              height: crop.height,
              borderWidth: 2,
              borderColor: "#fff",
            }}
          />
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }} />
        </View>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }} />
      </View>

      <View
        {...tl.panHandlers}
        testID="photo-selection__crop_handle_tl"
        style={[styles.handle, { left: crop.x - HANDLE / 2, top: crop.y - HANDLE / 2 }]}
      />
      <View
        {...tr.panHandlers}
        testID="photo-selection__crop_handle_tr"
        style={[styles.handle, { left: crop.x + crop.width - HANDLE / 2, top: crop.y - HANDLE / 2 }]}
      />
      <View
        {...bl.panHandlers}
        testID="photo-selection__crop_handle_bl"
        style={[
          styles.handle,
          { left: crop.x - HANDLE / 2, top: crop.y + crop.height - HANDLE / 2 },
        ]}
      />
      <View
        {...br.panHandlers}
        testID="photo-selection__crop_handle_br"
        style={[
          styles.handle,
          {
            left: crop.x + crop.width - HANDLE / 2,
            top: crop.y + crop.height - HANDLE / 2,
          },
        ]}
      />

      <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-3 px-4">
        <Pressable
          testID="photo-selection__crop_cancel"
          onPress={onCancel}
          disabled={disabled}
          className="bg-white/20 rounded-xl px-5 py-3"
        >
          <Text className="text-white font-semibold">Cancel</Text>
        </Pressable>
        <Pressable
          testID="photo-selection__crop_apply"
          onPress={handleApply}
          disabled={disabled}
          className="bg-blue-600 rounded-xl px-5 py-3"
        >
          <Text className="text-white font-semibold">Apply</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  handle: {
    position: "absolute",
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#2563EB",
  },
});
