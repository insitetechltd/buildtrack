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
  getContainedImageLayout,
  mapCropRectToSourcePixels,
  resolveImageDimensions,
  type Rect,
  type SourceCrop,
} from "../../utils/photoPreviewEdit";

const MIN_CROP_PX = 48;
const HANDLE_SIZE = 44;
const HANDLE_THICKNESS = 3;
const HANDLE_LENGTH = 23;
const MAX_ROTATION = 30;
const TOP_BAR_HEIGHT = 56;
const BOTTOM_BAR_HEIGHT = 180;
const SNAP_DEGREE = 1;

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
  const [originalAngle, setOriginalAngle] = useState(0);
  
  const cropRef = useRef<Rect | null>(null);
  const cropStartRef = useRef<Rect | null>(null);
  const fineRotationRef = useRef(0);
  const fineRotationStartRef = useRef(0);

  const photoHeight = containerHeight - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT;

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
    setBaseRotation(0);
    setFineRotation(0);
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
    return getContainedImageLayout(
      containerWidth,
      photoHeight,
      sourceSize.width,
      sourceSize.height,
    );
  }, [containerWidth, photoHeight, sourceSize]);

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

  const handleResetToOriginal = useCallback(() => {
    setBaseRotation(0);
    setFineRotation(0);
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

  const totalRotation = baseRotation + fineRotation;

  const imageScale = useMemo(() => {
    if (!imageLayout || !crop) return 1;
    const rotRad = (Math.abs(totalRotation) * Math.PI) / 180;
    if (rotRad < 0.001) return 1;
    const cos = Math.abs(Math.cos(rotRad));
    const sin = Math.abs(Math.sin(rotRad));
    const rotatedWidth = imageLayout.width * cos + imageLayout.height * sin;
    const rotatedHeight = imageLayout.width * sin + imageLayout.height * cos;
    const scaleX = rotatedWidth / imageLayout.width;
    const scaleY = rotatedHeight / imageLayout.height;
    return Math.max(scaleX, scaleY);
  }, [imageLayout, crop, totalRotation]);

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

  const dialWidth = containerWidth - 80;

  return (
    <View
      testID="photo-selection__crop_overlay"
      style={[styles.fill, { width: containerWidth, height: containerHeight }]}
      className="bg-white"
    >
      {/* Top Bar - White Chrome */}
      <View
        style={{
          height: TOP_BAR_HEIGHT,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#edf0f2",
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          testID="photo-selection__crop_cancel"
          onPress={onCancel}
          disabled={disabled}
          style={{ padding: 8 }}
        >
          <Text style={{ fontSize: 15, fontWeight: "650", color: "#18212b" }}>
            Cancel
          </Text>
        </Pressable>
        <Text style={{ fontSize: 13, fontWeight: "650", color: "#303a44", letterSpacing: 0.01 }}>
          Crop · rotate inside
        </Text>
        <Pressable
          testID="photo-selection__crop_apply"
          onPress={handleApply}
          disabled={disabled}
          style={{ padding: 8 }}
        >
          <Text style={{ fontSize: 15, fontWeight: "650", color: "#18212b" }}>
            Done
          </Text>
        </Pressable>
      </View>

      {/* Photo Stage - Full Source with Crop Frame */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: TOP_BAR_HEIGHT,
          bottom: BOTTOM_BAR_HEIGHT,
          backgroundColor: "#c7dce3",
        }}
        pointerEvents="box-none"
      >
        {/* Rotated Image - Scaled to Fill Crop - Clipped to Crop Frame */}
        <View
          style={{
            position: "absolute",
            left: crop.x,
            top: crop.y,
            width: crop.width,
            height: crop.height,
            overflow: "hidden",
          }}
          pointerEvents="none"
        >
          <View
            style={{
              position: "absolute",
              left: imageLayout.x - crop.x,
              top: imageLayout.y - crop.y,
              width: containerWidth,
              height: photoHeight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ExpoImage
              source={{ uri }}
              style={{
                width: imageLayout.width,
                height: imageLayout.height,
                transform: [
                  { rotate: `${totalRotation}deg` },
                  { scale: imageScale },
                ],
              }}
              contentFit="contain"
            />
          </View>
        </View>

        {/* Crop Overlay Mask */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={{ height: crop.y, backgroundColor: "rgba(0,0,0,0.56)" }} />
          <View style={{ flexDirection: "row", height: crop.height }}>
            <View style={{ width: crop.x, backgroundColor: "rgba(0,0,0,0.56)" }} />
            <View
              style={{
                width: crop.width,
                height: crop.height,
                borderWidth: 1.5,
                borderColor: "rgba(255,255,255,0.96)",
              }}
            />
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.56)" }} />
          </View>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.56)" }} />
        </View>

        {/* L-Bracket Corners - Exactly on Crop Frame Line */}
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

      {/* Bottom Bar - White Chrome */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: BOTTOM_BAR_HEIGHT,
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#edf0f2",
          paddingHorizontal: 22,
          paddingTop: 8,
          paddingBottom: 12,
        }}
      >
        {/* Fine Rotate Dial - Rotating Wheel Arc */}
        <View style={{ height: 78, alignItems: "center", justifyContent: "flex-start" }}>
          <View style={{ width: dialWidth + 28, height: 78 }}>
            <View
              {...rotationDialResponder.panHandlers}
              testID="photo-selection__rotation_dial"
              style={{
                width: dialWidth + 28,
                height: 78,
                position: "relative",
                paddingHorizontal: 14,
              }}
            >
              {/* Rotating Wheel Arc */}
              <View
                style={{
                  position: "absolute",
                  left: 14,
                  right: 14,
                  top: 8,
                  height: 60,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Arc Background Circle Segment */}
                <View
                  style={{
                    width: 120,
                    height: 120,
                    position: "absolute",
                    top: 0,
                    borderRadius: 60,
                    borderWidth: 2,
                    borderColor: "#d4dbe0",
                    borderTopColor: "transparent",
                    borderLeftColor: "transparent",
                    borderRightColor: "transparent",
                  }}
                />
                
                {/* Arc Tick Marks on Wheel Perimeter */}
                {Array.from({ length: 13 }, (_, i) => {
                  const angle = -MAX_ROTATION + (i * (MAX_ROTATION * 2)) / 12;
                  const isMajor = angle % 10 === 0;
                  const isCenter = Math.abs(angle) < 0.1;
                  
                  // Position ticks on arc perimeter (radius = 60)
                  const arcAngle = (angle / MAX_ROTATION) * (Math.PI / 3); // 60° arc span
                  const radius = 60;
                  const x = Math.sin(arcAngle) * radius;
                  const y = Math.cos(arcAngle) * radius;
                  
                  return (
                    <View
                      key={i}
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: radius,
                        width: isMajor ? 2 : 1,
                        height: isMajor ? 12 : 8,
                        backgroundColor: isMajor ? "#4a5861" : "#9aa5ad",
                        transform: [
                          { translateX: x - (isMajor ? 1 : 0.5) },
                          { translateY: -y - (isMajor ? 12 : 8) },
                          { rotate: `${-angle}deg` },
                        ],
                      }}
                    />
                  );
                })}

                {/* Arc Tick Labels Below the Wheel */}
                {[-30, -20, -10, 0, 10, 20, 30].map((angle) => {
                  const arcAngle = (angle / MAX_ROTATION) * (Math.PI / 3);
                  const radius = 60;
                  const x = Math.sin(arcAngle) * radius;
                  const y = Math.cos(arcAngle) * radius;
                  const isZero = angle === 0;
                  
                  return (
                    <Pressable
                      key={angle}
                      onPress={isZero ? handleResetToOriginal : undefined}
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: radius + 8,
                        transform: [
                          { translateX: x - 16 },
                          { translateY: -y },
                        ],
                        paddingVertical: 4,
                        paddingHorizontal: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: isZero ? "#18212b" : "#596671",
                          fontSize: 13,
                          fontWeight: isZero ? "750" : "600",
                          textAlign: "center",
                        }}
                      >
                        {angle === 0 ? "0°" : `${angle}°`}
                      </Text>
                    </Pressable>
                  );
                })}

                {/* Pointer - Triangle Arrow on Wheel */}
                <View
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: 60,
                    transform: [
                      { rotate: `${-fineRotation}deg` },
                      { translateY: -52 },
                      { translateX: -5 },
                    ],
                    width: 0,
                    height: 0,
                    borderLeftWidth: 5,
                    borderRightWidth: 5,
                    borderBottomWidth: 7,
                    borderLeftColor: "transparent",
                    borderRightColor: "transparent",
                    borderBottomColor: "#2b3844",
                  }}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Control Buttons */}
        <View
          style={{
            height: 48,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            borderTopWidth: 1,
            borderTopColor: "#f0f2f4",
          }}
        >
          <Pressable
            testID="photo-selection__rotate_90"
            onPress={handleRotate90}
            disabled={disabled}
            style={{
              height: 40,
              minWidth: 108,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: "#d4dbe0",
              borderRadius: 9,
              backgroundColor: "#fff",
            }}
          >
            <Ionicons name="refresh-outline" size={21} color="#263540" />
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#24313c" }}>
              90°
            </Text>
          </Pressable>

          <Pressable
            testID="photo-selection__aspect_ratio"
            disabled
            style={{
              height: 40,
              minWidth: 108,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: "#d4dbe0",
              borderRadius: 9,
              backgroundColor: "#fff",
              opacity: 0.5,
            }}
          >
            <Ionicons name="crop-outline" size={21} color="#263540" />
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#24313c" }}>
              Aspect
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
