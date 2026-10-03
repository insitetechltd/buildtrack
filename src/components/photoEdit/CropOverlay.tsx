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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  defaultCropRectInImageLayout,
  dialMarkOffset,
  dialPeekCenterY,
  getEditCanvasImageLayout,
  mapCoverCropAfterRotation,
  mapCropRectToSourcePixels,
  resolveImageDimensions,
  clampImagePan,
  cropRectForImageOffset,
  cropRotationCoverScale,
  type Rect,
  type SourceCrop,
} from "../../utils/photoPreviewEdit";

const MIN_CROP_PX = 48;
const HANDLE_SIZE = 44;
const HANDLE_THICKNESS = 3;
const HANDLE_LENGTH = 23;
const MAX_ROTATION = 90;
const TOP_BAR_HEIGHT = 56;
const BOTTOM_BAR_HEIGHT = 180;
const SNAP_DEGREE = 1;
const DIAL_RADIUS = 200;
/** Photo occupies 85% of the stage so corner handles have finger room outside. */
const EDIT_CANVAS_PAD = 0.85;
/** Tick dots and degree labels. White so they stay readable on the black stage. */
const DIAL_MARK = "#FFFFFF";
/** Dim outside the crop frame. Light enough that the photo outside the rect stays visible. */
const OUTSIDE_CROP_DIM = "rgba(0,0,0,0.35)";

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
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [loadError, setLoadError] = useState(false);
  const [originalAngle, setOriginalAngle] = useState(0);
  const [isHiding, setIsHiding] = useState(false);
  
  const cropRef = useRef<Rect | null>(null);
  const cropStartRef = useRef<Rect | null>(null);
  const imageOffsetRef = useRef({ x: 0, y: 0 });
  const imageOffsetStartRef = useRef({ x: 0, y: 0 });
  const panContextRef = useRef({
    imageLayout: null as Rect | null,
    crop: null as Rect | null,
    totalRotation: 0,
  });
  const fineRotationRef = useRef(0);
  const fineRotationStartRef = useRef(0);
  const isHidingRef = useRef(false);
  const insets = useSafeAreaInsets();
  const topBarHeight = insets.top + TOP_BAR_HEIGHT;

  const photoHeight = containerHeight - topBarHeight - BOTTOM_BAR_HEIGHT;

  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  useEffect(() => {
    fineRotationRef.current = fineRotation;
  }, [fineRotation]);

  useEffect(() => {
    imageOffsetRef.current = imageOffset;
  }, [imageOffset]);

  useEffect(() => {
    let cancelled = false;
    setSourceSize(null);
    setCrop(null);
    setBaseRotation(0);
    setFineRotation(0);
    setImageOffset({ x: 0, y: 0 });
    setOriginalAngle(0);
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
    return getEditCanvasImageLayout(
      containerWidth,
      photoHeight,
      sourceSize.width,
      sourceSize.height,
      EDIT_CANVAS_PAD,
    );
  }, [containerWidth, photoHeight, sourceSize]);

  useEffect(() => {
    if (imageLayout && imageLayout.width > 0) {
      // Full photo bounds. The 85% pad already left finger room outside the image.
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
          const dialWidth = containerWidth - 80;
          const delta = (dx / dialWidth) * (MAX_ROTATION * 2);
          let next = start + delta;
          next = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, next));
          const snapped = Math.round(next / SNAP_DEGREE) * SNAP_DEGREE;
          setFineRotation(snapped);
        },
      }),
    [containerWidth, disabled],
  );

  const handleRotate90 = useCallback(() => {
    setBaseRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleReset = useCallback(() => {
    setBaseRotation(0);
    setFineRotation(0);
    setImageOffset({ x: 0, y: 0 });
    if (imageLayout && imageLayout.width > 0) {
      setCrop(defaultCropRectInImageLayout(imageLayout, 0));
    }
  }, [imageLayout]);

  const totalRotation = baseRotation + fineRotation;
  panContextRef.current = { imageLayout, crop, totalRotation };

  useEffect(() => {
    if (!imageLayout || !crop) return;
    const scale = cropRotationCoverScale(imageLayout, crop, totalRotation);
    setImageOffset((prev) => clampImagePan(imageLayout, crop, totalRotation, scale, prev));
  }, [imageLayout, crop, totalRotation]);

  const imagePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          imageOffsetStartRef.current = imageOffsetRef.current;
        },
        onPanResponderMove: (_evt, gesture) => {
          const ctx = panContextRef.current;
          if (!ctx.imageLayout || !ctx.crop) return;
          const scale = cropRotationCoverScale(ctx.imageLayout, ctx.crop, ctx.totalRotation);
          const next = clampImagePan(ctx.imageLayout, ctx.crop, ctx.totalRotation, scale, {
            x: imageOffsetStartRef.current.x + gesture.dx,
            y: imageOffsetStartRef.current.y + gesture.dy,
          });
          imageOffsetRef.current = next;
          setImageOffset(next);
        },
      }),
    [disabled],
  );

  const handleApply = () => {
    if (!crop || !imageLayout || !sourceSize) return;
    const hasRotation = Math.abs(totalRotation) > 0.1;
    const frame = cropRectForImageOffset(crop, imageOffset);
    const displayScale = cropRotationCoverScale(imageLayout, crop, totalRotation);
    const mapped = hasRotation
      ? mapCoverCropAfterRotation(
          frame,
          imageLayout,
          sourceSize.width,
          sourceSize.height,
          totalRotation,
          displayScale,
        )
      : mapCropRectToSourcePixels(
          frame,
          imageLayout,
          sourceSize.width,
          sourceSize.height,
        );
    if (!mapped) return;
    
    isHidingRef.current = true;
    setIsHiding(true);
    
    requestAnimationFrame(() => {
      onApply(mapped, hasRotation ? totalRotation : undefined);
    });
  };

  if (isHiding || isHidingRef.current) {
    return null;
  }

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

  const imageBottom = topBarHeight + imageLayout.y + imageLayout.height;
  const buttonRowHeight = 60 + insets.bottom;
  const dialCenterX = containerWidth / 2;
  const dialCenterY = Math.min(
    dialPeekCenterY(imageBottom, DIAL_RADIUS),
    containerHeight - buttonRowHeight - 8 - DIAL_RADIUS,
  );

  return (
    <View
      testID="photo-selection__crop_overlay"
      style={[
        styles.fill,
        { width: containerWidth, height: containerHeight, backgroundColor: "#000" },
      ]}
    >
      {/* Top Bar - below the status bar so Cancel / Done can be tapped */}
      <View
        style={{
          height: topBarHeight,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#edf0f2",
          paddingTop: insets.top,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 4,
        }}
      >
        <Pressable
          testID="photo-selection__crop_cancel"
          onPress={onCancel}
          disabled={disabled}
          style={{ padding: 8 }}
        >
          <Text style={{ fontSize: 20, fontWeight: "600", color: "#18212b" }}>
            Cancel
          </Text>
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#303a44" }}>
          Crop / Rotate
        </Text>
        <Pressable
          testID="photo-selection__crop_apply"
          onPress={handleApply}
          disabled={disabled}
          style={{ padding: 8 }}
        >
          <Text style={{ fontSize: 20, fontWeight: "600", color: "#18212b" }}>
            Done
          </Text>
        </Pressable>
      </View>

      {/* Fixed circle behind the photo. Markings turn around this center; the center does not move. */}
      <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]} pointerEvents="box-none">
        <View
          {...rotationDialResponder.panHandlers}
          testID="photo-selection__rotation_dial"
          style={StyleSheet.absoluteFill}
        >
          {Array.from({ length: 91 }, (_, i) => {
            const angleDeg = -MAX_ROTATION + i * 2;
            const offset = dialMarkOffset(angleDeg, fineRotation, DIAL_RADIUS);
            const isMajor = angleDeg % 30 === 0;
            const dotSize = isMajor ? 5 : 3.5;
            return (
              <View
                key={i}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: dialCenterX + offset.x - dotSize / 2,
                  top: dialCenterY + offset.y - dotSize / 2,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  backgroundColor: DIAL_MARK,
                }}
              />
            );
          })}
          {[-90, -60, -30, 0, 30, 60, 90].map((angleDeg) => {
            const offset = dialMarkOffset(angleDeg, fineRotation, DIAL_RADIUS);
            const isZero = angleDeg === 0;
            return (
              <Text
                key={angleDeg}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: dialCenterX + offset.x - 18,
                  top: dialCenterY + offset.y - 28,
                  width: 36,
                  color: DIAL_MARK,
                  fontSize: 16,
                  fontWeight: isZero ? "700" : "600",
                  textAlign: "center",
                }}
              >
                {angleDeg}
              </Text>
            );
          })}
        </View>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: dialCenterX - 6,
            top: dialCenterY + DIAL_RADIUS + 2,
            width: 0,
            height: 0,
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderBottomWidth: 9,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: "#fff",
          }}
        />
      </View>

      {/* Opaque stage masks the dial. It ends at the photo bottom so ~30% of the arc stays visible. */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: topBarHeight,
          height: imageLayout.y + imageLayout.height,
          backgroundColor: "#000",
          overflow: "hidden",
          zIndex: 1,
        }}
        pointerEvents="auto"
        {...imagePanResponder.panHandlers}
      >
        {/* Full photo on the black stage. Drag slides the photo; the crop rect stays put. */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: imageLayout.x + imageOffset.x,
            top: imageLayout.y + imageOffset.y,
            width: imageLayout.width,
            height: imageLayout.height,
            overflow: "visible",
          }}
        >
          <ExpoImage
            source={{ uri }}
            style={{
              width: imageLayout.width,
              height: imageLayout.height,
              transform: [
                { rotate: `${totalRotation}deg` },
                { scale: cropRotationCoverScale(imageLayout, crop, totalRotation) },
              ],
            }}
            contentFit="contain"
          />
        </View>

        {/* Light dim outside the selection so the photo outside the rect stays visible. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={{ height: crop.y, backgroundColor: OUTSIDE_CROP_DIM }} />
          <View style={{ flexDirection: "row", height: crop.height }}>
            <View style={{ width: crop.x, backgroundColor: OUTSIDE_CROP_DIM }} />
            <View
              style={{
                width: crop.width,
                height: crop.height,
                borderWidth: 1.5,
                borderColor: "rgba(255,255,255,0.96)",
              }}
            />
            <View style={{ flex: 1, backgroundColor: OUTSIDE_CROP_DIM }} />
          </View>
          <View style={{ flex: 1, backgroundColor: OUTSIDE_CROP_DIM }} />
        </View>

      </View>

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: topBarHeight,
          bottom: 0,
          zIndex: 2,
        }}
      >
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
          <View
            style={{
              position: "absolute",
              left: HANDLE_SIZE / 2,
              top: HANDLE_SIZE / 2,
              width: HANDLE_LENGTH,
              height: HANDLE_LENGTH,
              borderLeftWidth: HANDLE_THICKNESS,
              borderTopWidth: HANDLE_THICKNESS,
              borderColor: "#fff",
            }}
          />
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
          <View
            style={{
              position: "absolute",
              right: HANDLE_SIZE / 2,
              top: HANDLE_SIZE / 2,
              width: HANDLE_LENGTH,
              height: HANDLE_LENGTH,
              borderRightWidth: HANDLE_THICKNESS,
              borderTopWidth: HANDLE_THICKNESS,
              borderColor: "#fff",
            }}
          />
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
          <View
            style={{
              position: "absolute",
              left: HANDLE_SIZE / 2,
              bottom: HANDLE_SIZE / 2,
              width: HANDLE_LENGTH,
              height: HANDLE_LENGTH,
              borderLeftWidth: HANDLE_THICKNESS,
              borderBottomWidth: HANDLE_THICKNESS,
              borderColor: "#fff",
            }}
          />
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
          <View
            style={{
              position: "absolute",
              right: HANDLE_SIZE / 2,
              bottom: HANDLE_SIZE / 2,
              width: HANDLE_LENGTH,
              height: HANDLE_LENGTH,
              borderRightWidth: HANDLE_THICKNESS,
              borderBottomWidth: HANDLE_THICKNESS,
              borderColor: "#fff",
            }}
          />
        </View>
      </View>

      {/* Bottom controls sit under the peeking arc and do not cover it. */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: buttonRowHeight,
          backgroundColor: "transparent",
          zIndex: 3,
        }}
        pointerEvents="box-none"
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 26,
            paddingBottom: insets.bottom,
          }}
        >
          {/* 90° Rotate CCW - Square + Arrow Icon */}
          <Pressable
            testID="photo-selection__rotate_90"
            onPress={handleRotate90}
            disabled={disabled}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View style={{ width: 28, height: 28 }}>
              <Ionicons name="reload-outline" size={28} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
            </View>
          </Pressable>

          <Pressable
            testID="photo-selection__crop_reset"
            onPress={handleReset}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Reset crop and rotation"
            style={{
              height: 44,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 4,
            }}
          >
            <Ionicons name="arrow-undo-outline" size={22} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "600", marginLeft: 6 }}>
              Reset
            </Text>
          </Pressable>
        </View>
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
