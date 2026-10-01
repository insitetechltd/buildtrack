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
import { Ionicons } from "@expo/vector-icons";

import {
  defaultCropRectInImageLayout,
  getContainedImageLayout,
  mapCropRectToSourcePixels,
  resolveImageDimensions,
  type Rect,
  type SourceCrop,
} from "../../utils/photoPreviewEdit";

const MIN_CROP_PX = 48;
const HANDLE_SIZE = 44; // Touch target size
const HANDLE_THICKNESS = 2; // WhatsApp-style thin lines
const HANDLE_LENGTH = 20; // Tight L-bracket arms
const MAX_ROTATION = 30; // degrees, -30 to +30

type CropOverlayProps = {
  uri: string;
  containerWidth: number;
  containerHeight: number;
  disabled?: boolean;
  onCancel: () => void;
  onApply: (crop: SourceCrop, rotation?: number) => void;
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
  const [baseRotation, setBaseRotation] = useState(0); // 90° increments from rotate button
  const [fineRotation, setFineRotation] = useState(0); // Fine rotation angle from dial (-30 to +30)
  const [loadError, setLoadError] = useState(false);
  const cropRef = useRef<Rect | null>(null);
  const cropStartRef = useRef<Rect | null>(null);
  const fineRotationRef = useRef(0);
  const fineRotationStartRef = useRef(0);

  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  useEffect(() => {
    fineRotationRef.current = fineRotation;
  }, [fineRotation]);

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

  const rotationDialResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: () => {
          fineRotationStartRef.current = fineRotationRef.current;
        },
        onPanResponderMove: (_evt, gesture) => {
          const start = fineRotationStartRef.current;
          const dx = gesture.dx;
          // Map horizontal gesture to rotation (-30 to +30 degrees)
          // Assume 200pt gesture width maps to full range
          const delta = (dx / 200) * (MAX_ROTATION * 2);
          let next = start + delta;
          next = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, next));
          setFineRotation(next);
        },
      }),
    [disabled],
  );

  const handleRotate90 = useCallback(() => {
    // Add 90° to base rotation
    setBaseRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleApply = () => {
    if (!crop || !imageLayout || !sourceSize) return;
    const mapped = mapCropRectToSourcePixels(
      crop,
      imageLayout,
      sourceSize.width,
      sourceSize.height,
    );
    if (!mapped) return;
    const totalRotation = baseRotation + fineRotation;
    onApply(mapped, Math.abs(totalRotation) > 0.1 ? totalRotation : undefined);
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
              borderWidth: 1,
              borderColor: "#fff",
            }}
          />
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }} />
        </View>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }} />
      </View>

      {/* Top-left corner handle */}
      <View
        {...tl.panHandlers}
        testID="photo-selection__crop_handle_tl"
        style={{
          position: "absolute",
          left: crop.x - HANDLE_SIZE / 2,
          top: crop.y - HANDLE_SIZE / 2,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
        }}
      >
        <View style={{ position: "absolute", left: 0, top: 0, width: HANDLE_LENGTH, height: HANDLE_THICKNESS, backgroundColor: "#fff" }} />
        <View style={{ position: "absolute", left: 0, top: 0, width: HANDLE_THICKNESS, height: HANDLE_LENGTH, backgroundColor: "#fff" }} />
      </View>

      {/* Top-right corner handle */}
      <View
        {...tr.panHandlers}
        testID="photo-selection__crop_handle_tr"
        style={{
          position: "absolute",
          left: crop.x + crop.width - HANDLE_SIZE / 2,
          top: crop.y - HANDLE_SIZE / 2,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
        }}
      >
        <View style={{ position: "absolute", right: 0, top: 0, width: HANDLE_LENGTH, height: HANDLE_THICKNESS, backgroundColor: "#fff" }} />
        <View style={{ position: "absolute", right: 0, top: 0, width: HANDLE_THICKNESS, height: HANDLE_LENGTH, backgroundColor: "#fff" }} />
      </View>

      {/* Bottom-left corner handle */}
      <View
        {...bl.panHandlers}
        testID="photo-selection__crop_handle_bl"
        style={{
          position: "absolute",
          left: crop.x - HANDLE_SIZE / 2,
          top: crop.y + crop.height - HANDLE_SIZE / 2,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
        }}
      >
        <View style={{ position: "absolute", left: 0, bottom: 0, width: HANDLE_LENGTH, height: HANDLE_THICKNESS, backgroundColor: "#fff" }} />
        <View style={{ position: "absolute", left: 0, bottom: 0, width: HANDLE_THICKNESS, height: HANDLE_LENGTH, backgroundColor: "#fff" }} />
      </View>

      {/* Bottom-right corner handle */}
      <View
        {...br.panHandlers}
        testID="photo-selection__crop_handle_br"
        style={{
          position: "absolute",
          left: crop.x + crop.width - HANDLE_SIZE / 2,
          top: crop.y + crop.height - HANDLE_SIZE / 2,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
        }}
      >
        <View style={{ position: "absolute", right: 0, bottom: 0, width: HANDLE_LENGTH, height: HANDLE_THICKNESS, backgroundColor: "#fff" }} />
        <View style={{ position: "absolute", right: 0, bottom: 0, width: HANDLE_THICKNESS, height: HANDLE_LENGTH, backgroundColor: "#fff" }} />
      </View>

      {/* 90° Rotate Button - Bottom Left */}
      <View className="absolute bottom-3 left-4">
        <Pressable
          testID="photo-selection__rotate_90"
          onPress={handleRotate90}
          disabled={disabled}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="refresh-outline" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Rotation Dial */}
      <View className="absolute bottom-20 left-0 right-0 px-4">
        <View className="items-center">
          <Text className="text-white text-xs mb-2 opacity-80">
            {baseRotation + fineRotation === 0
              ? "0°"
              : `${baseRotation + fineRotation > 0 ? "+" : ""}${(baseRotation + fineRotation).toFixed(1)}°`}
          </Text>
          <View
            {...rotationDialResponder.panHandlers}
            testID="photo-selection__rotation_dial"
            style={{
              width: containerWidth - 80,
              height: 50,
              position: "relative",
              justifyContent: "center",
            }}
          >
            {/* Tick marks */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 40 }}>
              {Array.from({ length: 13 }, (_, i) => {
                const angle = -MAX_ROTATION + (i * (MAX_ROTATION * 2)) / 12;
                const isCenter = Math.abs(angle) < 0.1;
                const isMajor = angle % 10 === 0;
                const height = isCenter ? 20 : isMajor ? 14 : 8;
                const opacity = isCenter ? 1 : 0.5;
                return (
                  <View
                    key={i}
                    style={{
                      width: isCenter ? 2 : 1,
                      height,
                      backgroundColor: "#fff",
                      opacity,
                    }}
                  />
                );
              })}
            </View>
            {/* Pointer indicator */}
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                marginLeft: ((fineRotation / MAX_ROTATION) * (containerWidth - 80)) / 2 - 1,
                width: 2,
                height: 24,
                backgroundColor: "#3b82f6",
              }}
            />
          </View>
        </View>
      </View>

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
});
