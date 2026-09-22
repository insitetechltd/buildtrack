import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";

import { extractBuildtrackStoragePath } from "@/api/fileUploadService";
import {
  IPAD_EVIDENCE_CORNER_RADIUS,
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

  return (
    <View
      testID={`task-activity-timeline__lead-photo-shell-${activityId}`}
      className="mt-3"
      style={{ height: layout.tileHeight }}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        if (width && width !== contentWidth) {
          onContentWidth(width);
        }
      }}
    >
      <ScrollView
        testID={`task-activity-timeline__photo_swipe_surface-${activityId}`}
        horizontal
        scrollEnabled={layout.canSlide}
        directionalLockEnabled
        nestedScrollEnabled
        bounces={layout.canSlide}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          height: layout.tileHeight,
          alignItems: "center",
        }}
      >
        <View
          testID={`task-activity-timeline__evidence_strip-${activityId}`}
          className="flex-row"
          style={{ height: layout.tileHeight }}
        >
          {photoUrls.map((photoUri, photoIndex) => {
            const isLead = photoIndex === 0;
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
                onPress={() => onOpenGallery(photoUrls, photoIndex)}
                style={{
                  width: layout.tileWidth || undefined,
                  height: layout.tileHeight,
                  borderRadius: IPAD_EVIDENCE_CORNER_RADIUS,
                  overflow: "hidden",
                  backgroundColor: "#e2e8f0",
                  marginRight:
                    photoIndex < photoUrls.length - 1 ? layout.gap : 0,
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
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
