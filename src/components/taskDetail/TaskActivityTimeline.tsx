import React, { useEffect, useMemo } from "react";
import { Dimensions, Image, Modal as RNModal, Pressable, ScrollView, Text, View } from "react-native";

import { resolveActiveStageEntry } from "@/components/taskDetail/taskDetailActiveStage";
import { cn } from "@/utils/cn";
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
const DEFAULT_LEAD_PHOTO_ASPECT_RATIO = 4 / 3;

function resolveLeadPhotoAspectRatio(
  activity: TaskDetailActivityThreadRow,
  photoAspectRatios: Record<string, number>,
): number {
  if (
    typeof activity.photoAspectRatio === "number" &&
    Number.isFinite(activity.photoAspectRatio) &&
    activity.photoAspectRatio > 0
  ) {
    return activity.photoAspectRatio;
  }

  const measuredAspectRatio = photoAspectRatios[activity.id];

  if (!measuredAspectRatio || !Number.isFinite(measuredAspectRatio) || measuredAspectRatio <= 0) {
    return DEFAULT_LEAD_PHOTO_ASPECT_RATIO;
  }

  return measuredAspectRatio;
}

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
      photoAspectRatio: activity.photoAspectRatio,
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
  const [leadPhotoAspectRatios, setLeadPhotoAspectRatios] = React.useState<Record<string, number>>({});
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

  useEffect(() => {
    if (process.env.JEST_WORKER_ID) {
      return;
    }

    let isCancelled = false;

    const applyAspectRatio = (activityId: string, width: number, height: number) => {
      if (isCancelled || width <= 0 || height <= 0) {
        return;
      }

      const aspectRatio = width / height;

      setLeadPhotoAspectRatios((current) => {
        if (current[activityId] === aspectRatio) {
          return current;
        }

        return {
          ...current,
          [activityId]: aspectRatio,
        };
      });
    };

    normalizedActivities.forEach((activity) => {
      const leadPhotoUri = activity.photoUrls[0];

      if (!leadPhotoUri) {
        return;
      }

      try {
        const maybePromise = Image.getSize(
          leadPhotoUri,
          (width, height) => {
            applyAspectRatio(activity.id, width, height);
          },
          () => {
            // Keep the default aspect ratio when image dimensions are unavailable.
          },
        ) as Promise<{ width: number; height: number } | [number, number]> | void;

        if (maybePromise && typeof (maybePromise as Promise<unknown>).then === "function") {
          void (maybePromise as Promise<{ width: number; height: number } | [number, number]>)
            .then((result) => {
              if (Array.isArray(result)) {
                applyAspectRatio(activity.id, result[0], result[1]);
                return;
              }

              if (result && typeof result === "object") {
                applyAspectRatio(activity.id, result.width, result.height);
              }
            })
            .catch(() => {
              // Keep the default aspect ratio when image dimensions are unavailable.
            });
        }
      } catch {
        // Keep the default aspect ratio when image dimensions are unavailable.
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [normalizedActivities]);

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
                <View className="mt-1 h-3 w-3 rounded-full border-2 border-blue-100 bg-blue-600" />
                {!isLastActivity ? <View className="mt-2 w-0.5 flex-1 bg-blue-100" /> : null}
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
                        <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-slate-900">
                          <Text className="text-sm font-semibold text-white">
                            {activity.actorLabel.trim().slice(0, 1).toUpperCase() || "?"}
                          </Text>
                        </View>
                        <Text className="min-w-0 flex-1 text-base font-semibold text-slate-900" numberOfLines={1}>
                          {activity.actorLabel}
                        </Text>
                      </View>
                    </View>
                    {activity.statusLabel ? (
                      <View className="rounded-full bg-slate-200 px-2.5 py-1">
                        <Text className="text-sm font-semibold text-slate-700">
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
                      className="min-w-0 flex-1 text-sm font-medium text-slate-400"
                    >
                      {activity.timestampLabel}
                    </Text>
                    <Text className="text-sm font-semibold text-slate-500">
                      {progressCompleteLabel}
                    </Text>
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

                    <Text
                      testID={`task-activity-timeline__description-${activity.id}`}
                      className="text-base font-semibold text-slate-900"
                    >
                      {activity.eventLabel}
                    </Text>

                    <View
                      testID={`task-activity-timeline__lead-photo-shell-${activity.id}`}
                      className="mt-3 overflow-hidden rounded-3xl bg-slate-200"
                      style={{
                        aspectRatio: resolveLeadPhotoAspectRatio(
                          activity,
                          leadPhotoAspectRatios,
                        ),
                      }}
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
                        showsHorizontalScrollIndicator={false}
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
                            style={{ width: containerWidths[activity.id] || "100%" }}
                            onPress={() => openGallery(activity.photoUrls, photoIndex)}
                          >
                            <Image
                              testID={
                                photoIndex === currentPhotoIndex
                                  ? `task-activity-timeline__lead-photo-${activity.id}`
                                  : undefined
                              }
                              accessibilityLabel={`Lead photo for ${activity.eventLabel}`}
                              source={{ uri: photoUri }}
                              resizeMode="contain"
                              className="h-full w-full bg-slate-200"
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

                    <Text
                      testID={`task-activity-timeline__description-${activity.id}`}
                      className="text-base font-semibold text-slate-900"
                    >
                      {activity.eventLabel}
                    </Text>
                    {activity.detailLabel ? (
                      <Text className="mt-2 text-sm leading-6 text-slate-600">
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
                    style={{ width: Dimensions.get("window").width, height: "100%" }}
                  >
                    <Image
                      testID={
                        index === selectedGallery.index
                          ? "task-activity-timeline__photo_viewer_image"
                          : undefined
                      }
                      source={{ uri: photoUri }}
                      resizeMode="contain"
                      className="h-full w-full"
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
