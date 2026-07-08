import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import {
  usePhotoViewerViewAdapter,
  type PhotoViewerViewAdapterProps,
} from "@/ui/viewAdapters/usePhotoViewerViewAdapter";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type PhotoViewerScreenProps = PhotoViewerViewAdapterProps;

export default function PhotoViewerScreen({
  photos,
  initialIndex = 0,
  ...props
}: PhotoViewerScreenProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { output, actions } = usePhotoViewerViewAdapter({
    photos,
    initialIndex,
    ...props,
  });

  const topPadding = insets.top > 0 ? insets.top + 8 : 16;

  useEffect(() => {
    if (photos.length > 0 && initialIndex >= 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: initialIndex * SCREEN_WIDTH,
          animated: false,
        });
      }, 100);
    }
  }, [photos, initialIndex]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / SCREEN_WIDTH);

    if (newIndex >= 0 && newIndex < photos.length) {
      actions.handlePhotoIndexChange(newIndex);
    }
  };

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      <View
        className="flex-row items-center justify-between px-6 pb-4 bg-white border-b border-gray-200"
        style={{ paddingTop: topPadding }}
      >
        <Pressable onPress={actions.handleNavigateBack} className="flex-row items-center">
          <Ionicons name="arrow-back" size={24} color="#374151" />
          <Text className="text-gray-700 text-base font-medium ml-2">Back</Text>
        </Pressable>

        <View className="flex-row items-center gap-2">
          {output.photoCountLabel ? (
            <View className="bg-gray-100 px-3 py-1.5 rounded-full">
              <Text className="text-gray-700 text-sm font-medium">{output.photoCountLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="flex-1">
        <View style={{ height: SCREEN_HEIGHT * 0.55, width: SCREEN_WIDTH }}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.55 }}
            contentContainerStyle={{
              width: SCREEN_WIDTH * photos.length,
              height: SCREEN_HEIGHT * 0.55,
            }}
            bounces={false}
            scrollEnabled
            nestedScrollEnabled={false}
            decelerationRate="fast"
            removeClippedSubviews={false}
            alwaysBounceHorizontal={false}
            alwaysBounceVertical={false}
            directionalLockEnabled={false}
          >
            {photos.map((photoUri, index) => (
              <View
                key={index}
                style={{
                  width: SCREEN_WIDTH,
                  height: SCREEN_HEIGHT * 0.55,
                  paddingHorizontal: 20,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#ffffff",
                  borderRadius: 16,
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3.84,
                  elevation: 3,
                }}
              >
                <Image
                  source={{ uri: photoUri }}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
        </View>

        {output.activityMetadata && output.activityVisuals ? (
          <View
            className="w-full bg-white px-4 py-4 border-t border-gray-200"
            style={{ height: SCREEN_HEIGHT * 0.35 }}
          >
            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              <View
                className="border-l-4 pl-3"
                style={{ borderLeftColor: output.activityVisuals.accentColor }}
              >
                <Text className="text-base font-medium text-gray-900 capitalize mb-1">
                  {output.activityMetadata.title}
                </Text>

                <View className="flex-row items-center mb-2">
                  <Ionicons
                    name={output.activityVisuals.iconName as any}
                    size={14}
                    color={output.activityVisuals.accentColor}
                    style={{ marginRight: 6 }}
                  />
                  <Text className="text-sm text-gray-600">
                    {output.activityMetadata.actorLabel}
                    {output.activityMetadata.timestampLabel
                      ? ` • ${output.activityMetadata.timestampLabel}`
                      : ""}
                  </Text>
                </View>

                {output.activityMetadata.description ? (
                  <Text className="text-sm text-gray-700 mb-2">
                    {output.activityMetadata.description}
                  </Text>
                ) : null}

                {output.activityMetadata.reasonLabel ? (
                  <Text className="text-sm text-gray-700 mb-2">
                    {output.activityMetadata.reasonLabel}
                  </Text>
                ) : null}

                {output.activityMetadata.progressLabel || output.activityMetadata.statusLabel ? (
                  <View className="flex-row items-center gap-3 mt-1">
                    {output.activityMetadata.progressLabel ? (
                      <Text className="text-sm text-gray-600">
                        {output.activityMetadata.progressLabel}
                      </Text>
                    ) : null}
                    {output.activityMetadata.statusLabel ? (
                      <View
                        className="px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: output.activityVisuals.statusBadgeBackgroundColor,
                        }}
                      >
                        <Text className="text-xs text-gray-700 capitalize">
                          {output.activityMetadata.statusLabel}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </ScrollView>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
