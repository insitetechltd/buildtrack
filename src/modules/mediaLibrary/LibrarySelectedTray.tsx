import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type * as MediaLibrary from "expo-media-library";

type LibrarySelectedTrayProps = {
  selectedAssets: Array<{ assetId: string; uri: string; order: number }>;
  onRemove: (assetId: string) => void;
  onDeselectAll: () => void;
  testIdPrefix?: string;
  accentColor?: string;
};

const THUMB_SIZE = 56;

export function LibrarySelectedTray({
  selectedAssets,
  onRemove,
  onDeselectAll,
  testIdPrefix = "library-tray",
  accentColor = "#2563EB",
}: LibrarySelectedTrayProps) {
  if (selectedAssets.length === 0) {
    return null;
  }

  return (
    <View
      testID={`${testIdPrefix}__container`}
      style={{
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        paddingVertical: 8,
        paddingHorizontal: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>
          {selectedAssets.length} selected
        </Text>
        <Pressable
          testID={`${testIdPrefix}__deselect_all`}
          onPress={onDeselectAll}
          style={{
            paddingVertical: 4,
            paddingHorizontal: 12,
            borderRadius: 6,
            backgroundColor: "#f3f4f6",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>
            Deselect All
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {selectedAssets.map((item) => (
          <View
            key={item.assetId}
            testID={`${testIdPrefix}__thumb_${item.assetId}`}
            style={{ position: "relative" }}
          >
            <ExpoImage
              source={{ uri: item.uri }}
              cachePolicy="memory-disk"
              contentFit="cover"
              style={{
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: 8,
                backgroundColor: "#e5e7eb",
              }}
            />
            <View
              style={{
                position: "absolute",
                top: 4,
                left: 4,
                minWidth: 20,
                height: 20,
                paddingHorizontal: 4,
                borderRadius: 10,
                backgroundColor: accentColor,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                {item.order}
              </Text>
            </View>
            <Pressable
              testID={`${testIdPrefix}__remove_${item.assetId}`}
              onPress={() => onRemove(item.assetId)}
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "#ef4444",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
