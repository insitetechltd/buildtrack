import React from "react";
import { Text, View } from "react-native";

import type { TaskDetailDelegationSummaryModel } from "@/ui/contracts/viewAdapters";

interface TaskDetailDelegationCardProps {
  model: TaskDetailDelegationSummaryModel;
}

function DelegationRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <View className="flex-1 rounded-2xl bg-slate-50 px-4 py-3">
      <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-500">{label}</Text>
      <Text className="mt-1 text-base font-medium text-slate-900">{value || "—"}</Text>
    </View>
  );
}

export default function TaskDetailDelegationCard({ model }: TaskDetailDelegationCardProps) {
  return (
    <View
      testID="task-detail__delegation_summary"
      className="mx-4 mt-4 rounded-3xl border border-slate-200 bg-white p-4"
    >
      <Text className="text-lg font-semibold text-slate-900">Delegation</Text>
      <Text className="mt-1 text-sm text-slate-500">Who assigned the work and who owns it now.</Text>

      <View className="mt-4 gap-3">
        <View className="flex-row gap-3">
          <DelegationRow label="Assigned by" value={model.assignedByLabel} />
          <DelegationRow label="Primary owner" value={model.primaryOwnerLabel} />
        </View>
        <DelegationRow label="Assigned to" value={model.assignedToLabel} />
        {model.teamSummaryLabel ? (
          <View className="rounded-2xl bg-blue-50 px-4 py-3">
            <Text className="text-sm font-medium text-blue-900">{model.teamSummaryLabel}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
