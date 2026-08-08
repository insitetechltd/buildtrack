import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useTaskDetailViewAdapter } from "@/ui/viewAdapters/useTaskDetailViewAdapter";
import ModernScreenHeader from "@/components/ModernScreenHeader";
import TaskDetailInfoCard from "@/components/taskDetail/TaskDetailInfoCard";
import TaskDetailQuickActions from "@/components/taskDetail/TaskDetailQuickActions";
import TaskActivityTimeline from "@/components/taskDetail/TaskActivityTimeline";
import { cn } from "@/utils/cn";
import { mapBannerModelToBannerProps } from "@/ui/mappers/taskDetailMappers";
import type { BannerPrimitiveContract } from "@/ui/contracts/primitives";
import type { TaskDetailActionItem } from "@/ui/contracts/viewAdapters";
import { CRITICAL_THIS_WEEK_TAG } from "@/ui/contracts/taskTags";

interface TaskDetailScreenProps {
  taskId: string;
  subTaskId?: string;
  onNavigateBack: () => void;
  onNavigateToCreateTask?: (
    parentTaskId?: string,
    parentSubTaskId?: string,
    editTaskId?: string,
    actionType?: 'edit' | 'update' | 'photos' | 'comment' | 'reassign',
    updateTargetSubTaskId?: string,
  ) => void;
  onNavigateToRejectTask?: (taskId: string, subTaskId?: string) => void;
  onNavigateToTaskDetail?: (taskId: string, subTaskId?: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

const BannerPrimitive = ({ contract }: { contract: BannerPrimitiveContract }) => {
  const bgColors = {
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    green: "bg-green-50 border-green-200 text-green-900",
    red: "bg-red-50 border-red-200 text-red-900",
  };
  const iconColors = {
    amber: "#f59e0b",
    green: "#16a34a",
    red: "#dc2626",
  };
  const iconBg = {
    amber: "bg-amber-100",
    green: "bg-green-100",
    red: "bg-red-100",
  };

  return (
    <View className={`border-b-2 px-6 py-4 ${bgColors[contract.colorScheme].split(" ")[0]} ${bgColors[contract.colorScheme].split(" ")[1]}`}>
      <View className="flex-row items-center">
        <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${iconBg[contract.colorScheme]}`}>
          <Ionicons name={contract.iconName as any} size={24} color={iconColors[contract.colorScheme]} />
        </View>
        <View className="flex-1">
          <Text className={`text-xl font-bold ${bgColors[contract.colorScheme].split(" ")[2]}`}>
            {contract.title}
          </Text>
          {contract.subtitle && (
            <Text className={`text-base mt-1 ${bgColors[contract.colorScheme].split(" ")[2]} opacity-80`}>
              {contract.subtitle}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const ACTION_PRIORITY: Record<string, number> = {
  approve_task: 0,
  accept_task: 1,
  submit_review: 2,
  update_progress: 3,
  reassign_task: 4,
  edit_task: 5,
  add_comment: 6,
  decline_task: 7,
  reject_task: 8,
};

function prioritizeActionItems(actionItems: TaskDetailActionItem[]) {
  const prioritizedActions = actionItems
    .map((action, index) => ({
      action,
      index,
      priority: ACTION_PRIORITY[action.actionId] ?? 99,
    }))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return left.index - right.index;
    })
    .map(({ action }) => action);

  if (prioritizedActions.length === 0) {
    return {
      primaryAction: undefined,
      secondaryActions: [] as TaskDetailActionItem[],
    };
  }

  return {
    primaryAction: undefined,
    secondaryActions: prioritizedActions,
  };
}

function HeaderBadge({
  label,
  critical = false,
}: {
  label: string;
  critical?: boolean;
}) {
  return (
    <View
      className={cn(
        "rounded-full px-3 py-1.5",
        critical ? "bg-amber-100" : "bg-white/10",
      )}
    >
      <Text
        className={cn(
          "text-base font-medium",
          critical ? "text-amber-900" : "text-white",
        )}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TaskDetailScreen(props: TaskDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { output, actions } = useTaskDetailViewAdapter({
    taskId: props.taskId,
    subTaskId: props.subTaskId
  });
  const [isHeaderTitleExpanded, setIsHeaderTitleExpanded] = useState(false);
  const [tagDraft, setTagDraft] = useState("");

  const handleActionPress = (actionId: string) => {
    switch (actionId) {
      case 'accept_task':
        actions.acceptTask();
        break;
      case 'decline_task':
        Alert.prompt("Decline Task", "Reason for declining:", (reason) => {
          if (reason) actions.declineTask(reason);
        });
        break;
      case 'submit_review':
        actions.submitForReview();
        break;
      case 'approve_task':
        actions.approveTask();
        break;
      case 'toggle_critical_this_week':
        actions.toggleCriticalThisWeek();
        break;
      case 'archive_task':
        Alert.alert(
          "Archive task?",
          "This task will move to the Archived queue.",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Archive",
              style: "destructive",
              onPress: () => {
                void actions
                  .archiveTask()
                  .then(() => {
                    props.onNavigateBack?.();
                  })
                  .catch((error) => {
                    Alert.alert(
                      "Unable to archive task",
                      error instanceof Error ? error.message : "Please try again.",
                    );
                  });
              },
            },
          ],
        );
        break;
      case 'reject_task':
        if (props.onNavigateToRejectTask) {
          props.onNavigateToRejectTask(props.taskId, props.subTaskId);
        }
        break;
      case 'edit_task':
        if (props.onNavigateToCreateTask) {
          props.onNavigateToCreateTask(undefined, undefined, props.taskId, 'edit');
        }
        break;
      case 'reassign_task':
        if (props.onNavigateToCreateTask) {
          props.onNavigateToCreateTask(undefined, undefined, props.taskId, 'reassign');
        }
        break;
      case 'add_comment':
        if (props.onNavigateToCreateTask) {
          props.onNavigateToCreateTask(
            undefined,
            undefined,
            props.taskId,
            'comment',
            props.subTaskId,
          );
        }
        break;
      case 'update_progress':
        if (props.onNavigateToCreateTask) {
          props.onNavigateToCreateTask(
            undefined,
            undefined,
            props.taskId,
            'photos',
            props.subTaskId,
          );
        }
        break;
      case 'upload_photos':
        if (props.onNavigateToCreateTask) {
          props.onNavigateToCreateTask(
            undefined,
            undefined,
            props.taskId,
            'photos',
            props.subTaskId,
          );
        }
        break;
    }
  };

  const criticalThisWeekAction = (output.actionItems ?? []).find(
    (action) => action.actionId === "toggle_critical_this_week",
  );
  const quickActionIds = new Set(
    (output.quickActions?.actions ?? []).map((action) => action.actionId),
  );
  const { secondaryActions } = prioritizeActionItems(
    (output.actionItems ?? []).filter(
      (action) =>
        !quickActionIds.has(action.actionId) &&
        action.actionId !== "toggle_critical_this_week" &&
        action.actionId !== "upload_photos",
    ),
  );
  const hasQuickActions = Boolean(output.quickActions?.actions?.length);
  const scrollRegionBottomPadding = 16;

  if (!output.readiness.hasUsableData) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <ModernScreenHeader 
          title="Loading..." 
          showBackButton 
          onBackPress={props.onNavigateBack}
        />
        <View className="flex-1 items-center justify-center">
          <Text>Loading task details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const headerBadges = [
    output.taskHero.isCritical && output.taskHero.criticalLabel
      ? { id: "critical", label: output.taskHero.criticalLabel, critical: true }
      : null,
    output.taskHero.categoryLabel
      ? { id: "category", label: output.taskHero.categoryLabel }
      : null,
    { id: "status", label: output.taskHero.statusLabel },
    { id: "completion", label: output.taskHero.completionLabel },
    output.taskHero.dueDateLabel
      ? { id: "due", label: `Due ${output.taskHero.dueDateLabel}` }
      : null,
  ].filter((badge): badge is { id: string; label: string; critical?: boolean } => Boolean(badge));

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <ModernScreenHeader 
        title={output.header.title || "Task Details"}
        titleNode={(
          <View testID="task-detail__header_title_block">
            <Pressable
              testID="task-detail__header_title_pressable"
              onPress={() => setIsHeaderTitleExpanded((current) => !current)}
            >
              <Text
                testID="task-detail__header_title"
                className="text-[28px] leading-8 font-semibold text-[#F8FCFF]"
                numberOfLines={isHeaderTitleExpanded ? undefined : 1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit={!isHeaderTitleExpanded}
                minimumFontScale={isHeaderTitleExpanded ? undefined : 0.9}
              >
                {output.header.title || "Task Details"}
              </Text>
            </Pressable>
            {headerBadges.length > 0 ? (
              <View testID="task-detail__header_badges" className="mt-3 flex-row flex-wrap gap-2">
                {headerBadges.map((badge) => (
                  <HeaderBadge
                    key={badge.id}
                    label={badge.label}
                    critical={badge.critical}
                  />
                ))}
              </View>
            ) : null}
          </View>
        )}
        showBackButton={true}
        onBackPress={props.onNavigateBack}
        onNavigateToProfile={props.onNavigateToProfile}
        onNavigateToProjectPicker={props.onNavigateToProjectPicker}
      />

      <View className="flex-1">
        <View testID="task-detail__scroll_region" className="flex-1">
          <ScrollView
            testID="task-detail__workthread_scroll"
            className="flex-1"
            contentContainerStyle={{
              paddingBottom: scrollRegionBottomPadding,
              flexGrow: 1,
            }}
            scrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {output.infoCard ? <TaskDetailInfoCard model={output.infoCard} /> : null}

            {/* Banners */}
            {output.banners.map(banner => (
              <BannerPrimitive key={banner.id} contract={mapBannerModelToBannerProps(banner)} />
            ))}

            {criticalThisWeekAction ? (
              <View className="px-4 pt-4">
                <Pressable
                  testID="task-detail__toggle_critical_this_week"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: criticalThisWeekAction.isDisabled, selected: criticalThisWeekAction.isActive }}
                  disabled={criticalThisWeekAction.isDisabled}
                  onPress={() => handleActionPress(criticalThisWeekAction.actionId)}
                  className={cn(
                    "flex-row items-center justify-between rounded-2xl border px-4 py-3",
                    criticalThisWeekAction.isActive
                      ? "border-amber-300 bg-amber-50"
                      : "border-amber-200 bg-white",
                    criticalThisWeekAction.isDisabled && "opacity-50",
                  )}
                >
                  <View className="mr-3 flex-1">
                    <Text className="text-base font-semibold text-slate-900">
                      {criticalThisWeekAction.label}
                    </Text>
                    <Text className="mt-1 text-base text-slate-600">
                      {criticalThisWeekAction.isActive
                        ? "Included in This Week’s Critical Dates."
                        : "Highlight this task in This Week’s Critical Dates."}
                    </Text>
                  </View>
                  <Ionicons
                    name={criticalThisWeekAction.isActive ? "flag" : "flag-outline"}
                    size={20}
                    color={criticalThisWeekAction.isActive ? "#b45309" : "#6b7280"}
                  />
                </Pressable>
              </View>
            ) : null}

            <View
              testID="task-detail__tags_primary_editor"
              className="mx-4 mt-4 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <Text className="text-sm font-semibold uppercase tracking-[1.2px] text-slate-500">
                Tags & Primary
              </Text>
              {output.assignees.length > 0 ? (
                <View className="mt-3">
                  <Text className="mb-2 text-sm text-slate-600">
                    Tap to set Primary owner
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {output.assignees.map((assignee) => {
                      const isPrimary =
                        output.infoCard?.primaryAssigneeId === assignee.id;
                      return (
                        <Pressable
                          key={assignee.id}
                          testID={`task-detail__set_primary_${assignee.id}`}
                          onPress={() => {
                            void actions.setPrimaryAssignee(assignee.id);
                          }}
                          className={cn(
                            "rounded-full px-3 py-1.5 border",
                            isPrimary
                              ? "border-amber-300 bg-amber-50"
                              : "border-slate-200 bg-slate-50",
                          )}
                        >
                          <Text
                            className={cn(
                              "text-sm font-medium",
                              isPrimary ? "text-amber-900" : "text-slate-800",
                            )}
                          >
                            {assignee.name}
                            {isPrimary ? " · Primary" : ""}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <View className="mt-4">
                <Text className="mb-2 text-sm text-slate-600">Custom tags</Text>
                <View className="flex-row flex-wrap gap-2 mb-2">
                  {(output.infoCard?.tagLabels ?? [])
                    .filter((tag) => tag !== CRITICAL_THIS_WEEK_TAG)
                    .map((tag) => (
                      <View
                        key={tag}
                        className="rounded-full bg-slate-100 px-3 py-1.5 flex-row items-center"
                      >
                        <Text className="text-sm text-slate-800 mr-1">{tag}</Text>
                        <Pressable
                          testID={`task-detail__remove_tag_${tag}`}
                          onPress={() => {
                            void actions.removeCustomTag(tag);
                          }}
                        >
                          <Ionicons name="close-circle" size={16} color="#475569" />
                        </Pressable>
                      </View>
                    ))}
                </View>
                <TextInput
                  testID="task-detail__tag_input"
                  className="border border-slate-200 rounded-xl px-3 py-3 text-base text-slate-900"
                  placeholder="Add tag, press return"
                  placeholderTextColor="#94a3b8"
                  value={tagDraft}
                  onChangeText={setTagDraft}
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={() => {
                    void actions.addCustomTag(tagDraft);
                    setTagDraft("");
                  }}
                />
              </View>
            </View>

            <TaskActivityTimeline
              testID="task-detail__activity_thread"
              thread={output.activityThread}
            />

            {secondaryActions.length > 0 ? (
              <View testID="task-detail__secondary-actions" className="mx-4 mb-4 rounded-2xl border border-gray-200 bg-white p-3">
                <Text className="mb-3 text-base font-semibold uppercase tracking-wide text-gray-500">
                  Other actions
                </Text>

                <View className="flex-row flex-wrap gap-2">
                  {secondaryActions.map((action) => (
                    <Pressable
                      key={action.id}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: action.isDisabled }}
                      disabled={action.isDisabled}
                      onPress={() => handleActionPress(action.actionId)}
                      className={cn(
                        "flex-row items-center rounded-full border border-gray-300 bg-white px-3 py-2",
                        action.isDisabled && "opacity-50",
                      )}
                    >
                      {action.icon ? (
                        <Ionicons name={action.icon as any} size={16} color="#4b5563" style={{ marginRight: 6 }} />
                      ) : null}
                      <Text className="text-base font-medium text-gray-700">{action.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>

        {hasQuickActions ? (
          <View
            testID="task-detail__bottom_action_bar"
            className="border-t border-gray-200 bg-gray-50 px-4 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            <TaskDetailQuickActions
              model={output.quickActions!}
              onPress={handleActionPress}
              containerClassName="mx-0 mt-0"
            />
          </View>
        ) : null}
      </View>

    </SafeAreaView>
  );
}
