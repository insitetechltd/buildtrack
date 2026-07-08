import React from "react";
import { Text, View } from "react-native";

import type { TaskDetailHeroModel } from "@/ui/contracts/viewAdapters";

interface TaskDetailHeroProps {
  model: TaskDetailHeroModel;
}

export default function TaskDetailHero({ model }: TaskDetailHeroProps) {
  return (
    <View testID="task-detail__hero" className="mx-4 mt-4 rounded-3xl bg-slate-900 px-5 py-5">
      <Text className="text-3xl font-semibold text-white">{model.title}</Text>

      <View className="mt-4 flex-row flex-wrap gap-2">
        {model.isCritical ? (
          <View
            testID="task-detail__hero_critical_flag"
            className="rounded-full bg-amber-100 px-3 py-1.5"
          >
            <Text className="text-base font-semibold text-amber-900">
              {model.criticalLabel}
            </Text>
          </View>
        ) : null}
        {model.categoryLabel ? (
          <View className="rounded-full bg-white/10 px-3 py-1.5">
            <Text className="text-base font-medium text-white">{model.categoryLabel}</Text>
          </View>
        ) : null}
        <View className="rounded-full bg-white/10 px-3 py-1.5">
          <Text className="text-base font-medium text-white">{model.statusLabel}</Text>
        </View>
        <View className="rounded-full bg-white/10 px-3 py-1.5">
          <Text className="text-base font-medium text-white">{model.completionLabel}</Text>
        </View>
        {model.dueDateLabel ? (
          <View className="rounded-full bg-white/10 px-3 py-1.5">
            <Text className="text-base font-medium text-slate-100">Due {model.dueDateLabel}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
