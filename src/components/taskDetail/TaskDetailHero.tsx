import React from "react";
import { Text, View } from "react-native";

import type { TaskDetailHeroModel } from "@/ui/contracts/viewAdapters";

interface TaskDetailHeroProps {
  model: TaskDetailHeroModel;
}

export default function TaskDetailHero({ model }: TaskDetailHeroProps) {
  return (
    <View testID="task-detail__hero" className="mx-4 mt-4 rounded-3xl bg-slate-900 px-5 py-5">
      <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-slate-300">
        {model.projectLabel}
      </Text>
      <Text className="mt-3 text-3xl font-semibold text-white">{model.title}</Text>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <View className="rounded-full bg-white/10 px-3 py-1.5">
          <Text className="text-sm font-medium text-white">{model.statusLabel}</Text>
        </View>
        <View className="rounded-full bg-white/10 px-3 py-1.5">
          <Text className="text-sm font-medium text-white">{model.completionLabel}</Text>
        </View>
        {model.dueDateLabel ? (
          <View className="rounded-full bg-white/10 px-3 py-1.5">
            <Text className="text-sm font-medium text-slate-100">Due {model.dueDateLabel}</Text>
          </View>
        ) : null}
      </View>

      {model.nextStepLabel ? (
        <View className="mt-5 rounded-2xl bg-white/10 px-4 py-3">
          <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-300">
            Next step
          </Text>
          <Text className="mt-1 text-base leading-6 text-white">{model.nextStepLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}
