import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";

import { extractBuildtrackStoragePath } from "@/api/fileUploadService";
import type { TaskDetailActiveStageModel } from "@/ui/contracts/viewAdapters";

interface TaskDetailEvidenceStripProps {
  model: TaskDetailActiveStageModel;
  testID?: string;
}

function buildCachedImageSource(photoUrl: string) {
  return {
    uri: photoUrl,
    cacheKey: extractBuildtrackStoragePath(photoUrl) ?? photoUrl,
  };
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
          <View className="h-52 w-full overflow-hidden rounded-[28px] bg-slate-100">
            <ExpoImage
              key={`${model.id}-photo-featured`}
              testID="task-detail__active_stage_photo_featured"
              source={buildCachedImageSource(model.photos[model.activePhotoIndex ?? 0])}
              contentFit="cover"
              cachePolicy="memory-disk"
              style={StyleSheet.absoluteFillObject}
            />
          </View>
          <View className="mt-3 flex-row gap-3">
            {model.photos.slice(0, 3).map((photoUrl, index) => (
              <View
                key={`${model.id}-photo-${index}`}
                className="h-20 flex-1 overflow-hidden rounded-2xl bg-slate-100"
              >
                <ExpoImage
                  testID={`task-detail__active_stage_photo_${index}`}
                  source={buildCachedImageSource(photoUrl)}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  style={StyleSheet.absoluteFillObject}
                />
              </View>
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
