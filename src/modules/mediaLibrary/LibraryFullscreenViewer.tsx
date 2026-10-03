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

/**
 * Place the fullscreen pager once per open. Re-scrolling whenever the library
 * count grows, or whenever `onScroll` reports another page, ping-pongs the
 * viewer between the first photo and the thumbnail that was tapped.
 */
export function shouldPlaceFullscreenScroll(
  placedToken: string | null,
  initialIndex: number,
  itemCount: number,
): boolean {
  if (itemCount <= 0 || initialIndex < 0) return false;
  return placedToken !== String(initialIndex);
}

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
  
  // Layout calculations to eliminate black gaps between photo and toolbar
  // Measured from rendered components for precise layout
  const HEADER_HEIGHT = 112; // paddingTop 48 + paddingVertical 12*2 + button 40
  const TOOLBAR_HEIGHT = 128; // border 1 + paddingTop 16 + button 56 + gap 4 + label ~22 + paddingBottom 24 + extra buffer 5
  const PHOTO_HEIGHT = height - HEADER_HEIGHT - TOOLBAR_HEIGHT;
  
  // Dimension key for FlatList remount on orientation change
  // Forces fresh layout calculations when orientation changes to prevent crash
  const dimensionKey = useMemo(() => `${Math.round(width / 100)}-${Math.round(height / 100)}`, [width, height]);
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [drawMode, setDrawMode] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [drawColor, setDrawColor] = useState<DrawColor>(DRAW_COLORS[0]);
  const [activeStrokes, setActiveStrokes] = useState<DrawStroke[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const flatListRef = useRef<FlatList<ViewerItem>>(null);
  const currentIndexRef = useRef(initialIndex);
  const placedForOpen = useRef<string | null>(null);
  currentIndexRef.current = currentIndex;
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
    if (!visible) {
      placedForOpen.current = null;
      return;
    }
    if (!shouldPlaceFullscreenScroll(placedForOpen.current, initialIndex, items.length)) {
      return;
    }
    const index = Math.min(initialIndex, items.length - 1);
    placedForOpen.current = String(initialIndex);
    currentIndexRef.current = index;
    setCurrentIndex(index);
    setDrawMode(false);
    setCropMode(false);
    setActiveStrokes([]);
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [visible, initialIndex, items.length]);

  // Orientation only. Do not depend on currentIndex — that re-scrolls on every
  // page change and fights the list back to the other photo.
  useEffect(() => {
    if (!visible) return;
    const index = currentIndexRef.current;
    if (index < 0 || index >= items.length) return;
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: false });
    }, 0);
    return () => clearTimeout(timer);
    // items.length is read when dimensions change; growing the library must not re-scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensionKey, visible]);

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

  const commitPageIndex = useCallback(
    (offsetX: number) => {
      if (drawMode || cropMode || width <= 0) return;
      const index = Math.round(offsetX / width);
      if (index < 0 || index >= items.length || index === currentIndexRef.current) return;
      currentIndexRef.current = index;
      setCurrentIndex(index);
      setActiveStrokes([]);
    },
    [cropMode, drawMode, items.length, width],
  );

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      commitPageIndex(event.nativeEvent.contentOffset.x);
    },
    [commitPageIndex],
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
    async (crop: SourceCrop, rotation?: number) => {
      if (!currentItem || !onCommitEdit) return;

      if (crop.width < 1 || crop.height < 1) {
        Alert.alert("Invalid Crop", "Please select a larger crop area.");
        return;
      }

      setCropMode(false);
      setIsCommitting(true);
      try {
        const sourceUri = displayUri;
        const actions: ImageManipulator.Action[] = [];

        // Apply rotation first if provided
        if (rotation && Math.abs(rotation) > 0.1) {
          actions.push({ rotate: rotation });
        }

        // Then crop
        actions.push({
          crop: {
            originX: crop.originX,
            originY: crop.originY,
            width: crop.width,
            height: crop.height,
          },
        });

        const result = await ImageManipulator.manipulateAsync(
          sourceUri,
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
        <CropOverlay
          uri={displayUri}
          containerWidth={width}
          containerHeight={height}
          disabled={isCommitting}
          onCancel={handleToggleCropMode}
          onApply={handleApplyCrop}
        />
      </View>
    );
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
        <View style={{ width: 40, height: 40 }} />

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
            backgroundColor: isSelected ? accentColor : isCommitting ? "#d1d5db" : "#f3f4f6",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={isSelected ? "checkmark" : "ellipse-outline"}
            size={24}
            color={isSelected ? "#fff" : "#374151"}
          />
        </Pressable>
      </View>

      {/* Swipeable Grid */}
      <View style={{ height: PHOTO_HEIGHT, backgroundColor: "#000" }}>
        <FlatList
          key={dimensionKey}
          ref={flatListRef}
          data={items}
          keyExtractor={(item) => `viewer_${item.assetId}`}
          horizontal
          pagingEnabled
          scrollEnabled={!drawMode && !cropMode}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={
            items.length > 0
              ? Math.min(
                  Math.max(
                    placedForOpen.current === String(initialIndex)
                      ? currentIndex
                      : initialIndex,
                    0,
                  ),
                  items.length - 1,
                )
              : 0
          }
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          onScrollToIndexFailed={(info) => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: false,
            });
          }}
          style={{ backgroundColor: "#000", height: PHOTO_HEIGHT }}
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
                  height: PHOTO_HEIGHT,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#000",
                }}
              >
                {useNativeThumbs && NativeThumb && indexMode && indexSession && !itemAnnotation?.annotatedUri ? (
                  <NativeThumb
                    token={indexSession.token}
                    index={item.index}
                    pixelSize={Math.max(width, height)}
                    contentFit="contain"
                    style={{ width, height: PHOTO_HEIGHT, backgroundColor: "#000" }}
                  />
                ) : (
                  <ExpoImage
                    source={{ uri: itemUri }}
                    cachePolicy="memory-disk"
                    contentFit="contain"
                    style={{ width, height: PHOTO_HEIGHT, backgroundColor: "#000" }}
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
            backgroundColor: "#fff",
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 24,
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
          }}
        >
          {!drawMode && !cropMode ? (
            <View style={{ flexDirection: "row", gap: 16, justifyContent: "center" }}>
              <View style={{ alignItems: "center", gap: 4 }}>
                <Pressable
                  testID={`${testIdPrefix}__start_draw`}
                  onPress={handleToggleDrawMode}
                  disabled={isCommitting}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: isCommitting ? "#d1d5db" : accentColor,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="create-outline" size={24} color="#fff" />
                </Pressable>
                <Text style={{ color: "#374151", fontSize: 13, fontWeight: "600" }}>
                  Annotate
                </Text>
              </View>

              <View style={{ alignItems: "center", gap: 4 }}>
                <Pressable
                  testID={`${testIdPrefix}__start_crop`}
                  onPress={handleToggleCropMode}
                  disabled={isCommitting}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: isCommitting ? "#d1d5db" : accentColor,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="crop-outline" size={24} color="#fff" />
                </Pressable>
                <Text style={{ color: "#374151", fontSize: 13, fontWeight: "600" }}>
                  Crop
                </Text>
              </View>

              <View style={{ alignItems: "center", gap: 4 }}>
                <Pressable
                  testID={`${testIdPrefix}__close`}
                  onPress={onClose}
                  disabled={isCommitting}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: isCommitting ? "#d1d5db" : "#f3f4f6",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={28} color="#374151" />
                </Pressable>
                <Text style={{ color: "#374151", fontSize: 13, fontWeight: "600" }}>
                  Close
                </Text>
              </View>
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
                        borderColor: selected ? "#111827" : "#d1d5db",
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
                    backgroundColor: isCommitting ? "#d1d5db" : "#f3f4f6",
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#374151", fontSize: 15, fontWeight: "600" }}>Cancel</Text>
                </Pressable>

                <Pressable
                  testID={`${testIdPrefix}__undo_stroke`}
                  onPress={handleUndoStroke}
                  disabled={isCommitting || activeStrokes.length === 0}
                  style={{
                    flex: 1,
                    backgroundColor:
                      isCommitting || activeStrokes.length === 0
                        ? "#e5e7eb"
                        : "#f3f4f6",
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: activeStrokes.length === 0 ? "#9ca3af" : "#374151",
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
                    backgroundColor: isCommitting ? "#93c5fd" : accentColor,
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
          ) : null}
        </View>
      )}
    </View>
  );
}
