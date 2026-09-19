import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";

import { extractBuildtrackStoragePath } from "@/api/fileUploadService";
import {
  IPAD_EVIDENCE_CORNER_RADIUS,
  IPAD_EVIDENCE_TILE_GAP,
  resolveIpadEvidenceLayout,
} from "@/components/taskDetail/ipadTimelineEvidenceLayout";

function buildCachedImageSource(photoUri: string) {
  return {
    uri: photoUri,
    cacheKey: extractBuildtrackStoragePath(photoUri) ?? photoUri,
  };
}

type IpadTimelineEvidenceStripProps = {
  activityId: string;
  eventLabel: string;
  photoUrls: string[];
  contentWidth: number;
  windowWidth: number;
  windowHeight: number;
  onOpenGallery: (photos: string[], index: number) => void;
  onContentWidth: (width: number) => void;
};

export default function IpadTimelineEvidenceStrip({
  activityId,
  eventLabel,
  photoUrls,
  contentWidth,
  windowWidth,
  windowHeight,
  onOpenGallery,
  onContentWidth,
}: IpadTimelineEvidenceStripProps) {
  const layout = resolveIpadEvidenceLayout({
    photoCount: photoUrls.length,
    contentWidth,
    windowWidth,
    windowHeight,
  });

  const renderTile = (photoUri: string, photoIndex: number) => {
    const isLead = photoIndex === 0;
    const showOverflow =
      layout.showOverflowBadge && photoIndex === layout.visibleSlots - 1;
    const overflowLabel = `+${layout.overflowCount}`;

    return (
      <Pressable
        key={`${activityId}:evidence:${photoIndex}`}
        testID={
          isLead
            ? `task-activity-timeline__lead-photo-pressable-${activityId}`
            : `task-activity-timeline__evidence_tile-${activityId}-${photoIndex}`
        }
        accessibilityRole="button"
        accessibilityLabel={`Evidence photo ${photoIndex + 1} of ${photoUrls.length}, tap to expand`}
        onPress={() =>
          onOpenGallery(
            photoUrls,
            showOverflow ? layout.visibleSlots : photoIndex,
          )
        }
        style={{
          width: layout.tileWidth || undefined,
          height: layout.tileHeight,
          borderRadius: IPAD_EVIDENCE_CORNER_RADIUS,
          overflow: "hidden",
          backgroundColor: "#e2e8f0",
          position: "relative",
          marginRight:
            layout.mode === "filmstrip" && photoIndex < photoUrls.length - 1
              ? IPAD_EVIDENCE_TILE_GAP
              : 0,
        }}
      >
        {isLead ? (
          <View
            testID={`task-activity-timeline__evidence_tile-${activityId}-${photoIndex}`}
            pointerEvents="none"
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}
        <ExpoImage
          testID={
            isLead
              ? `task-activity-timeline__lead-photo-${activityId}`
              : `task-activity-timeline__evidence_image-${activityId}-${photoIndex}`
          }
          accessibilityLabel={`Lead photo for ${eventLabel}`}
          source={buildCachedImageSource(photoUri)}
          contentFit="cover"
          cachePolicy="memory-disk"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: "#e2e8f0" }]}
        />
        {isLead && layout.mode === "single" ? (
          <View
            testID={`task-activity-timeline__evidence_expand_hint-${activityId}`}
            pointerEvents="none"
            className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2.5 py-1"
          >
            <Text className="text-xs font-semibold text-white">Tap to expand</Text>
          </View>
        ) : null}
        {showOverflow ? (
          <View
            testID={`task-activity-timeline__evidence_overflow-${activityId}`}
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center bg-black/50"
          >
            <Text className="text-2xl font-semibold text-white">{overflowLabel}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View
      testID={`task-activity-timeline__lead-photo-shell-${activityId}`}
      className="mt-3 overflow-hidden"
      style={{ height: layout.mediaHeight }}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        if (width && width !== contentWidth) {
          onContentWidth(width);
        }
      }}
    >
      <View
        testID={`task-activity-timeline__evidence_strip-${activityId}`}
        style={{ height: layout.mediaHeight }}
      >
        {layout.mode === "filmstrip" ? (
          <ScrollView
            testID={`task-activity-timeline__photo_swipe_surface-${activityId}`}
            horizontal
            directionalLockEnabled
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              height: layout.mediaHeight,
              alignItems: "center",
            }}
          >
            {photoUrls.map(renderTile)}
          </ScrollView>
        ) : (
          <View
            testID={`task-activity-timeline__photo_swipe_surface-${activityId}`}
            className="h-full w-full flex-row"
            style={{ gap: layout.mode === "two-up" ? IPAD_EVIDENCE_TILE_GAP : 0 }}
          >
            {photoUrls.map(renderTile)}
          </View>
        )}
      </View>
    </View>
  );
}
