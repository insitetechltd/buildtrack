import React from "react";
import { Text, View } from "react-native";

import type { TaskDetailHeroModel } from "@/ui/contracts/viewAdapters";

interface TaskDetailHeroProps {
  model: TaskDetailHeroModel;
}

export default function TaskDetailHero({ model }: TaskDetailHeroProps) {
  const hasDelegationContent =
    Boolean(model.assignedByLabel) ||
    Boolean(model.assignedToLabel) ||
    Boolean(model.primaryOwnerLabel) ||
    Boolean(model.teamSummaryLabel);

  return (
    <View testID="task-detail__hero" className="mx-4 mt-4 rounded-3xl bg-slate-900 px-5 py-5">
      <Text className="text-3xl font-semibold text-white">{model.title}</Text>

      <View className="mt-4 flex-row flex-wrap gap-2">
        {model.isCritical ? (
          <View
            testID="task-detail__hero_critical_flag"
            className="rounded-full bg-amber-100 px-3 py-1.5"
          >
            <Text className="text-sm font-semibold text-amber-900">
              {model.criticalLabel}
            </Text>
          </View>
        ) : null}
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

      {hasDelegationContent ? (
        <View
          testID="task-detail__hero_delegation"
          className="mt-5 rounded-2xl bg-white/10 px-4 py-3"
        >
          <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-300">
            Delegation
          </Text>

          <View className="mt-3 gap-2">
            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 text-xs font-semibold uppercase tracking-[1.2px] text-slate-400">
                Assigned by
              </Text>
              <Text className="flex-[1.4] text-right text-sm font-medium text-white">
                {model.assignedByLabel || "—"}
              </Text>
            </View>

            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 text-xs font-semibold uppercase tracking-[1.2px] text-slate-400">
                Assigned to
              </Text>
              <Text className="flex-[1.4] text-right text-sm font-medium text-white">
                {model.assignedToLabel || "—"}
              </Text>
            </View>

            {model.primaryOwnerLabel ? (
              <View className="flex-row items-start justify-between gap-3">
                <Text className="flex-1 text-xs font-semibold uppercase tracking-[1.2px] text-slate-400">
                  Primary owner
                </Text>
                <Text className="flex-[1.4] text-right text-sm font-medium text-white">
                  {model.primaryOwnerLabel}
                </Text>
              </View>
            ) : null}

            {model.teamSummaryLabel ? (
              <View className="self-start rounded-full bg-white/10 px-3 py-1">
                <Text className="text-xs font-medium text-slate-200">{model.teamSummaryLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
