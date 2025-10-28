import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Task, SubTask, Priority, TaskStatus } from "../types/buildtrack";
import { cn } from "../utils/cn";
import { useAuthStore } from "../state/authStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { useUserStoreWithInit } from "../state/userStore.supabase";

// Type for task list items (can be Task or SubTask)
export type TaskListItem = Task | (SubTask & { isSubTask: true });

interface CompactTaskCardProps {
  task: TaskListItem;
  onNavigateToTaskDetail: (taskId: string, subTaskId?: string) => void;
}

export default function CompactTaskCard({ task, onNavigateToTaskDetail }: CompactTaskCardProps) {
  const { user } = useAuthStore();
  const taskStore = useTaskStore();
  const { getUserById } = useUserStoreWithInit();
  
  const isSubTask = 'isSubTask' in task && task.isSubTask;
  
  // Check if task is delegated (has delegation history)
  const isDelegated = task.delegationHistory && task.delegationHistory.length > 0;
  const lastDelegation = isDelegated && task.delegationHistory ? task.delegationHistory[task.delegationHistory.length - 1] : null;
  const delegatedFromUser = lastDelegation ? getUserById(lastDelegation.fromUserId) : null;
  
  // Check if task is new/unread
  const readStatus = taskStore.taskReadStatuses.find(
    s => s.userId === user?.id && s.taskId === task.id
  );
  const isNew = !readStatus || !readStatus.isRead;

  // Check if task is starred by current user
  const isStarred = task.starredByUsers?.includes(user.id) || false;

  const handleStarPress = (e: any) => {
    e.stopPropagation(); // Prevent opening task detail
    taskStore.toggleTaskStar(task.id, user.id);
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "critical": return "text-red-600 bg-red-50 border-red-200";
      case "high": return "text-orange-600 bg-orange-50 border-orange-200";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low": return "text-green-600 bg-green-50 border-green-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <Pressable
      onPress={() => {
        // Mark task as read when opened
        if (user && isNew) {
          taskStore.markTaskAsRead(user.id, task.id);
        }
        
        if (isSubTask) {
          onNavigateToTaskDetail(task.parentTaskId, task.id);
        } else {
          onNavigateToTaskDetail(task.id);
        }
      }}
      className="bg-white border border-gray-200 rounded-lg p-3 mb-2"
    >
      {/* Sub-task indicator */}
      {isSubTask && (
        <View className="flex-row items-center mb-2 bg-purple-50 -mx-3 -mt-3 px-3 py-2 rounded-t-lg">
          <Ionicons name="git-branch-outline" size={14} color="#7c3aed" />
          <Text className="text-sm text-purple-700 ml-2 font-semibold">Sub-task</Text>
        </View>
      )}
      
      {/* Delegation indicator */}
      {isDelegated && !isSubTask && (
        <View className="flex-row items-center mb-2 bg-amber-50 -mx-3 -mt-3 px-3 py-2 rounded-t-lg border-b border-amber-200">
          <Ionicons name="arrow-forward-circle" size={14} color="#f59e0b" />
          <Text className="text-sm text-amber-700 ml-2 font-medium">
            Delegated from {delegatedFromUser?.name || 'Unknown'}
          </Text>
          {lastDelegation?.reason && (
            <View className="ml-2 flex-1">
              <Text className="text-xs text-amber-600 italic" numberOfLines={1}>
                • {lastDelegation.reason}
              </Text>
            </View>
          )}
        </View>
      )}
      
      {/* Line 1: Title and Priority */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1 mr-2">
          <Text className="font-semibold text-gray-900 flex-1" numberOfLines={2}>
            {task.title}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {/* Star button for Today's Tasks */}
          <Pressable
            onPress={handleStarPress}
            className="mr-1 p-1"
          >
            <Ionicons
              name={isStarred ? "star" : "star-outline"}
              size={20}
              color={isStarred ? "#f59e0b" : "#9ca3af"}
            />
          </Pressable>
          <View className={cn("px-2 py-1 rounded", getPriorityColor(task.priority))}>
            <Text className="text-xs font-bold capitalize">
              {task.priority}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Line 2: Description */}
      {task.description && (
        <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
          {task.description}
        </Text>
      )}
      
      {/* Line 3: Due Date and Status */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="calendar-outline" size={14} color="#6b7280" />
          <Text className="text-sm text-gray-600 ml-1">
            {new Date(task.dueDate).toLocaleDateString()}
          </Text>
        </View>
        <Text className="text-sm text-gray-500">
          {task.currentStatus.replace("_", " ")} {task.completionPercentage}%
        </Text>
      </View>
    </Pressable>
  );
}

