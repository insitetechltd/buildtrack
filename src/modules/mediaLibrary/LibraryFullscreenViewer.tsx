import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type * as MediaLibrary from "expo-media-library";
import * as ImageManipulator from "expo-image-manipulator";

import {
  photokitIdAt,
  type PhotokitLibrarySession,
} from "./PhotokitThumbView";
import { DrawOverlay } from "../../components/photoEdit/DrawOverlay";
import { CropOverlay } from "../../components/photoEdit/CropOverlay";
import {
  appendStroke,
  DRAW_COLORS,
  undoLastStroke,
  type DrawColor,
  type DrawStroke,
} from "../../utils/photoPreviewDraw";
import type { SourceCrop } from "../../utils/photoPreviewEdit";

export type AssetAnnotation = {
  drawStrokes?: DrawStroke[];
  annotatedUri?: string;
  isEdited?: boolean;
};

type LibraryFullscreenViewerProps = {
  visible: boolean;
  initialIndex: number;
  assets: MediaLibrary.Asset[];
  indexSession?: PhotokitLibrarySession | null;
  selectedIds: Set<string>;
  annotations: Map<string, AssetAnnotation>;
  onToggleSelect: (assetId: string) => void;
  onClose: () => void;
  onUpdateAnnotation?: (assetId: string, annotation: AssetAnnotation) => void;
  onCommitEdit?: (assetId: string, editedUri: string) => Promise<void>;
  testIdPrefix?: string;
  accentColor?: string;
};

type ViewerItem = {
  index: number;
  assetId: string;
  uri: string;
};

/**
 * Fullscreen review / edit for one library asset at a time.
 * Intentionally not a paged FlatList — paging recycled adjacent cells and fought
 * the previous photo after crop/annotate (second-open flicker).
 */
export function LibraryFullscreenViewer({
  visible,
  initialIndex,
  assets,
  indexSession,
  selectedIds,
  annotations,
  onToggleSelect,
  onClose,
  onUpdateAnnotation,
  onCommitEdit,
  testIdPrefix = "library-viewer",
  accentColor = "#2563EB",
}: LibraryFullscreenViewerProps) {
  const { width, height } = useWindowDimensions();

  const HEADER_HEIGHT = 112;
  const TOOLBAR_HEIGHT = 128;
  const PHOTO_HEIGHT = height - HEADER_HEIGHT - TOOLBAR_HEIGHT;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [drawMode, setDrawMode] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [drawColor, setDrawColor] = useState<DrawColor>(DRAW_COLORS[0]);
  const [activeStrokes, setActiveStrokes] = useState<DrawStroke[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  /** Remount key for the single image surface when opening a different asset. */
  const [imageSession, setImageSession] = useState(0);

  const indexMode = indexSession != null;
  const itemCount = indexMode ? indexSession.count : assets.length;

  const items = useMemo((): ViewerItem[] => {
    if (indexMode && indexSession) {
      return Array.from({ length: indexSession.count }, (_, i) => {
        const id = photokitIdAt(indexSession.token, i);
        return {
          index: i,
          assetId: id || `__idx_${i}`,
          uri: id ? `ph://${id}` : "",
        };
      });
    }
    return assets.map((asset, i) => ({
      index: i,
      assetId: asset.id,
      uri: asset.uri,
    }));
  }, [assets, indexMode, indexSession]);

  const openAssetId =
    initialIndex >= 0 && initialIndex < items.length
      ? items[initialIndex]?.assetId
      : "";

  // Sync to the opened asset before paint so the prior photo never flashes.
  useLayoutEffect(() => {
    if (!visible) {
      setDrawMode(false);
      setCropMode(false);
      setActiveStrokes([]);
      return;
    }
    if (initialIndex < 0 || initialIndex >= items.length) return;
    setCurrentIndex(initialIndex);
    setDrawMode(false);
    setCropMode(false);
    setActiveStrokes([]);
    setImageSession((n) => n + 1);
  }, [visible, initialIndex, openAssetId, items.length]);

  const currentItem = items[currentIndex];
  const isSelected = currentItem ? selectedIds.has(currentItem.assetId) : false;
  const currentAnnotation = currentItem
    ? annotations.get(currentItem.assetId)
    : undefined;
  const displayUri = currentAnnotation?.annotatedUri || currentItem?.uri || "";

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < items.length - 1;

  const goToIndex = useCallback(
    (next: number) => {
      if (next < 0 || next >= items.length || drawMode || cropMode || isCommitting) {
        return;
      }
      setCurrentIndex(next);
      setActiveStrokes([]);
      setImageSession((n) => n + 1);
    },
    [cropMode, drawMode, isCommitting, items.length],
  );

  const handleToggleSelect = useCallback(() => {
    if (currentItem && !drawMode && !cropMode) {
      onToggleSelect(currentItem.assetId);
    }
  }, [cropMode, currentItem, drawMode, onToggleSelect]);

  const handleToggleDrawMode = useCallback(() => {
    if (drawMode) {
      setDrawMode(false);
      setActiveStrokes([]);
    } else {
      setCropMode(false);
      if (currentItem) {
        const existing = annotations.get(currentItem.assetId);
        setActiveStrokes(existing?.drawStrokes || []);
      }
      setDrawMode(true);
    }
  }, [annotations, currentItem, drawMode]);

  const handleCommitStroke = useCallback((stroke: DrawStroke) => {
    setActiveStrokes((prev) => appendStroke(prev, stroke));
  }, []);

  const handleUndoStroke = useCallback(() => {
    setActiveStrokes((prev) => undoLastStroke(prev));
  }, []);

  const handleDoneDrawing = useCallback(async () => {
    if (!currentItem || !onCommitEdit || activeStrokes.length === 0) {
      setDrawMode(false);
      setActiveStrokes([]);
      return;
    }

    setIsCommitting(true);
    try {
      const { bakeStrokesOntoPhoto } = await import("../../utils/bakePhotoDraw");
      const annotatedUri = await bakeStrokesOntoPhoto(displayUri, activeStrokes);

      await onCommitEdit(currentItem.assetId, annotatedUri);

      if (onUpdateAnnotation) {
        onUpdateAnnotation(currentItem.assetId, {
          drawStrokes: activeStrokes,
          annotatedUri,
          isEdited: true,
        });
      }
      setImageSession((n) => n + 1);
    } catch (error) {
      console.error("❌ [LibraryViewer] Draw failed:", error);
      Alert.alert("Error", "Could not apply drawing. Please try again.");
    } finally {
      setIsCommitting(false);
      setDrawMode(false);
      setActiveStrokes([]);
    }
  }, [activeStrokes, currentItem, displayUri, onCommitEdit, onUpdateAnnotation]);

  const handleToggleCropMode = useCallback(() => {
    if (cropMode) {
      setCropMode(false);
    } else {
      setDrawMode(false);
      setActiveStrokes([]);
      setCropMode(true);
    }
  }, [cropMode]);

  const handleApplyCrop = useCallback(
    async (crop: SourceCrop, rotation?: number) => {
      if (!currentItem || !onCommitEdit) return;

      if (crop.width < 1 || crop.height < 1) {
        Alert.alert("Invalid Crop", "Please select a larger crop area.");
        return;
      }

      setIsCommitting(true);
      try {
        const actions: ImageManipulator.Action[] = [];
        if (rotation && Math.abs(rotation) > 0.1) {
          actions.push({ rotate: rotation });
        }
        actions.push({
          crop: {
            originX: crop.originX,
            originY: crop.originY,
            width: crop.width,
            height: crop.height,
          },
        });

        const result = await ImageManipulator.manipulateAsync(
          displayUri,
          actions,
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
        );

        await onCommitEdit(currentItem.assetId, result.uri);

        if (onUpdateAnnotation) {
          onUpdateAnnotation(currentItem.assetId, {
            annotatedUri: result.uri,
            isEdited: true,
          });
        }

        setImageSession((n) => n + 1);
        setCropMode(false);
      } catch (error) {
        console.error("❌ [LibraryViewer] Crop failed:", error);
        Alert.alert("Error", "Could not crop photo. Please try again.");
      } finally {
        setIsCommitting(false);
      }
    },
    [currentItem, displayUri, onCommitEdit, onUpdateAnnotation],
  );

  if (!visible) {
    return null;
  }

  // Crop/rotate is a separate full-screen editor — no picker X / select chrome.
  if (cropMode && displayUri) {
    return (
      <View
        testID={`${testIdPrefix}__fullscreen`}
        style={styles.root}
      >
        <CropOverlay
          key={`crop_${currentItem?.assetId}_${displayUri}`}
          uri={displayUri}
          containerWidth={width}
          containerHeight={height}
          disabled={isCommitting}
          onCancel={handleToggleCropMode}
          onApply={handleApplyCrop}
        />
        {isCommitting ? (
          <View style={styles.committingMask}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View testID={`${testIdPrefix}__fullscreen`} style={styles.root}>
      <View style={styles.header}>
        <Pressable
          testID={`${testIdPrefix}__close`}
          onPress={onClose}
          disabled={isCommitting || drawMode}
          style={[styles.headerBtn, drawMode && styles.headerBtnDim]}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>

        <Text style={styles.counter}>
          {currentIndex + 1} / {itemCount}
        </Text>

        <Pressable
          testID={`${testIdPrefix}__toggle_select`}
          onPress={handleToggleSelect}
          disabled={isCommitting || drawMode}
          style={[
            styles.headerBtn,
            { backgroundColor: isSelected ? accentColor : "rgba(255,255,255,0.15)" },
            drawMode && styles.headerBtnDim,
          ]}
        >
          <Ionicons
            name={isSelected ? "checkmark" : "ellipse-outline"}
            size={24}
            color="#fff"
          />
        </Pressable>
      </View>

      <View style={{ height: PHOTO_HEIGHT, backgroundColor: "#000" }}>
        {displayUri ? (
          <ExpoImage
            key={`viewer_img_${currentItem?.assetId}_${displayUri}_${imageSession}`}
            source={{ uri: displayUri }}
            recyclingKey={`${currentItem?.assetId}:${displayUri}`}
            cachePolicy="memory-disk"
            contentFit="contain"
            transition={0}
            style={{ width, height: PHOTO_HEIGHT, backgroundColor: "#000" }}
          />
        ) : (
          <View
            style={{
              width,
              height: PHOTO_HEIGHT,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator color="#fff" />
          </View>
        )}

        {/* Edge prev/next — no recycled FlatList pages fighting each other */}
        {!drawMode && !cropMode ? (
          <>
            {canGoPrev ? (
              <Pressable
                testID={`${testIdPrefix}__prev`}
                onPress={() => goToIndex(currentIndex - 1)}
                style={[styles.edgeNav, { left: 4 }]}
                hitSlop={12}
              >
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </Pressable>
            ) : null}
            {canGoNext ? (
              <Pressable
                testID={`${testIdPrefix}__next`}
                onPress={() => goToIndex(currentIndex + 1)}
                style={[styles.edgeNav, { right: 4 }]}
                hitSlop={12}
              >
                <Ionicons name="chevron-forward" size={28} color="#fff" />
              </Pressable>
            ) : null}
          </>
        ) : null}

        {drawMode && displayUri ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width,
              height: PHOTO_HEIGHT,
            }}
            pointerEvents="box-none"
          >
            <DrawOverlay
              uri={displayUri}
              containerWidth={width}
              containerHeight={PHOTO_HEIGHT}
              color={drawColor}
              strokes={activeStrokes}
              disabled={isCommitting}
              onCommitStroke={handleCommitStroke}
            />
          </View>
        ) : null}
      </View>

      {onCommitEdit ? (
        <View style={styles.toolbar}>
          {!drawMode ? (
            <View style={{ flexDirection: "row", gap: 16, justifyContent: "center" }}>
              <View style={{ alignItems: "center", gap: 4 }}>
                <Pressable
                  testID={`${testIdPrefix}__start_draw`}
                  onPress={handleToggleDrawMode}
                  disabled={isCommitting}
                  style={[
                    styles.toolBtn,
                    { backgroundColor: isCommitting ? "#4b5563" : accentColor },
                  ]}
                >
                  <Ionicons name="create-outline" size={24} color="#fff" />
                </Pressable>
                <Text style={styles.toolLabel}>Annotate</Text>
              </View>

              <View style={{ alignItems: "center", gap: 4 }}>
                <Pressable
                  testID={`${testIdPrefix}__start_crop`}
                  onPress={handleToggleCropMode}
                  disabled={isCommitting}
                  style={[
                    styles.toolBtn,
                    { backgroundColor: isCommitting ? "#4b5563" : accentColor },
                  ]}
                >
                  <Ionicons name="crop-outline" size={24} color="#fff" />
                </Pressable>
                <Text style={styles.toolLabel}>Crop</Text>
              </View>
            </View>
          ) : (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                {DRAW_COLORS.map((swatch) => {
                  const selected = drawColor === swatch;
                  return (
                    <Pressable
                      key={swatch}
                      testID={`${testIdPrefix}__draw_color_${swatch.replace("#", "")}`}
                      onPress={() => setDrawColor(swatch)}
                      disabled={isCommitting}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: swatch,
                        borderWidth: 2,
                        borderColor: selected ? "#fff" : "#4b5563",
                        opacity: isCommitting ? 0.5 : 1,
                      }}
                    />
                  );
                })}
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  testID={`${testIdPrefix}__cancel_draw`}
                  onPress={handleToggleDrawMode}
                  disabled={isCommitting}
                  style={styles.drawAction}
                >
                  <Text style={styles.drawActionText}>Cancel</Text>
                </Pressable>

                <Pressable
                  testID={`${testIdPrefix}__undo_stroke`}
                  onPress={handleUndoStroke}
                  disabled={isCommitting || activeStrokes.length === 0}
                  style={[
                    styles.drawAction,
                    activeStrokes.length === 0 && { opacity: 0.45 },
                  ]}
                >
                  <Text style={styles.drawActionText}>Undo</Text>
                </Pressable>

                <Pressable
                  testID={`${testIdPrefix}__done_draw`}
                  onPress={handleDoneDrawing}
                  disabled={isCommitting}
                  style={[
                    styles.drawAction,
                    {
                      backgroundColor: isCommitting ? "#93c5fd" : accentColor,
                    },
                  ]}
                >
                  {isCommitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.drawActionText}>Done</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
    zIndex: 1000,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    backgroundColor: "#000",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnDim: {
    opacity: 0.4,
  },
  counter: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  edgeNav: {
    position: "absolute",
    top: "45%",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  toolbar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#000",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  toolBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  toolLabel: {
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: "600",
  },
  drawAction: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  drawActionText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  committingMask: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
});
