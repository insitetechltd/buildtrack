import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import type * as MediaLibrary from "expo-media-library";

import {
  getPhotokitThumbNativeView,
  isPhotokitThumbsAvailable,
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
  onCommitAnnotation,
  testIdPrefix = "library-viewer",
  accentColor = "#2563EB",
}: LibraryFullscreenViewerProps) {
  const { width, height } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [drawMode, setDrawMode] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [drawColor, setDrawColor] = useState<DrawColor>(DRAW_COLORS[0]);
  const [activeStrokes, setActiveStrokes] = useState<DrawStroke[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const flatListRef = useRef<FlatList<ViewerItem>>(null);
  const useNativeThumbs = isPhotokitThumbsAvailable();
  const NativeThumb = useNativeThumbs ? getPhotokitThumbNativeView() : null;

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

  useEffect(() => {
    if (visible && initialIndex >= 0 && initialIndex < items.length) {
      setCurrentIndex(initialIndex);
      setDrawMode(false);
      setCropMode(false);
      setActiveStrokes([]);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 50);
    }
  }, [visible, initialIndex, items.length]);

  useEffect(() => {
    if (!visible) {
      setDrawMode(false);
      setCropMode(false);
      setActiveStrokes([]);
    }
  }, [visible]);

  const currentItem = items[currentIndex];
  const isSelected = currentItem ? selectedIds.has(currentItem.assetId) : false;
  const currentAnnotation = currentItem ? annotations.get(currentItem.assetId) : undefined;
  const displayUri = currentAnnotation?.annotatedUri || currentItem?.uri;
  const committedStrokes = currentAnnotation?.drawStrokes || [];

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (drawMode || cropMode) return;
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / width);
      if (index >= 0 && index < items.length && index !== currentIndex) {
        setCurrentIndex(index);
        setActiveStrokes([]);
      }
    },
    [cropMode, currentIndex, drawMode, items.length, width],
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

  const handleCommitStroke = useCallback(
    (stroke: DrawStroke) => {
      setActiveStrokes((prev) => appendStroke(prev, stroke));
    },
    [],
  );

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
      const sourceUri = displayUri;
      const { bakeStrokesOntoPhoto } = await import("../../utils/bakePhotoDraw");
      const annotatedUri = await bakeStrokesOntoPhoto(sourceUri, activeStrokes);
      
      await onCommitEdit(currentItem.assetId, annotatedUri);
      
      if (onUpdateAnnotation) {
        onUpdateAnnotation(currentItem.assetId, {
          drawStrokes: activeStrokes,
          annotatedUri,
          isEdited: true,
        });
      }
    } catch (error) {
      console.error("❌ [LibraryViewer] Draw failed:", error);
      Alert.alert("Error", "Could not apply drawing. Please try again.");
    } finally {
      setIsCommitting(false);
      setDrawMode(false);
      setActiveStrokes([]);
    }
  }, [activeStrokes, currentItem, displayUri, onCommitEdit, onUpdateAnnotation]);

  const handleRotate = useCallback(async () => {
    if (!currentItem || !onCommitEdit) return;

    setIsCommitting(true);
    try {
      const sourceUri = displayUri;
      const result = await ImageManipulator.manipulateAsync(
        sourceUri,
        [{ rotate: 90 }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
      );

      await onCommitEdit(currentItem.assetId, result.uri);

      if (onUpdateAnnotation) {
        onUpdateAnnotation(currentItem.assetId, {
          annotatedUri: result.uri,
          isEdited: true,
        });
      }
    } catch (error) {
      console.error("❌ [LibraryViewer] Rotate failed:", error);
      Alert.alert("Error", "Could not rotate photo. Please try again.");
    } finally {
      setIsCommitting(false);
    }
  }, [currentItem, displayUri, onCommitEdit, onUpdateAnnotation]);

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
    async (crop: SourceCrop) => {
      if (!currentItem || !onCommitEdit) return;

      if (crop.width < 1 || crop.height < 1) {
        Alert.alert("Invalid Crop", "Please select a larger crop area.");
        return;
      }

      setIsCommitting(true);
      try {
        const sourceUri = displayUri;
        const result = await ImageManipulator.manipulateAsync(
          sourceUri,
          [
            {
              crop: {
                originX: crop.originX,
                originY: crop.originY,
                width: crop.width,
                height: crop.height,
              },
            },
          ],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
        );

        await onCommitEdit(currentItem.assetId, result.uri);

        if (onUpdateAnnotation) {
          onUpdateAnnotation(currentItem.assetId, {
            annotatedUri: result.uri,
            isEdited: true,
          });
        }

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

  return (
    <View
      testID={`${testIdPrefix}__fullscreen`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#000",
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingTop: 48,
        }}
      >
        <Pressable
          testID={`${testIdPrefix}__close`}
          onPress={onClose}
          disabled={isCommitting}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isCommitting ? "rgba(100,100,100,0.3)" : "rgba(255,255,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>

        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
          {currentIndex + 1} / {itemCount}
        </Text>

        <Pressable
          testID={`${testIdPrefix}__toggle_select`}
          onPress={handleToggleSelect}
          disabled={isCommitting}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isSelected ? accentColor : isCommitting ? "rgba(100,100,100,0.3)" : "rgba(255,255,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={isSelected ? "checkmark" : "ellipse-outline"}
            size={24}
            color="#fff"
          />
        </Pressable>
      </View>

      {/* Swipeable Grid */}
      <View style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={items}
          keyExtractor={(item) => `viewer_${item.assetId}`}
          horizontal
          pagingEnabled
          scrollEnabled={!drawMode && !cropMode}
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          renderItem={({ item }) => {
            const isCurrentItem = item.index === currentIndex;
            const itemAnnotation = annotations.get(item.assetId);
            const itemUri = itemAnnotation?.annotatedUri || item.uri;

            return (
              <View
                style={{
                  width,
                  height: height - 200,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {useNativeThumbs && NativeThumb && indexMode && indexSession && !itemAnnotation?.annotatedUri ? (
                  <NativeThumb
                    token={indexSession.token}
                    index={item.index}
                    pixelSize={Math.max(width, height)}
                    contentFit="contain"
                    style={{ width, height: height - 200 }}
                  />
                ) : (
                  <ExpoImage
                    source={{ uri: itemUri }}
                    cachePolicy="memory-disk"
                    contentFit="contain"
                    style={{ width, height: height - 200 }}
                  />
                )}
              </View>
            );
          }}
        />
        
        {/* DrawOverlay only on current item when in draw mode */}
        {drawMode && displayUri && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width,
              height: height - 200,
            }}
            pointerEvents="box-none"
          >
            <DrawOverlay
              uri={displayUri}
              containerWidth={width}
              containerHeight={height - 200}
              color={drawColor}
              strokes={activeStrokes}
              disabled={isCommitting}
              onCommitStroke={handleCommitStroke}
            />
          </View>
        )}

        {/* CropOverlay only on current item when in crop mode */}
        {cropMode && displayUri && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width,
              height: height - 200,
            }}
          >
            <CropOverlay
              uri={displayUri}
              containerWidth={width}
              containerHeight={height - 200}
              disabled={isCommitting}
              onCancel={handleToggleCropMode}
              onApply={handleApplyCrop}
            />
          </View>
        )}
      </View>

      {/* Edit Tools */}
      {onCommitEdit && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(0,0,0,0.9)",
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 24,
          }}
        >
          {!drawMode && !cropMode ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                testID={`${testIdPrefix}__start_draw`}
                onPress={handleToggleDrawMode}
                disabled={isCommitting}
                style={{
                  flex: 1,
                  backgroundColor: isCommitting ? "rgba(100,100,100,0.5)" : "rgba(255,255,255,0.2)",
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
                  Annotate
                </Text>
              </Pressable>

              <Pressable
                testID={`${testIdPrefix}__rotate`}
                onPress={handleRotate}
                disabled={isCommitting}
                style={{
                  flex: 1,
                  backgroundColor: isCommitting ? "rgba(100,100,100,0.5)" : "rgba(255,255,255,0.2)",
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {isCommitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={20} color="#fff" />
                    <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
                      Rotate
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                testID={`${testIdPrefix}__start_crop`}
                onPress={handleToggleCropMode}
                disabled={isCommitting}
                style={{
                  flex: 1,
                  backgroundColor: isCommitting ? "rgba(100,100,100,0.5)" : "rgba(255,255,255,0.2)",
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Ionicons name="crop-outline" size={20} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
                  Crop
                </Text>
              </Pressable>
            </View>
          ) : drawMode ? (
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
                        borderColor: selected ? "#fff" : "rgba(255,255,255,0.3)",
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
                  style={{
                    flex: 1,
                    backgroundColor: isCommitting ? "rgba(100,100,100,0.5)" : "rgba(255,255,255,0.15)",
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>Cancel</Text>
                </Pressable>

                <Pressable
                  testID={`${testIdPrefix}__undo_stroke`}
                  onPress={handleUndoStroke}
                  disabled={isCommitting || activeStrokes.length === 0}
                  style={{
                    flex: 1,
                    backgroundColor:
                      isCommitting || activeStrokes.length === 0
                        ? "rgba(100,100,100,0.3)"
                        : "rgba(255,255,255,0.15)",
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: activeStrokes.length === 0 ? "#888" : "#fff",
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    Undo
                  </Text>
                </Pressable>

                <Pressable
                  testID={`${testIdPrefix}__done_draw`}
                  onPress={handleDoneDrawing}
                  disabled={isCommitting}
                  style={{
                    flex: 1,
                    backgroundColor: isCommitting ? "rgba(37, 99, 235, 0.5)" : accentColor,
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isCommitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>Done</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}
