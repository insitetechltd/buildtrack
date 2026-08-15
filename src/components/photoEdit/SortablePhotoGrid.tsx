import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import type { SelectedPhoto } from "../../utils/usePhotoSelection";

const GRID_COLS = 3;
const SPRING = { damping: 18, stiffness: 220, mass: 0.4 };

export type SortablePhotoGridLayout = {
  pad: number;
  gap: number;
  tileSize: number;
};

type SortablePhotoGridProps = {
  photos: SelectedPhoto[];
  layout: SortablePhotoGridLayout;
  onReorder: (nextPhotos: SelectedPhoto[]) => void;
  onPressPhoto: (index: number) => void;
  onPressAdd: () => void;
};

function slotOrigin(slotIndex: number, tileSize: number, gap: number) {
  const col = slotIndex % GRID_COLS;
  const row = Math.floor(slotIndex / GRID_COLS);
  return {
    x: col * (tileSize + gap),
    y: row * (tileSize + gap),
  };
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

type DraggingPhotoTileProps = {
  photo: SelectedPhoto;
  index: number;
  tileSize: number;
  gap: number;
  positions: number[];
  draggingIndex: number | null;
  onDragStart: (index: number) => void;
  onDragUpdate: (translationX: number, translationY: number) => void;
  onDragEnd: () => void;
  onPress: (index: number) => void;
};

function DraggingPhotoTile({
  photo,
  index,
  tileSize,
  gap,
  positions,
  draggingIndex,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  onPress,
}: DraggingPhotoTileProps) {
  const isDragging = draggingIndex === index;
  const displaySlot = Math.max(0, positions.indexOf(index));
  const slotIndex = displaySlot + 1; // +1 for Add tile at slot 0
  const home = slotOrigin(slotIndex, tileSize, gap);

  const translateX = useSharedValue(home.x);
  const translateY = useSharedValue(home.y);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const startX = useSharedValue(home.x);
  const startY = useSharedValue(home.y);

  useEffect(() => {
    if (isDragging) return;
    translateX.value = withSpring(home.x, SPRING);
    translateY.value = withSpring(home.y, SPRING);
  }, [home.x, home.y, isDragging, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: 0,
    top: 0,
    width: tileSize,
    height: tileSize,
    zIndex: zIndex.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activateAfterLongPress(160)
      .onStart(() => {
        startX.value = translateX.value;
        startY.value = translateY.value;
        scale.value = withSpring(1.08, SPRING);
        zIndex.value = 20;
        runOnJS(onDragStart)(index);
      })
      .onUpdate((event) => {
        translateX.value = startX.value + event.translationX;
        translateY.value = startY.value + event.translationY;
        runOnJS(onDragUpdate)(event.translationX, event.translationY);
      })
      .onEnd(() => {
        scale.value = withSpring(1, SPRING);
        zIndex.value = 1;
        runOnJS(onDragEnd)();
      })
      .onFinalize(() => {
        scale.value = withSpring(1, SPRING);
        zIndex.value = 1;
      });

    return pan;
  }, [
    index,
    onDragEnd,
    onDragStart,
    onDragUpdate,
    scale,
    startX,
    startY,
    translateX,
    translateY,
    zIndex,
  ]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <Pressable
          testID={`photo-selection__tile_${index}`}
          onPress={() => {
            if (draggingIndex !== null) return;
            onPress(index);
          }}
          style={styles.tilePressable}
          accessibilityRole="button"
          accessibilityLabel={`Photo ${index + 1}. Tap to edit, hold to reorder`}
          accessibilityHint="Long press then drag to reorder"
        >
          <ExpoImage
            source={{ uri: photo.annotatedUri || photo.uri }}
            cachePolicy="memory-disk"
            contentFit="cover"
            transition={120}
            style={{ width: tileSize, height: tileSize, borderRadius: 8 }}
          />
          {photo.isAnnotated ? (
            <View style={styles.editedBadge}>
              <Ionicons name="checkmark" size={12} color="white" />
            </View>
          ) : null}
          <View
            testID={`photo-selection__drag_handle_${index}`}
            style={styles.dragHandle}
            pointerEvents="none"
          >
            <Ionicons name="menu" size={14} color="white" />
          </View>
          <View style={styles.expandBadge} pointerEvents="none">
            <Ionicons name="expand" size={12} color="white" />
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * 3-column photo grid with springy drag-reorder (Add tile stays fixed at slot 0).
 * Built with Reanimated + Gesture Handler — not FlatList numColumns DnD.
 */
export default function SortablePhotoGrid({
  photos,
  layout,
  onReorder,
  onPressPhoto,
  onPressAdd,
}: SortablePhotoGridProps) {
  const { tileSize, gap, pad } = layout;
  const [positions, setPositions] = useState(() => photos.map((_, i) => i));
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragOriginIndex = useSharedValue(-1);

  useEffect(() => {
    if (draggingIndex !== null) return;
    setPositions(photos.map((_, i) => i));
  }, [photos, draggingIndex]);

  const gridWidth = GRID_COLS * tileSize + (GRID_COLS - 1) * gap;
  const slotCount = photos.length + 1;
  const rows = Math.max(1, Math.ceil(slotCount / GRID_COLS));
  const gridHeight = rows * tileSize + (rows - 1) * gap;

  const commitOrder = useCallback(
    (nextPositions: number[]) => {
      const ordered = nextPositions
        .map((photoIndex) => photos[photoIndex])
        .filter(Boolean);
      onReorder(ordered);
    },
    [onReorder, photos],
  );

  const handleDragStart = useCallback((index: number) => {
    dragOriginIndex.value = index;
    setDraggingIndex(index);
  }, [dragOriginIndex]);

  const handleDragUpdate = useCallback(
    (translationX: number, translationY: number) => {
      const from = dragOriginIndex.value;
      if (from < 0) return;

      const originSlot = from + 1;
      const origin = slotOrigin(originSlot, tileSize, gap);
      const centerX = origin.x + translationX + tileSize / 2;
      const centerY = origin.y + translationY + tileSize / 2;

      const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(centerX / (tileSize + gap))));
      const row = Math.max(0, Math.floor(centerY / (tileSize + gap)));
      let hoverSlot = row * GRID_COLS + col;
      // Slot 0 is Add — photos occupy 1..n
      hoverSlot = Math.max(1, Math.min(photos.length, hoverSlot));
      const to = hoverSlot - 1;

      setPositions((prev) => {
        const currentFrom = prev.indexOf(from);
        if (currentFrom < 0 || currentFrom === to) return prev;
        return moveItem(prev, currentFrom, to);
      });
    },
    [gap, photos.length, tileSize, dragOriginIndex],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
    dragOriginIndex.value = -1;
    setPositions((prev) => {
      commitOrder(prev);
      return prev;
    });
  }, [commitOrder, dragOriginIndex]);

  const addOrigin = slotOrigin(0, tileSize, gap);

  return (
    <View style={{ paddingHorizontal: pad, paddingTop: pad, paddingBottom: 24 }}>
      <View style={{ width: gridWidth, height: gridHeight, alignSelf: "center" }}>
        <Pressable
          testID="photo-selection__add_more"
          onPress={onPressAdd}
          style={[
            styles.addTile,
            {
              width: tileSize,
              height: tileSize,
              left: addOrigin.x,
              top: addOrigin.y,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add photo"
        >
          <View style={styles.addIconWrap}>
            <Ionicons name="add" size={24} color="#ffffff" />
          </View>
          <Text style={styles.addLabel}>Add Photo</Text>
        </Pressable>

        {photos.map((photo, index) => (
          <DraggingPhotoTile
            key={photo.annotatedUri || photo.uri}
            photo={photo}
            index={index}
            tileSize={tileSize}
            gap={gap}
            positions={positions}
            draggingIndex={draggingIndex}
            onDragStart={handleDragStart}
            onDragUpdate={handleDragUpdate}
            onDragEnd={handleDragEnd}
            onPress={onPressPhoto}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  addTile: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#60a5fa",
    backgroundColor: "#eff6ff",
    zIndex: 0,
  },
  addIconWrap: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  tilePressable: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  editedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#16a34a",
    borderRadius: 999,
    padding: 4,
  },
  dragHandle: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  expandBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 999,
    padding: 4,
  },
});
