import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type * as MediaLibrary from "expo-media-library";

import {
  getPhotokitThumbNativeView,
  isPhotokitThumbsAvailable,
  photokitIdAt,
  type PhotokitLibrarySession,
} from "./PhotokitThumbView";

type LibraryFullscreenViewerProps = {
  visible: boolean;
  initialIndex: number;
  assets: MediaLibrary.Asset[];
  indexSession?: PhotokitLibrarySession | null;
  selectedIds: Set<string>;
  onToggleSelect: (assetId: string) => void;
  onClose: () => void;
  onRequestAnnotate?: (assetId: string) => void;
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
  onToggleSelect,
  onClose,
  onRequestAnnotate,
  testIdPrefix = "library-viewer",
  accentColor = "#2563EB",
}: LibraryFullscreenViewerProps) {
  const { width, height } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
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
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 50);
    }
  }, [visible, initialIndex, items.length]);

  const currentItem = items[currentIndex];
  const isSelected = currentItem ? selectedIds.has(currentItem.assetId) : false;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / width);
      if (index >= 0 && index < items.length && index !== currentIndex) {
        setCurrentIndex(index);
      }
    },
    [currentIndex, items.length, width],
  );

  const handleToggleSelect = useCallback(() => {
    if (currentItem) {
      onToggleSelect(currentItem.assetId);
    }
  }, [currentItem, onToggleSelect]);

  const handleAnnotate = useCallback(() => {
    if (currentItem && onRequestAnnotate) {
      onRequestAnnotate(currentItem.assetId);
    }
  }, [currentItem, onRequestAnnotate]);

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
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.2)",
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
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isSelected ? accentColor : "rgba(255,255,255,0.2)",
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
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(item) => `viewer_${item.assetId}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ item }) => (
          <View
            style={{
              width,
              height: height - 200,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {useNativeThumbs && NativeThumb && indexMode && indexSession ? (
              <NativeThumb
                token={indexSession.token}
                index={item.index}
                pixelSize={Math.max(width, height)}
                contentFit="contain"
                style={{ width, height: height - 200 }}
              />
            ) : (
              <ExpoImage
                source={{ uri: item.uri }}
                cachePolicy="memory-disk"
                contentFit="contain"
                style={{ width, height: height - 200 }}
              />
            )}
          </View>
        )}
      />

      {/* Action Bar */}
      {onRequestAnnotate && (
        <View
          style={{
            position: "absolute",
            bottom: 40,
            left: 0,
            right: 0,
            paddingHorizontal: 24,
          }}
        >
          <Pressable
            testID={`${testIdPrefix}__annotate`}
            onPress={handleAnnotate}
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              paddingVertical: 14,
              paddingHorizontal: 20,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              Annotate
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
