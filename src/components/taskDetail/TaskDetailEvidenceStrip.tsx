import React from "react";
import { Image, Text, View } from "react-native";

import type { TaskDetailActiveStageModel } from "@/ui/contracts/viewAdapters";

interface TaskDetailEvidenceStripProps {
  model: TaskDetailActiveStageModel;
  testID?: string;
}

export default function TaskDetailEvidenceStrip({
  model,
  testID = "task-detail__active_entry_stage",
}: TaskDetailEvidenceStripProps) {
  return (
    <View
      testID={testID}
      className="mx-4 mt-4 rounded-3xl border border-slate-200 bg-white p-4"
    >
      {model.stageMode === "photo" && model.photos.length > 0 ? (
        <View>
          <Image
            key={`${model.id}-photo-featured`}
            testID="task-detail__active_stage_photo_featured"
            source={{ uri: model.photos[model.activePhotoIndex ?? 0] }}
            resizeMode="cover"
            className="h-52 w-full rounded-[28px] bg-slate-100"
          />
          <View className="mt-3 flex-row gap-3">
            {model.photos.slice(0, 3).map((photoUrl, index) => (
              <Image
                key={`${model.id}-photo-${index}`}
                testID={`task-detail__active_stage_photo_${index}`}
                source={{ uri: photoUrl }}
                resizeMode="cover"
                className="h-20 flex-1 rounded-2xl bg-slate-100"
              />
            ))}
          </View>
        </View>
      ) : null}

      {model.stageMode === "no_photo" ? (
        <View className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8">
          <Text className="text-center text-base font-semibold text-slate-700">
            No photos for this update
          </Text>
        </View>
      ) : null}

      {model.stageMode === "pdf_preview" ? (
        <View className="rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-5">
          <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
            Document attached
          </Text>
          <Text className="mt-2 text-base font-semibold text-slate-900">
            {model.documentName || "Attached document"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
