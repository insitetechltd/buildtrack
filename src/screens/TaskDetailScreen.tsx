import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useTaskDetailViewAdapter } from "@/ui/viewAdapters/useTaskDetailViewAdapter";
import StandardHeader from "@/components/StandardHeader";
import ContainerCard from "@/components/primitives/container/ContainerCard";
import TaskCard from "@/components/TaskCard";
import { cn } from "@/utils/cn";
import {
  mapActionItemToButtonProps,
  mapBannerModelToBannerProps,
  mapActivityModelToActivityProps,
  mapSectionModelToContainerProps,
} from "@/ui/mappers/taskDetailMappers";
import type { BannerPrimitiveContract, ActivityPrimitiveContract, ButtonPrimitiveContract } from "@/ui/contracts/primitives";

interface TaskDetailScreenProps {
  taskId: string;
  subTaskId?: string;
  onNavigateBack: () => void;
  onNavigateToCreateTask?: (parentTaskId?: string, parentSubTaskId?: string, editTaskId?: string, actionType?: 'edit' | 'update' | 'photos' | 'comment' | 'reassign') => void;
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

const ActivityPrimitive = ({ contract }: { contract: ActivityPrimitiveContract }) => {
  return (
    <View className="border-l-4 border-blue-200 pl-4 mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Ionicons 
            name={contract.activityType === 'status_change' ? 'sync' : contract.activityType === 'progress_update' ? 'trending-up' : 'document-text'} 
            size={16} 
            color="#3b82f6" 
            style={{ marginRight: 6 }}
          />
          <Text className="font-medium text-gray-900">
            {contract.userName}
          </Text>
        </View>
        <Text className="text-sm text-gray-500">
          {new Date(contract.timestamp).toLocaleString()}
        </Text>
      </View>
      <Text className="text-gray-700 mb-2">{contract.description}</Text>
      {contract.reason && (
        <Text className="text-gray-600 italic mb-2">Reason: {contract.reason}</Text>
      )}
      {contract.completionPercentage !== undefined && contract.statusLabel && (
        <View className="flex-row items-center space-x-4">
          <Text className="text-base text-gray-500">
            Progress: {contract.completionPercentage}%
          </Text>
          <View className="px-2 py-1 rounded bg-blue-50">
            <Text className="text-sm capitalize text-blue-700">
              {contract.statusLabel}
            </Text>
          </View>
        </View>
      )}
      {contract.photos && contract.photos.length > 0 && (
        <View className="flex-row mt-2 space-x-2">
          {contract.photos.map((photo, i) => (
            <Image key={i} source={{ uri: photo }} className="w-16 h-16 rounded" />
          ))}
        </View>
      )}
    </View>
  );
};

const ButtonPrimitive = ({ contract, onPress }: { contract: ButtonPrimitiveContract; onPress: () => void }) => {
  const isDestructive = contract.label.toLowerCase().includes('decline') || contract.label.toLowerCase().includes('reject');
  const isPrimary = contract.label.toLowerCase().includes('accept') || contract.label.toLowerCase().includes('approve') || contract.label.toLowerCase().includes('update');
  
  const bgClass = isDestructive ? "bg-red-600" : isPrimary ? "bg-green-600" : "bg-blue-600";
  
  return (
    <Pressable
      onPress={onPress}
      disabled={contract.isDisabled}
      className={cn(
        "flex-1 rounded-xl py-3 px-4 flex-row items-center justify-center",
        bgClass,
        contract.isDisabled && "opacity-50"
      )}
    >
      {contract.icon && (
        <Ionicons name={contract.icon as any} size={18} color="white" />
      )}
      <Text className="font-semibold text-base ml-2 text-white">
        {contract.label}
      </Text>
    </Pressable>
  );
};

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
        // Navigate to reject task or prompt
        if (props.onNavigateToCreateTask) {
          props.onNavigateToCreateTask(props.taskId, props.subTaskId, props.taskId, 'comment'); // placeholder
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
          props.onNavigateToCreateTask(undefined, undefined, props.taskId, 'photos');
        }
        break;
    }
  };

  if (!output.readiness.hasUsableData) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <StandardHeader 
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

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <StandardHeader 
        title={output.header.title || "Task Details"}
        showBackButton={true}
        onBackPress={props.onNavigateBack}
        onNavigateToProfile={props.onNavigateToProfile}
        onNavigateToProjectPicker={props.onNavigateToProjectPicker}
      />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
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
          <View className="bg-white mx-4 mb-4 rounded-xl border border-gray-200 p-4">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Activities</Text>
            {output.activities.map(activity => (
              <ActivityPrimitive key={activity.id} contract={mapActivityModelToActivityProps(activity)} />
            ))}
          </View>
        )}

        {/* Child Tasks */}
        {output.childTasks.length > 0 && (
          <View className="bg-white mx-4 mb-4 rounded-xl border border-gray-200 p-4">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Sub-Tasks ({output.childTasks.length})</Text>
            {output.childTasks.map(childTask => (
              <TaskCard 
                key={childTask.id}
                task={childTask as any}
                onNavigateToTaskDetail={props.onNavigateToTaskDetail || (() => {})}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {output.actionItems.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 8 }}
        >
          <SafeAreaView edges={['bottom']}>
            <View className="flex-row gap-3 flex-wrap">
              {output.actionItems.map(action => (
                <ButtonPrimitive 
                  key={action.id} 
                  contract={mapActionItemToButtonProps(action)} 
                  onPress={() => handleActionPress(action.actionId)}
                />
              ))}
            </View>
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
}
