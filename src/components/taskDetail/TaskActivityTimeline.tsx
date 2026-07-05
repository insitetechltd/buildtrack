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
    detailLabel: activity.reason,
    photoUrls: Array.isArray(activity.photos) ? activity.photos : [],
    statusLabel: activity.statusLabel,
  };
}

export default function TaskActivityTimeline({
  activities = [],
  thread = [],
  activeEntryId,
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
          const photoCountLabel =
            activity.photoUrls.length === 1
              ? "1 photo"
              : `${activity.photoUrls.length} photos`;

          return (
            <View
              key={activity.id}
              testID={`task-activity-timeline__entry-${activity.id}`}
              accessibilityState={{ selected: isActiveEntry }}
              className="flex-row"
            >
              <View className="mr-3 items-center">
                <View className="mt-1 h-3 w-3 rounded-full border-2 border-blue-100 bg-blue-600" />
                {!isLastActivity ? <View className="mt-2 w-0.5 flex-1 bg-blue-100" /> : null}
              </View>

              <View className="flex-1 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <Text
                  testID="task-activity-timeline__event-label"
                  className="text-base font-semibold leading-6 text-slate-900"
                >
                  {activity.eventLabel}
                </Text>

                <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1">
                  <Text
                    testID="task-activity-timeline__actor-label"
                    className="text-sm font-medium text-slate-700"
                  >
                    {activity.actorLabel}
                  </Text>
                  <Text className="text-xs text-slate-300">•</Text>
                  <Text
                    testID="task-activity-timeline__timestamp"
                    className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400"
                  >
                    {activity.timestampLabel}
                  </Text>
                </View>

                {activity.detailLabel ? (
                  <View className="mt-3 rounded-2xl bg-white px-3 py-2.5">
                    <Text
                      testID="task-activity-timeline__detail-label"
                      className="text-sm leading-5 text-slate-600"
                    >
                      {activity.detailLabel}
                    </Text>
                  </View>
                ) : null}

                {activity.statusLabel ? (
                  <View className="mt-3 flex-row flex-wrap items-center gap-2">
                    {activity.statusLabel ? (
                      <View className="rounded-full bg-blue-50 px-2.5 py-1">
                        <Text className="text-xs font-medium capitalize text-blue-700">
                          {activity.statusLabel}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {activity.photoUrls.length > 0 ? (
                  <View
                    testID="task-activity-timeline__photo-evidence"
                    className="mt-4 border-t border-slate-200 pt-3"
                  >
                    <View className="mb-3 flex-row items-center justify-between gap-3">
                      <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Photo evidence
                      </Text>
                      <Text className="text-xs font-medium text-slate-400">{photoCountLabel}</Text>
                    </View>

                    <View className="flex-row flex-wrap gap-2">
                      {activity.photoUrls.map((photoUri, photoIndex) => (
                        <Image
                          key={`${activity.id}-photo-${photoIndex}`}
                          testID={`task-activity-timeline__photo-${activity.id}-${photoIndex}`}
                          accessibilityLabel={`Photo evidence ${photoIndex + 1} for ${activity.eventLabel}`}
                          source={{ uri: photoUri }}
                          className="h-[72px] w-[72px] rounded-2xl bg-slate-200"
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
