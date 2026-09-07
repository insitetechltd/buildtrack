import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { TaskDetailInfoCardModel } from "@/ui/contracts/viewAdapters";

interface TaskDetailInfoCardProps {
  model: TaskDetailInfoCardModel;
  onEditPress?: () => void;
  onReassignPress?: () => void;
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
  testID,
}: {
  label: string;
  value?: string;
  /** Critical-this-week: highlight due date in red (not a separate Priority row). */
  critical?: boolean;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      className="flex-row items-center justify-between gap-3 py-1.5"
    >
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text
        className="shrink text-right text-sm font-medium"
        style={{ color: critical ? "#DC2626" : "#0f172a" }}
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
  summaryCritical = false,
  defaultOpen = false,
  children,
}: {
  title: string;
  testID: string;
  summary?: string;
  /** When true, collapsed summary due/critical cue uses red due emphasis. */
  summaryCritical?: boolean;
  /** Open by default (e.g. Team when Reassign is available). */
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

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
          {!isOpen && summary ? (
            <Text
              testID={`${testID}__summary`}
              className="mt-0.5 text-sm font-medium"
              style={{ color: summaryCritical ? "#DC2626" : "#1e293b" }}
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

export default function TaskDetailInfoCard({
  model,
  onEditPress,
  onReassignPress,
}: TaskDetailInfoCardProps) {
  const tagLabels = model.tagLabels ?? [];
  const delegatedLabels = model.delegatedLabels ?? [];
  const hasProgress = Boolean(
    model.statusLabel ||
      model.categoryLabel ||
      model.completionLabel ||
      model.dueDateLabel,
  );
  const dueIsCritical = Boolean(model.isCritical && model.dueDateLabel);

  const cardTitle = model.title?.trim();
  const showEdit = Boolean(model.showEditAction && onEditPress);
  const showReassign = Boolean(model.showReassignAction && onReassignPress);

  return (
    <View
      testID="task-detail__info_card"
      className="mx-4 mt-4 rounded-3xl border border-slate-200 bg-white p-[14px]"
    >
      {cardTitle || showEdit ? (
        <View className="flex-row items-start gap-2">
          {cardTitle ? (
            <Text
              testID="task-detail__info_card_title"
              className="min-w-0 flex-1 text-lg font-semibold text-slate-900"
            >
              {cardTitle}
            </Text>
          ) : (
            <View className="flex-1" />
          )}
          {showEdit ? (
            <Pressable
              testID="task-detail__info_card_edit"
              accessibilityRole="button"
              accessibilityLabel={model.editActionLabel || "Edit Task Details"}
              onPress={onEditPress}
              hitSlop={8}
              style={{ height: 44, width: 44, borderRadius: 22 }}
              className="items-center justify-center border border-slate-200 bg-slate-50"
            >
              <Ionicons name="create-outline" size={20} color="#08576E" />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View className="mt-1">
        {hasProgress ? (
          <CollapsibleSection
            title="Progress"
            testID="task-detail__status_chips"
            summary={joinSummary([
              model.statusLabel,
              model.categoryLabel,
              model.completionLabel,
              model.dueDateLabel,
            ])}
            summaryCritical={dueIsCritical}
          >
            <KvRow label="Status" value={model.statusLabel} />
            <KvRow label="Category" value={model.categoryLabel} />
            <KvRow label="Completion" value={model.completionLabel} />
            <KvRow
              label="Due"
              value={model.dueDateLabel}
              critical={dueIsCritical}
              testID="task-detail__due_date"
            />
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
            defaultOpen={showReassign}
          >
            <KvRow label="Assigned by" value={model.assignedByLabel} />
            <KvRow label="Assigned to" value={model.assignedToLabel} />
            {model.primaryOwnerLabel ? (
              <KvRow label="Owner" value={model.primaryOwnerLabel} />
            ) : null}
            {delegatedLabels.length > 0 ? (
              <KvRow label="Delegates" value={delegatedLabels.join(", ")} />
            ) : null}
            {showReassign ? (
              <Pressable
                testID="task-detail__reassign"
                accessibilityRole="button"
                accessibilityLabel={model.reassignActionLabel || "Reassign"}
                onPress={onReassignPress}
                className="mt-2 min-h-[44px] items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-3"
              >
                <Text className="text-base font-semibold text-[#08576E]">
                  {model.reassignActionLabel || "Reassign"}
                </Text>
              </Pressable>
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
