import React from "react";
import { Text, View } from "react-native";

import type { TaskDetailInfoCardModel } from "@/ui/contracts/viewAdapters";

interface TaskDetailInfoCardProps {
  model: TaskDetailInfoCardModel;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <View className="flex-row items-start justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <Text className="flex-1 text-xs font-semibold uppercase tracking-[1.2px] text-slate-500">
        {label}
      </Text>
      <Text className="flex-[1.4] text-right text-sm font-medium text-slate-900">{value || "—"}</Text>
    </View>
  );
}

export default function TaskDetailInfoCard({ model }: TaskDetailInfoCardProps) {
  return (
    <View
      testID="task-detail__info_card"
      className="mx-4 mt-4 rounded-3xl border border-slate-200 bg-white p-4"
    >
      <View>
        <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-500">
          Description
        </Text>
        <Text className="mt-2 text-sm leading-6 text-slate-700">
          {model.descriptionLabel || "—"}
        </Text>
      </View>

      <View className="mt-5">
        <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-500">
          Delegation
        </Text>

        <View className="mt-3 gap-3">
          <InfoRow label="Assigned by" value={model.assignedByLabel} />
          <InfoRow label="Assigned to" value={model.assignedToLabel} />
          {model.primaryOwnerLabel ? (
            <InfoRow label="Primary owner" value={model.primaryOwnerLabel} />
          ) : null}
        </View>
      </View>

      <View className="mt-5">
        <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-500">
          Details
        </Text>

        <View className="mt-3 gap-3">
          {model.detailRows.map((row) => (
            <InfoRow key={row.id} label={row.label} value={row.value} />
          ))}
        </View>
      </View>
    </View>
  );
}
