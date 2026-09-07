import React, { useMemo } from "react";
import {
  Dimensions,
  Modal as RNModal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";

import { resolveActiveStageEntry } from "@/components/taskDetail/taskDetailActiveStage";
import { cn } from "@/utils/cn";
import { extractBuildtrackStoragePath } from "@/api/fileUploadService";
import {
  ACTIVITY_FAMILY,
} from "@/ui/contracts/activityFamily";
import { UserAvatar } from "@/components/UserAvatar";
import type {
  TaskDetailActivityModel,
  TaskDetailActivityThreadRow,
} from "@/ui/contracts/viewAdapters";

function buildCachedImageSource(photoUri: string) {
  return {
    uri: photoUri,
    cacheKey: extractBuildtrackStoragePath(photoUri) ?? photoUri,
  };
}

interface TaskActivityTimelineProps {
  activities?: TaskDetailActivityModel[];
  thread?: TaskDetailActivityThreadRow[];
  activeEntryId?: string;
  onEntryLayout?: (entryId: string, top: number, height: number) => void;
  onVisibleEntryChange?: (entryId: string) => void;
  testID?: string;
}

const Modal = RNModal || View;

function normalizeActivityRow(
  activity: TaskDetailActivityModel | TaskDetailActivityThreadRow,
): TaskDetailActivityThreadRow {
  if ("eventLabel" in activity) {
    return {
      ...activity,
      actorLabel: activity.actorLabel || "Unknown actor",
      actorUserId: activity.actorUserId,
      eventLabel: activity.eventLabel || "Activity update",
      timestampLabel: activity.timestampLabel || "Unknown time",
      progressLabel: activity.progressLabel || "—",
      photoUrls: Array.isArray(activity.photoUrls) ? activity.photoUrls : [],
      photoAspectRatio: activity.photoAspectRatio,
    };
  }

  const parsedDate = new Date(activity.timestamp);

  return {
    id: activity.id,
    density: activity.density,
    structuralState: activity.structuralState,
    actorLabel: activity.userName || "Unknown actor",
    actorUserId: activity.userId,
    eventLabel: activity.description || "Activity update",
    timestampLabel: Number.isNaN(parsedDate.getTime())
      ? activity.timestamp
      : parsedDate.toLocaleString(),
    progressLabel:
      activity.completionPercentage !== undefined ? `${activity.completionPercentage}%` : "—",
    detailLabel: activity.reason,
    photoUrls: Array.isArray(activity.photos) ? activity.photos : [],
    photoAspectRatio: undefined,
    statusLabel: activity.statusLabel,
  };
}

export default function TaskActivityTimeline({
  activities = [],
  thread = [],
  activeEntryId,
  onEntryLayout,
  onVisibleEntryChange,
  testID,
}: TaskActivityTimelineProps) {
  const [selectedGallery, setSelectedGallery] = React.useState<{
    photos: string[];
    index: number;
  }>();
  const [galleryIndices, setGalleryIndices] = React.useState<Record<string, number>>({});
  const [containerWidths, setContainerWidths] = React.useState<Record<string, number>>({});
  const normalizedActivities = useMemo(
    () => {
      if (thread.length > 0) {
        return thread.map((activity) => normalizeActivityRow(activity));
      }

      return [...activities]
        .sort(
          (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
        )
        .map((activity) => normalizeActivityRow(activity));
    },
    [activities, thread],
  );
  const resolvedTopEntryId = useMemo(
    () =>
      resolveActiveStageEntry({
        entries: normalizedActivities.map((activity, index) => ({
          id: activity.id,
          top: index,
        })),
        topEdge: 0,
      })?.id,
    [normalizedActivities],
  );

  React.useEffect(() => {
    if (resolvedTopEntryId) {
      onVisibleEntryChange?.(resolvedTopEntryId);
    }
  }, [onVisibleEntryChange, resolvedTopEntryId]);

  const openGallery = React.useCallback((photos: string[], index: number) => {
    setSelectedGallery({
      photos,
      index,
    });
  }, []);

  const closeGallery = React.useCallback(() => {
    setSelectedGallery(undefined);
  }, []);

  const showPreviousPhoto = React.useCallback(() => {
    setSelectedGallery((current) =>
      current
        ? {
            ...current,
            index: Math.max(current.index - 1, 0),
          }
        : current,
    );
  }, []);

  const showNextPhoto = React.useCallback(() => {
    setSelectedGallery((current) =>
      current
        ? {
            ...current,
            index: Math.min(current.index + 1, current.photos.length - 1),
          }
        : current,
    );
  }, []);

  return (
    <View testID={testID} className="mx-4 mt-4 mb-4 rounded-2xl border border-gray-200 bg-white p-4">
      <View className="gap-4">
        {normalizedActivities.map((activity, index) => {
          const isLastActivity = index === normalizedActivities.length - 1;
          const isActiveEntry = (activeEntryId ?? resolvedTopEntryId) === activity.id;
          const hasPhotos = activity.photoUrls.length > 0;
          const currentPhotoIndex = Math.min(
            galleryIndices[activity.id] ?? 0,
            Math.max(activity.photoUrls.length - 1, 0),
          );
          const currentPhotoUri =
            activity.photoUrls[currentPhotoIndex] ?? activity.photoUrls[0];
          const progressCompleteLabel =
            activity.progressLabel === "—" ? activity.progressLabel : `${activity.progressLabel} complete`;

          return (
            <View
              key={activity.id}
              testID={`task-activity-timeline__entry-${activity.id}`}
              onLayout={(event) => {
                const { y, height } = event.nativeEvent.layout;
                onEntryLayout?.(activity.id, y, height);
              }}
              accessibilityState={{ selected: isActiveEntry }}
              className="flex-row"
            >
              <View className="mr-3 items-start">
                <View
                  className="mt-1 h-3 w-3 rounded-full border-2"
                  style={{
                    backgroundColor: ACTIVITY_FAMILY.railDot,
                    borderColor: ACTIVITY_FAMILY.railTrack,
                  }}
                />
                {!isLastActivity ? (
                  <View
                    className="mt-2 w-0.5 flex-1"
                    style={{ backgroundColor: ACTIVITY_FAMILY.railTrack }}
                  />
                ) : null}
              </View>

              <View className="min-w-0 flex-1 pb-1">
                <View
                  testID={`task-activity-timeline__outer-header-${activity.id}`}
                  className="mb-3 gap-2"
                >
                  <View
                    testID={`task-activity-timeline__metadata_line_1-${activity.id}`}
                    className="flex-row items-center justify-between gap-3"
                  >
                    <View className="min-w-0 flex-1">
                      <View
                        testID={`task-activity-timeline__actor-row-${activity.id}`}
                        className="min-w-0 flex-row items-center"
                      >
                        <UserAvatar
                          userId={activity.actorUserId}
                          name={activity.actorLabel}
                          size={32}
                          className="mr-3"
                        />
                        <Text
                          className={cn("min-w-0 flex-1", ACTIVITY_FAMILY.actorNameClassName)}
                          numberOfLines={1}
                        >
                          {activity.actorLabel}
                        </Text>
                      </View>
                    </View>
                    {activity.statusLabel ? (
                      <View className={ACTIVITY_FAMILY.badgePillClassName}>
                        <Text className={ACTIVITY_FAMILY.badgeTextClassName}>
                          {activity.statusLabel}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View
                    testID={`task-activity-timeline__metadata_line_2-${activity.id}`}
                    className="flex-row items-center justify-between gap-3"
                  >
                    <Text
                      testID={`task-activity-timeline__timestamp-${activity.id}`}
                      className={cn("min-w-0 flex-1", ACTIVITY_FAMILY.metaClassName)}
                    >
                      {activity.timestampLabel}
                    </Text>
                    {progressCompleteLabel !== "—" ? (
                      <Text className={cn("font-semibold", ACTIVITY_FAMILY.metaClassName)}>
                        {progressCompleteLabel}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {hasPhotos ? (
                  <View
                    testID={`task-activity-timeline__photo_stack-${activity.id}`}
                    className="pt-1"
                  >
                    {activity.subtaskBadgeLabel || activity.subtaskTitleLabel ? (
                      <View className="mb-3 flex-row flex-wrap items-center gap-2">
                        {activity.subtaskBadgeLabel ? (
                          <View className="rounded-full bg-[#E7F4F8] px-2 py-1">
                            <Text className="text-sm font-semibold uppercase tracking-[0.12em] text-[#0A728F]">
                              {activity.subtaskBadgeLabel}
                            </Text>
                          </View>
                        ) : null}
                        {activity.subtaskTitleLabel ? (
                          <Text className="text-base font-medium text-slate-700">
                            {activity.subtaskTitleLabel}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}

                    <Text
                      testID={`task-activity-timeline__description-${activity.id}`}
                      className={ACTIVITY_FAMILY.titleClassName}
                    >
                      {activity.eventLabel}
                    </Text>

                    <View
                      testID={`task-activity-timeline__lead-photo-shell-${activity.id}`}
                      className="mt-3 overflow-hidden rounded-2xl bg-slate-200"
                      style={{ aspectRatio: 1 }}
                      onLayout={(event) => {
                        const width = event.nativeEvent.layout.width;
                        if (width && width !== containerWidths[activity.id]) {
                          setContainerWidths((current) => ({
                            ...current,
                            [activity.id]: width,
                          }));
                        }
                      }}
                    >
                      <ScrollView
                        testID={`task-activity-timeline__photo_swipe_surface-${activity.id}`}
                        horizontal
                        pagingEnabled
                        directionalLockEnabled
                        nestedScrollEnabled
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ height: '100%' }}
                        onMomentumScrollEnd={(event) => {
                          const nextIndex = Math.round(
                            event.nativeEvent.contentOffset.x /
                              Math.max(event.nativeEvent.layoutMeasurement.width, 1),
                          );
                          setGalleryIndices((current) => ({
                            ...current,
                            [activity.id]: Math.min(
                              Math.max(nextIndex, 0),
                              activity.photoUrls.length - 1,
                            ),
                          }));
                        }}
                        className="h-full w-full"
                      >
                        {activity.photoUrls.map((photoUri, photoIndex) => (
                          <Pressable
                            key={`${activity.id}:photo:${photoIndex}`}
                            testID={
                              photoIndex === currentPhotoIndex
                                ? `task-activity-timeline__lead-photo-pressable-${activity.id}`
                                : undefined
                            }
                            accessibilityRole="button"
                            className="h-full"
                            style={{
                              width: containerWidths[activity.id] || Dimensions.get('window').width - 48,
                              position: "relative",
                            }}
                            onPress={() => openGallery(activity.photoUrls, photoIndex)}
                          >
                            <ExpoImage
                              testID={
                                photoIndex === currentPhotoIndex
                                  ? `task-activity-timeline__lead-photo-${activity.id}`
                                  : undefined
                              }
                              accessibilityLabel={`Lead photo for ${activity.eventLabel}`}
                              source={buildCachedImageSource(photoUri)}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                              style={[StyleSheet.absoluteFillObject, { backgroundColor: "#e2e8f0" }]}
                            />
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>

                    {activity.photoUrls.length > 1 ? (
                      <View
                        testID={`task-activity-timeline__gallery_pager-${activity.id}`}
                        className="mt-3 flex-row items-center justify-center gap-1.5"
                      >
                        {activity.photoUrls.map((_, photoIndex) => (
                          <View
                            key={`${activity.id}:dot:${photoIndex}`}
                            className={cn(
                              "h-2 rounded-full",
                              photoIndex === currentPhotoIndex ? "w-5 bg-[#08576E]" : "w-2 bg-slate-300",
                            )}
                          />
                        ))}
                      </View>
                    ) : null}

                    {activity.detailLabel ? (
                      <Text className="mt-3 text-sm leading-6 text-slate-600">
                        {activity.detailLabel}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <View className="pt-1">
                    {activity.subtaskBadgeLabel || activity.subtaskTitleLabel ? (
                      <View className="mb-3 flex-row flex-wrap items-center gap-2">
                        {activity.subtaskBadgeLabel ? (
                          <View className="rounded-full bg-[#E7F4F8] px-2 py-1">
                            <Text className="text-sm font-semibold uppercase tracking-[0.12em] text-[#0A728F]">
                              {activity.subtaskBadgeLabel}
                            </Text>
                          </View>
                        ) : null}
                        {activity.subtaskTitleLabel ? (
                          <Text className="text-base font-medium text-slate-700">
                            {activity.subtaskTitleLabel}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}

                    <Text
                      testID={`task-activity-timeline__description-${activity.id}`}
                      className={ACTIVITY_FAMILY.titleClassName}
                    >
                      {activity.eventLabel}
                    </Text>
                    {activity.detailLabel ? (
                      <Text className="mt-2 text-sm leading-6 text-[#577783]">
                        {activity.detailLabel}
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <Modal
        visible={Boolean(selectedGallery)}
        transparent
        animationType="fade"
        onRequestClose={closeGallery}
      >
        <View
          testID="task-activity-timeline__photo_viewer"
          className="flex-1 items-center justify-center bg-black/90"
        >
          <Pressable
            testID="task-activity-timeline__photo_viewer_close"
            accessibilityRole="button"
            className="absolute top-12 right-6 z-10 rounded-full bg-white/10 px-3 py-2"
            onPress={closeGallery}
          >
            <Text className="text-sm font-semibold text-white">Close</Text>
          </Pressable>

          {selectedGallery ? (
            <>
              {selectedGallery.index > 0 ? (
                <Pressable
                  testID="task-activity-timeline__photo_viewer_previous"
                  accessibilityRole="button"
                  className="absolute left-4 z-10 rounded-full bg-white/15 px-4 py-3"
                  onPress={showPreviousPhoto}
                >
                  <Text className="text-sm font-semibold text-white">Previous</Text>
                </Pressable>
              ) : null}

              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ height: '100%' }}
                contentOffset={{ x: Dimensions.get("window").width * selectedGallery.index, y: 0 }}
                onMomentumScrollEnd={(event) => {
                  const nextIndex = Math.round(
                    event.nativeEvent.contentOffset.x /
                      Math.max(event.nativeEvent.layoutMeasurement.width, 1),
                  );
                  setSelectedGallery((current) =>
                    current ? { ...current, index: nextIndex } : current,
                  );
                }}
                className="h-full w-full"
              >
                {selectedGallery.photos.map((photoUri, index) => (
                  <View
                    key={`modal-photo-${index}`}
                    style={{
                      width: Dimensions.get("window").width,
                      height: "100%",
                      position: "relative",
                    }}
                  >
                    <ExpoImage
                      testID={
                        index === selectedGallery.index
                          ? "task-activity-timeline__photo_viewer_image"
                          : undefined
                      }
                      source={buildCachedImageSource(photoUri)}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                      style={StyleSheet.absoluteFillObject}
                    />
                  </View>
                ))}
              </ScrollView>

              {selectedGallery.photos.length > 1 ? (
                <View className="absolute bottom-10 z-10 rounded-full bg-black/45 px-3 py-1.5">
                  <Text className="text-sm font-semibold text-white">
                    {selectedGallery.index + 1} / {selectedGallery.photos.length}
                  </Text>
                </View>
              ) : null}

              {selectedGallery.index < selectedGallery.photos.length - 1 ? (
                <Pressable
                  testID="task-activity-timeline__photo_viewer_next"
                  accessibilityRole="button"
                  className="absolute right-4 z-10 rounded-full bg-white/15 px-4 py-3"
                  onPress={showNextPhoto}
                >
                  <Text className="text-sm font-semibold text-white">Next</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
