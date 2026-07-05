import React, { useEffect, useMemo } from "react";
import { Image, Text, View } from "react-native";

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

  return (
    <View testID={testID} className="mx-4 mt-4 mb-4 rounded-2xl border border-gray-200 bg-white p-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-gray-900">Work thread</Text>
        <View className="rounded-full bg-gray-100 px-3 py-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                  <Text
                    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                  >
                    {activity.timestampLabel}
                  </Text>
                  <Text
                    className="text-sm font-medium text-slate-700"
                  >
                    {activity.actorLabel}
                  </Text>
                  <Text className="text-sm font-semibold text-slate-900">
                    {activity.progressLabel}
                  </Text>
                </View>

                <View className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  {activity.photoUrls.length > 0 ? (
                    <View className={activity.detailLabel ? "mb-3" : undefined}>
                      <Image
                        testID={`task-activity-timeline__lead-photo-${activity.id}`}
                        accessibilityLabel={`Lead photo for ${activity.eventLabel}`}
                        source={{ uri: activity.photoUrls[0] }}
                        className="h-44 w-full rounded-3xl bg-slate-200"
                      />

                      {activity.photoUrls.length > 1 ? (
                        <View
                          testID={`task-activity-timeline__thumbnail-strip-${activity.id}`}
                          className="mt-2 flex-row flex-wrap gap-2"
                        >
                          {activity.photoUrls.slice(1).map((photoUri, photoIndex) => (
                            <Image
                              key={`${activity.id}-thumb-${photoIndex + 1}`}
                              testID={`task-activity-timeline__thumb-photo-${activity.id}-${photoIndex + 1}`}
                              accessibilityLabel={`Thumbnail photo ${photoIndex + 2} for ${activity.eventLabel}`}
                              source={{ uri: photoUri }}
                              className="h-14 w-14 rounded-2xl bg-slate-200"
                            />
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {activity.detailLabel ? (
                    <Text
                      testID="task-activity-timeline__detail-label"
                      className="text-sm leading-5 text-slate-600"
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
    </View>
  );
}
