import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  PanResponder,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import {
  defaultCropRectInImageLayout,
  getEditCanvasImageLayout,
  mapCropRectToSourcePixels,
  resolveImageDimensions,
  type Rect,
  type SourceCrop,
} from "../../utils/photoPreviewEdit";

const MIN_CROP_PX = 48;
const HANDLE_SIZE = 44;
const HANDLE_THICKNESS = 2;
const HANDLE_LENGTH = 20;
const MAX_ROTATION = 30;
/** Image occupies 85% of the canvas so crop handles have finger room outside. */
const EDIT_CANVAS_PAD = 0.85;

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
  const [baseRotation, setBaseRotation] = useState(0);
  const [fineRotation, setFineRotation] = useState(0);
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
    setBaseRotation(0);
    setFineRotation(0);

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
    return getEditCanvasImageLayout(
      containerWidth,
      containerHeight,
      sourceSize.width,
      sourceSize.height,
      EDIT_CANVAS_PAD,
    );
  }, [containerWidth, containerHeight, sourceSize]);

  useEffect(() => {
    if (imageLayout && imageLayout.width > 0) {
      // Full image bounds — padScale already left finger room outside the photo.
      setCrop(defaultCropRectInImageLayout(imageLayout, 0));
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
          const delta = (dx / 200) * (MAX_ROTATION * 2);
          let next = start + delta;
          next = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, next));
          setFineRotation(next);
        },
      }),
    [disabled],
  );

  const handleRotate90 = useCallback(() => {
    setBaseRotation((prev) => (prev + 90) % 360);
  }, []);

  const totalRotation = baseRotation + fineRotation;

  const handleApply = () => {
    if (!crop || !imageLayout || !sourceSize) return;
    const mapped = mapCropRectToSourcePixels(
      crop,
      imageLayout,
      sourceSize.width,
      sourceSize.height,
    );
    if (!mapped) return;
    onApply(mapped, Math.abs(totalRotation) > 0.1 ? totalRotation : undefined);
  };

  if (loadError) {
    return (
      <View
        testID="photo-selection__crop_overlay"
        style={[styles.fill, { width: containerWidth, height: containerHeight, backgroundColor: "#000" }]}
        className="items-center justify-center"
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
        style={[styles.fill, { width: containerWidth, height: containerHeight, backgroundColor: "#000" }]}
        className="items-center justify-center"
      >
        <ActivityIndicator color="white" />
      </View>
    );
  }

  const dialWidth = Math.max(160, containerWidth - 80);

  return (
    <View
      testID="photo-selection__crop_overlay"
      style={[
        styles.fill,
        {
          width: containerWidth,
          height: containerHeight,
          backgroundColor: "#000",
        },
      ]}
    >
      {/* Image owned by crop screen — scaled to pad, rotated only via dial / 90° */}
      <ExpoImage
        source={{ uri }}
        cachePolicy="memory-disk"
        contentFit="contain"
        transition={0}
        style={{
          position: "absolute",
          left: imageLayout.x,
          top: imageLayout.y,
          width: imageLayout.width,
          height: imageLayout.height,
          transform: [{ rotate: `${totalRotation}deg` }],
        }}
      />

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

      {/* Dial — primary rotate control (not drag-on-image) */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 88,
          paddingHorizontal: 16,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, marginBottom: 8 }}>
          {totalRotation === 0
            ? "0°"
            : `${totalRotation > 0 ? "+" : ""}${totalRotation.toFixed(1)}°`}
        </Text>
        <View
          {...rotationDialResponder.panHandlers}
          testID="photo-selection__rotation_dial"
          style={{
            width: dialWidth,
            height: 50,
            justifyContent: "center",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
              height: 40,
            }}
          >
            {Array.from({ length: 13 }, (_, i) => {
              const angle = -MAX_ROTATION + (i * (MAX_ROTATION * 2)) / 12;
              const isCenter = Math.abs(angle) < 0.1;
              const isMajor = angle % 10 === 0;
              const tickHeight = isCenter ? 20 : isMajor ? 14 : 8;
              return (
                <View
                  key={i}
                  style={{
                    width: isCenter ? 2 : 1,
                    height: tickHeight,
                    backgroundColor: "#fff",
                    opacity: isCenter ? 1 : 0.5,
                  }}
                />
              );
            })}
          </View>
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: dialWidth / 2 + (fineRotation / MAX_ROTATION) * (dialWidth / 2) - 1,
              width: 2,
              height: 24,
              backgroundColor: "#3b82f6",
            }}
          />
        </View>
      </View>

      <View
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 24,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
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

        <Pressable
          testID="photo-selection__crop_cancel"
          onPress={onCancel}
          disabled={disabled}
          style={{
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.2)",
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Cancel</Text>
        </Pressable>
        <Pressable
          testID="photo-selection__crop_apply"
          onPress={handleApply}
          disabled={disabled}
          style={{
            flex: 1,
            backgroundColor: "#2563EB",
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Apply</Text>
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
