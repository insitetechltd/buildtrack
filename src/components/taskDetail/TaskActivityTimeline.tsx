import React, { useEffect, useMemo } from "react";
import { Image, Modal as RNModal, Pressable, Text, View } from "react-native";

import { resolveActiveStageEntry } from "@/components/taskDetail/taskDetailActiveStage";
import type {
  TaskDetailActivityModel,
  TaskDetailActivityThreadRow,
} from "@/ui/contracts/viewAdapters";

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
      eventLabel: activity.eventLabel || "Activity update",
      timestampLabel: activity.timestampLabel || "Unknown time",
      progressLabel: activity.progressLabel || "—",
      photoUrls: Array.isArray(activity.photoUrls) ? activity.photoUrls : [],
    };
  }

  const parsedDate = new Date(activity.timestamp);

  return {
    id: activity.id,
    density: activity.density,
    structuralState: activity.structuralState,
    actorLabel: activity.userName || "Unknown actor",
    eventLabel: activity.description || "Activity update",
    timestampLabel: Number.isNaN(parsedDate.getTime())
      ? activity.timestamp
      : parsedDate.toLocaleString(),
    progressLabel:
      activity.completionPercentage !== undefined ? `${activity.completionPercentage}%` : "—",
    detailLabel: activity.reason,
    photoUrls: Array.isArray(activity.photos) ? activity.photos : [],
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

  useEffect(() => {
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
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-gray-900">Work thread</Text>
        <View className="rounded-full bg-gray-100 px-3 py-1.5">
          <Text className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Newest first
          </Text>
        </View>
      </View>

      <View className="gap-4">
        {normalizedActivities.map((activity, index) => {
          const isLastActivity = index === normalizedActivities.length - 1;
          const isActiveEntry = (activeEntryId ?? resolvedTopEntryId) === activity.id;

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
                <View className="mt-1 h-3 w-3 rounded-full border-2 border-blue-100 bg-blue-600" />
                {!isLastActivity ? <View className="mt-2 w-0.5 flex-1 bg-blue-100" /> : null}
              </View>

              <View className="flex-1">
                <View
                  testID={`task-activity-timeline__rail-metadata-${activity.id}`}
                  className="mb-2 flex-row flex-wrap items-center gap-x-3 gap-y-1"
                >
                  <Text className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {activity.timestampLabel}
                  </Text>
                  <Text className="text-base font-medium text-slate-700">
                    {activity.actorLabel}
                  </Text>
                  <Text className="text-base font-semibold text-slate-900">
                    {activity.progressLabel}
                  </Text>
                  {activity.statusLabel ? (
                    <Text className="rounded-full bg-slate-200 px-2.5 py-1 text-sm font-semibold text-slate-700">
                      {activity.statusLabel}
                    </Text>
                  ) : null}
                </View>

                <View className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  {activity.subtaskBadgeLabel || activity.subtaskTitleLabel ? (
                    <View className="mb-3 flex-row flex-wrap items-center gap-2">
                      {activity.subtaskBadgeLabel ? (
                        <View className="rounded-full bg-blue-50 px-2 py-1">
                          <Text className="text-sm font-semibold uppercase tracking-[0.12em] text-blue-700">
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

                  <Text className="mb-3 text-lg font-semibold text-slate-900">
                    {activity.eventLabel}
                  </Text>

                  {activity.photoUrls.length > 0 ? (
                    <View
                      testID={`task-activity-timeline__lead-photo-shell-${activity.id}`}
                      className={activity.detailLabel ? "-mx-4 mb-3" : "-mx-4"}
                    >
                      <Pressable
                        testID={`task-activity-timeline__lead-photo-pressable-${activity.id}`}
                        accessibilityRole="button"
                        onPress={() => openGallery(activity.photoUrls, 0)}
                      >
                        <Image
                          testID={`task-activity-timeline__lead-photo-${activity.id}`}
                          accessibilityLabel={`Lead photo for ${activity.eventLabel}`}
                          source={{ uri: activity.photoUrls[0] }}
                          resizeMode="contain"
                          className="h-44 w-full bg-slate-200"
                        />
                      </Pressable>

                      {activity.photoUrls.length > 1 ? (
                        <View
                          testID={`task-activity-timeline__thumbnail-strip-${activity.id}`}
                          className="mt-2 flex-row flex-wrap gap-2"
                        >
                          {activity.photoUrls.slice(1).map((photoUri, photoIndex) => (
                            <Pressable
                              key={`${activity.id}-thumb-${photoIndex + 1}`}
                              testID={`task-activity-timeline__thumb-photo-pressable-${activity.id}-${photoIndex + 1}`}
                              accessibilityRole="button"
                              onPress={() => openGallery(activity.photoUrls, photoIndex + 1)}
                            >
                              <Image
                                testID={`task-activity-timeline__thumb-photo-${activity.id}-${photoIndex + 1}`}
                                accessibilityLabel={`Thumbnail photo ${photoIndex + 2} for ${activity.eventLabel}`}
                                source={{ uri: photoUri }}
                                resizeMode="cover"
                                className="h-14 w-14 rounded-2xl bg-slate-200"
                              />
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {activity.detailLabel ? (
                    <Text
                      testID="task-activity-timeline__detail-label"
                      className="text-base leading-6 text-slate-600"
                    >
                      {activity.detailLabel}
                    </Text>
                  ) : null}
                </View>
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
          className="flex-1 items-center justify-center bg-black/90 px-4"
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

              <Image
                testID="task-activity-timeline__photo_viewer_image"
                source={{ uri: selectedGallery.photos[selectedGallery.index] }}
                resizeMode="contain"
                className="h-full w-full"
              />

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
