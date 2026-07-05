import React from "react";
import { Image, Text, View } from "react-native";

import type { TaskDetailEvidenceSummaryModel } from "@/ui/contracts/viewAdapters";

interface TaskDetailEvidenceStripProps {
  model: TaskDetailEvidenceSummaryModel;
}

export default function TaskDetailEvidenceStrip({ model }: TaskDetailEvidenceStripProps) {
  return (
    <View
      testID="task-detail__evidence_summary"
      className="mx-4 mt-4 rounded-3xl border border-slate-200 bg-white p-4"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-slate-900">Evidence</Text>
          <Text className="mt-1 text-sm text-slate-500">
            {model.totalPhotoCount > 0
              ? `${model.totalPhotoCount} photo${model.totalPhotoCount === 1 ? "" : "s"} attached`
              : model.emptyLabel}
          </Text>
        </View>
        <View className="rounded-full bg-slate-100 px-3 py-1.5">
          <Text className="text-sm font-semibold text-slate-700">{model.totalPhotoCount}</Text>
        </View>
      </View>

      {model.latestPhotoUrls.length > 0 ? (
        <View testID="task-detail__evidence_thumbnails" className="mt-4 flex-row gap-3">
          {model.latestPhotoUrls.slice(0, 3).map((photoUrl, index) => (
            <Image
              key={`${model.id}-photo-${index}`}
              testID={`task-detail__evidence_thumbnail_${index}`}
              source={{ uri: photoUrl }}
              resizeMode="cover"
              className="h-24 w-24 rounded-2xl bg-slate-100"
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
