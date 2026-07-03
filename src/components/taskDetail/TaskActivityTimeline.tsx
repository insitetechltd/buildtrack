import React, { useMemo } from "react";
import { Image, Text, View } from "react-native";

import type { TaskDetailActivityModel } from "@/ui/contracts/viewAdapters";

interface TaskActivityTimelineProps {
  activities: TaskDetailActivityModel[];
}

function formatActivityTimestamp(timestamp: string) {
  const parsedDate = new Date(timestamp);

  if (Number.isNaN(parsedDate.getTime())) {
    return timestamp;
  }

  return parsedDate.toLocaleString();
}

export default function TaskActivityTimeline({ activities }: TaskActivityTimelineProps) {
  const sortedActivities = useMemo(
    () =>
      [...activities].sort(
        (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
      ),
    [activities],
  );

  return (
    <View className="mx-4 mb-4 rounded-2xl border border-gray-200 bg-white p-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-gray-900">Activity</Text>
        <View className="rounded-full bg-gray-100 px-3 py-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Newest first
          </Text>
        </View>
      </View>

      <View className="gap-4">
        {sortedActivities.map((activity, index) => {
          const isLastActivity = index === sortedActivities.length - 1;

          return (
            <View key={activity.id} className="flex-row">
              <View className="mr-3 items-center">
                <View className="mt-1 h-3 w-3 rounded-full bg-blue-600" />
                {!isLastActivity ? <View className="mt-1 w-0.5 flex-1 bg-blue-100" /> : null}
              </View>

              <View className="flex-1 rounded-2xl bg-gray-50 p-3">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-900">{activity.userName}</Text>
                    <Text
                      testID="task-activity-timeline__description"
                      className="mt-1 text-sm leading-5 text-gray-700"
                    >
                      {activity.description}
                    </Text>
                  </View>

                  <Text className="max-w-[120px] text-right text-xs text-gray-500">
                    {formatActivityTimestamp(activity.timestamp)}
                  </Text>
                </View>

                {activity.reason ? (
                  <Text className="mt-2 text-xs italic text-gray-600">Reason: {activity.reason}</Text>
                ) : null}

                {activity.statusLabel || activity.completionPercentage !== undefined ? (
                  <View className="mt-3 flex-row flex-wrap items-center gap-2">
                    {activity.statusLabel ? (
                      <View className="rounded-full bg-blue-50 px-2.5 py-1">
                        <Text className="text-xs font-medium capitalize text-blue-700">
                          {activity.statusLabel}
                        </Text>
                      </View>
                    ) : null}

                    {activity.completionPercentage !== undefined ? (
                      <Text className="text-xs font-medium text-gray-500">
                        Progress {activity.completionPercentage}%
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {activity.photos.length > 0 ? (
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {activity.photos.map((photoUri, photoIndex) => (
                      <Image
                        key={`${activity.id}-photo-${photoIndex}`}
                        source={{ uri: photoUri }}
                        className="h-16 w-16 rounded-xl"
                      />
                    ))}
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
