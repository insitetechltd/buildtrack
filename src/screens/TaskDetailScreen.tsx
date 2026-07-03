import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useTaskDetailViewAdapter } from "@/ui/viewAdapters/useTaskDetailViewAdapter";
import ModernScreenHeader from "@/components/ModernScreenHeader";
import ModernUiMarker from "@/components/migration/ModernUiMarker";
import ContainerCard from "@/components/primitives/container/ContainerCard";
import TaskActivityTimeline from "@/components/taskDetail/TaskActivityTimeline";
import PrimaryActionBar from "@/components/ui/PrimaryActionBar";
import { cn } from "@/utils/cn";
import {
  mapBannerModelToBannerProps,
  mapSectionModelToContainerProps,
} from "@/ui/mappers/taskDetailMappers";
import { mapTaskRowToContainerCardProps } from "@/ui/mappers/tasksMappers";
import type { BannerPrimitiveContract } from "@/ui/contracts/primitives";
import type { TaskDetailActionItem } from "@/ui/contracts/viewAdapters";

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
  upload_photos: 6,
  add_comment: 7,
  decline_task: 8,
  reject_task: 9,
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

  return {
    primaryAction: prioritizedActions[0],
    secondaryActions: prioritizedActions.slice(1),
  };
}

export default function TaskDetailScreen(props: TaskDetailScreenProps) {
  const { output, actions } = useTaskDetailViewAdapter({
    taskId: props.taskId,
    subTaskId: props.subTaskId
  });

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
          props.onNavigateToCreateTask(undefined, undefined, props.taskId, 'comment');
        }
        break;
      case 'update_progress':
        if (props.onNavigateToCreateTask) {
          props.onNavigateToCreateTask(undefined, undefined, props.taskId, 'update');
        }
        break;
      case 'upload_photos':
        if (props.onNavigateToCreateTask) {
          props.onNavigateToCreateTask(
            undefined,
            undefined,
            props.taskId,
            'update',
            props.subTaskId,
          );
        }
        break;
    }
  };

  const { primaryAction, secondaryActions } = prioritizeActionItems(output.actionItems ?? []);
  const scrollContentPaddingBottom = primaryAction ? 148 : 32;

  if (!output.readiness.hasUsableData) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <ModernScreenHeader 
          title="Loading..." 
          showBackButton 
          onBackPress={props.onNavigateBack}
          rightElement={<ModernUiMarker />}
        />
        <View className="flex-1 items-center justify-center">
          <Text>Loading task details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <ModernScreenHeader 
        title={output.header.title || "Task Details"}
        showBackButton={true}
        onBackPress={props.onNavigateBack}
        onNavigateToProfile={props.onNavigateToProfile}
        onNavigateToProjectPicker={props.onNavigateToProjectPicker}
        rightElement={<ModernUiMarker />}
      />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: scrollContentPaddingBottom }}>
        {/* Banners */}
        {output.banners.map(banner => (
          <BannerPrimitive key={banner.id} contract={mapBannerModelToBannerProps(banner)} />
        ))}

        {/* Details Sections */}
        <View className="px-4 mt-4">
          {output.detailSections.map(section => (
            <View key={section.id} className="mb-4">
              <ContainerCard contract={mapSectionModelToContainerProps(section)} />
            </View>
          ))}
        </View>

        {/* Assignees & Assigners */}
        <View className="bg-white mx-4 mb-4 rounded-xl border border-gray-200 p-4">
          <Text className="font-semibold text-gray-900 mb-2">People</Text>
          <Text className="text-gray-700">
            Assigned By: {output.assigners.map(a => a.name).join(', ') || 'Unknown'}
          </Text>
          <Text className="text-gray-700 mt-1">
            Assigned To: {output.assignees.map(a => a.name).join(', ') || 'Unassigned'}
          </Text>
        </View>

        {/* Activities */}
        {output.activities.length > 0 && (
          <TaskActivityTimeline activities={output.activities} />
        )}

        {/* Child Tasks */}
        {output.childTasks.length > 0 && (
          <View className="bg-white mx-4 mb-4 rounded-xl border border-gray-200 p-4">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Sub-Tasks ({output.childTasks.length})</Text>
            {output.childTasks.map(childTask => (
              <ContainerCard
                key={childTask.id}
                contract={mapTaskRowToContainerCardProps({
                  ...childTask,
                  onPress: props.onNavigateToTaskDetail
                    ? () => props.onNavigateToTaskDetail?.(childTask.taskId)
                    : undefined,
                })}
              />
            ))}
          </View>
        )}

        {secondaryActions.length > 0 ? (
          <View testID="task-detail__secondary-actions" className="mx-4 mb-4 rounded-2xl border border-gray-200 bg-white p-3">
            <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
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
                  <Text className="text-sm font-medium text-gray-700">{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {primaryAction ? (
        <View testID="task-detail__primary-action-bar" className="absolute bottom-0 left-0 right-0">
          <PrimaryActionBar
            primaryLabel={primaryAction.label}
            onPrimaryPress={() => handleActionPress(primaryAction.actionId)}
            isPrimaryDisabled={primaryAction.isDisabled}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
