import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { TaskDetailInfoCardModel } from "@/ui/contracts/viewAdapters";
import { cn } from "@/utils/cn";

interface TaskDetailInfoCardProps {
  model: TaskDetailInfoCardModel;
}

function joinSummary(parts: Array<string | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(" · ");
}

function buildTeamSummary(model: TaskDetailInfoCardModel) {
  if (model.isAssignedToCurrentUser) {
    const assigner = model.assignedByLabel?.trim();
    return assigner ? `Assigned by ${assigner}` : undefined;
  }

  const assignee = model.assignedToLabel?.trim();
  return assignee ? `Assigned to ${assignee}` : undefined;
}

function KvRow({
  label,
  value,
  critical = false,
}: {
  label: string;
  value?: string;
  critical?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-1.5">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text
        className={cn(
          "shrink text-right text-sm font-medium",
          critical ? "text-amber-900" : "text-slate-900",
        )}
      >
        {value?.trim() ? value : "—"}
      </Text>
    </View>
  );
}

function CollapsibleSection({
  title,
  testID,
  summary,
  badge,
  children,
}: {
  title: string;
  testID: string;
  summary?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View testID={testID} className="border-b border-slate-100">
      <Pressable
        testID={`${testID}__toggle`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={title}
        onPress={() => setIsOpen((current) => !current)}
        className="min-h-[44px] flex-row items-center py-2"
      >
        <View className="min-w-0 flex-1 pr-3">
          <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-400">
            {title}
          </Text>
          {badge ? (
            <Text
              testID={`${testID}__badge`}
              className="mt-0.5 text-sm font-semibold text-amber-800"
            >
              {badge}
            </Text>
          ) : null}
          {!isOpen && summary ? (
            <Text
              testID={`${testID}__summary`}
              className="mt-0.5 text-sm font-medium text-slate-800"
              numberOfLines={1}
            >
              {summary}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={16}
          color="#94a3b8"
        />
      </Pressable>
      {isOpen ? <View className="pb-2.5">{children}</View> : null}
    </View>
  );
}

export default function TaskDetailInfoCard({ model }: TaskDetailInfoCardProps) {
  const tagLabels = model.tagLabels ?? [];
  const delegatedLabels = model.delegatedLabels ?? [];
  const hasProgress = Boolean(
    model.statusLabel ||
      model.categoryLabel ||
      model.completionLabel ||
      model.dueDateLabel ||
      (model.isCritical && model.criticalLabel),
  );

  const cardTitle = model.title?.trim();

  return (
    <View
      testID="task-detail__info_card"
      className="mx-4 mt-4 rounded-3xl border border-slate-200 bg-white p-[14px]"
    >
      {cardTitle ? (
        <Text
          testID="task-detail__info_card_title"
          className="text-lg font-semibold text-slate-900"
        >
          {cardTitle}
        </Text>
      ) : null}

      <View className="mt-1">
        {hasProgress ? (
          <CollapsibleSection
            title="Progress"
            testID="task-detail__status_chips"
            badge={model.isCritical ? model.criticalLabel : undefined}
            summary={joinSummary([
              model.statusLabel,
              model.categoryLabel,
              model.completionLabel,
              model.dueDateLabel,
            ])}
          >
            {model.isCritical && model.criticalLabel ? (
              <KvRow label="Priority" value={model.criticalLabel} critical />
            ) : null}
            <KvRow label="Status" value={model.statusLabel} />
            <KvRow label="Category" value={model.categoryLabel} />
            <KvRow label="Completion" value={model.completionLabel} />
            <KvRow label="Due" value={model.dueDateLabel} />
          </CollapsibleSection>
        ) : null}

        <View testID="task-detail__detail_chips">
          <CollapsibleSection
            title="Location"
            testID="task-detail__location_group"
            summary={model.siteLocationLabel?.trim() || "—"}
          >
            <KvRow label="Site" value={model.siteLocationLabel} />
          </CollapsibleSection>

          <CollapsibleSection
            title="Team"
            testID="task-detail__people_group"
            summary={buildTeamSummary(model)}
          >
            <KvRow label="Assigned by" value={model.assignedByLabel} />
            <KvRow label="Assigned to" value={model.assignedToLabel} />
            {model.primaryOwnerLabel ? (
              <KvRow label="Owner" value={model.primaryOwnerLabel} />
            ) : null}
            {delegatedLabels.length > 0 ? (
              <KvRow label="Delegates" value={delegatedLabels.join(", ")} />
            ) : null}
          </CollapsibleSection>

          {tagLabels.length > 0 ? (
            <CollapsibleSection
              title="Tags"
              testID="task-detail__tags_group"
              summary={tagLabels.join(", ")}
            >
              <KvRow label="Tags" value={tagLabels.join(", ")} />
            </CollapsibleSection>
          ) : null}
        </View>
      </View>
    </View>
  );
}
