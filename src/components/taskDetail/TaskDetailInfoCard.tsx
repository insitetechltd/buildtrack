import React from "react";
import { Text, View } from "react-native";

import type { TaskDetailInfoCardModel } from "@/ui/contracts/viewAdapters";

interface TaskDetailInfoCardProps {
  model: TaskDetailInfoCardModel;
}

function buildInfoChipLabel(label: string, value?: string) {
  return `${label}: ${value || "—"}`;
}

function InfoChip({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
      <Text className="text-sm font-semibold leading-5 text-slate-700">
        {buildInfoChipLabel(label, value)}
      </Text>
    </View>
  );
}

export default function TaskDetailInfoCard({ model }: TaskDetailInfoCardProps) {
  return (
    <View
      testID="task-detail__info_card"
      className="mx-4 mt-4 rounded-3xl border border-slate-200 bg-white p-[14px]"
    >
      <View>
        <Text className="text-base font-semibold uppercase tracking-[1.2px] text-slate-500">
          Task Details
        </Text>
        <Text className="mt-1.5 text-lg leading-7 text-slate-700">
          {model.descriptionLabel || "—"}
        </Text>
      </View>

      <View testID="task-detail__detail_chips" className="mt-3 flex-row flex-wrap gap-1.5">
        <InfoChip label="Site" value={model.siteLocationLabel} />
        <InfoChip label="By" value={model.assignedByLabel} />
        <InfoChip label="To" value={model.assignedToLabel} />
        {model.primaryOwnerLabel ? <InfoChip label="Owner" value={model.primaryOwnerLabel} /> : null}
        {(model.tagLabels ?? []).map((tag) => (
          <InfoChip key={`tag-${tag}`} label="Tag" value={tag} />
        ))}
      </View>
    </View>
  );
}
