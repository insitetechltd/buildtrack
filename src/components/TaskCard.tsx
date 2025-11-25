import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Task, Priority, TaskStatus } from "../types/buildtrack";
import { cn } from "../utils/cn";
import { useAuthStore } from "../state/authStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { useUserStoreWithInit } from "../state/userStore.supabase";
import { useThemeStore } from "../state/themeStore";

// ✅ UPDATED: Task can now have parentTaskId to indicate it's nested
interface TaskCardProps {
  task: Task;
  onNavigateToTaskDetail: (taskId: string, subTaskId?: string) => void;
  className?: string;
}

export default function TaskCard({ task, onNavigateToTaskDetail, className }: TaskCardProps) {
  const { user } = useAuthStore();
  const taskStore = useTaskStore();
  const { getUserById } = useUserStoreWithInit();
  const { isDarkMode } = useThemeStore();
  
  // Check if this is a nested task (has a parent)
  const isSubTask = !!task.parentTaskId;
  
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
  const isStarred = user ? (task.starredByUsers?.includes(user.id) || false) : false;
  
  // Get assigner and assignees
  const assigner = getUserById(task.assignedBy);
  const assignees = task.assignedTo.map((id: string) => getUserById(id)).filter(Boolean);
  
  // Check if task is 100% complete
  const isCompleted = task.completionPercentage === 100;

  // Get the most recent photo from task updates or attachments
  const getTaskPhoto = () => {
    console.log(`[TaskCard] Checking photos for task "${task.title}":`, {
      hasAttachments: !!task.attachments,
      attachmentsLength: task.attachments?.length || 0,
      attachments: task.attachments,
      hasUpdates: !!task.updates,
      updatesLength: task.updates?.length || 0,
      updatesWithPhotos: task.updates?.filter(u => u.photos && u.photos.length > 0).length || 0,
    });
    
    // First check if there are attachments (from initial task creation)
    if (task.attachments && task.attachments.length > 0) {
      console.log(`[TaskCard] ✅ Found attachment for "${task.title}":`, task.attachments[0]);
      return task.attachments[0];
    }
    
    // Otherwise, check for photos in task updates (most recent first)
    if (task.updates && task.updates.length > 0) {
      // Find the most recent update with photos
      for (let i = task.updates.length - 1; i >= 0; i--) {
        const update = task.updates[i];
        if (update.photos && update.photos.length > 0) {
          console.log(`[TaskCard] ✅ Found photo in update for "${task.title}":`, update.photos[0]);
          return update.photos[0];
        }
      }
    }
    
    console.log(`[TaskCard] ❌ No photos found for "${task.title}"`);
    return null;
  };

  const taskPhoto = getTaskPhoto();
  const totalPhotos = (task.attachments?.length || 0) + 
    (task.updates?.reduce((sum, update) => sum + (update.photos?.length || 0), 0) || 0);

  // Track if image failed to load
  const [imageError, setImageError] = useState(false);
  
  // Reset error state when photo URL changes
  useEffect(() => {
    setImageError(false);
  }, [taskPhoto]);

  const handleStarPress = (e: any) => {
    e.stopPropagation(); // Prevent opening task detail
    if (user) {
      taskStore.toggleTaskStar(task.id, user.id);
    }
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
        
        // Navigate directly to the task's detail page (works for both top-level and sub-tasks)
        // For sub-tasks, pass the sub-task ID as taskId and parentTaskId as context
        if (isSubTask && task.parentTaskId) {
          // Navigate to sub-task detail, passing parentTaskId for context if needed
          onNavigateToTaskDetail(task.id, undefined);
        } else {
          onNavigateToTaskDetail(task.id);
        }
      }}
      className={cn(
        "rounded-lg p-3 border",
        isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200",
        className || "mb-2"
      )}
    >
      {/* Rejection indicator - Show at top if task is rejected */}
      {task.currentStatus === "rejected" && (
        <View className={cn(
          "flex-row items-center mb-2 -mx-3 -mt-3 px-3 py-2 rounded-t-lg border-b",
          isDarkMode ? "bg-red-900/40 border-red-700" : "bg-red-50 border-red-200"
        )}>
          <Ionicons name="close-circle" size={14} color={isDarkMode ? "#fca5a5" : "#dc2626"} />
          <Text className={cn(
            "text-base ml-2 font-semibold",
            isDarkMode ? "text-red-300" : "text-red-700"
          )}>
            Rejected - Needs Rework
          </Text>
          {task.declineReason && (
            <View className="ml-2 flex-1">
              <Text className={cn(
                "text-sm italic",
                isDarkMode ? "text-red-400" : "text-red-600"
              )} numberOfLines={1}>
                • {task.declineReason}
              </Text>
            </View>
          )}
        </View>
      )}
      
      {/* Sub-task indicator */}
      {isSubTask && (
        <View className={cn(
          "flex-row items-center mb-2 -mx-3 -mt-3 px-3 py-2 rounded-t-lg",
          isDarkMode ? "bg-purple-900/40" : "bg-purple-50"
        )}>
          <Ionicons name="git-branch-outline" size={14} color={isDarkMode ? "#a78bfa" : "#7c3aed"} />
          <Text className={cn(
            "text-base ml-2 font-semibold",
            isDarkMode ? "text-purple-300" : "text-purple-700"
          )}>Sub-task</Text>
        </View>
      )}
      
      {/* Delegation indicator */}
      {isDelegated && !isSubTask && (
        <View className={cn(
          "flex-row items-center mb-2 -mx-3 -mt-3 px-3 py-2 rounded-t-lg border-b",
          isDarkMode ? "bg-amber-900/40 border-amber-700" : "bg-amber-50 border-amber-200"
        )}>
          <Ionicons name="arrow-forward-circle" size={14} color={isDarkMode ? "#fbbf24" : "#f59e0b"} />
          <Text className={cn(
            "text-base ml-2 font-medium",
            isDarkMode ? "text-amber-300" : "text-amber-700"
          )}>
            Delegated from {delegatedFromUser?.name || 'Unknown'}
          </Text>
          {lastDelegation?.reason && (
            <View className="ml-2 flex-1">
              <Text className={cn(
                "text-sm italic",
                isDarkMode ? "text-amber-400" : "text-amber-600"
              )} numberOfLines={1}>
                • {lastDelegation.reason}
              </Text>
            </View>
          )}
        </View>
      )}
      
      <View className="flex-row">
        {/* Text content */}
        <View className="flex-1">
          {/* Line 1: Star, Title */}
          <View className="flex-row items-center mb-2">
            {/* Star button */}
            <Pressable
              onPress={handleStarPress}
              className="mr-2"
            >
              <Ionicons
                name={isStarred ? "star" : "star-outline"}
                size={16}
                color={isStarred ? "#f59e0b" : "#9ca3af"}
              />
            </Pressable>
            <Text className={cn(
              "text-lg font-semibold flex-1",
              isDarkMode ? "text-white" : "text-gray-900"
            )} numberOfLines={1}>
              {task.title}
            </Text>
          </View>
      
          {/* Line 2: Due Date (left), Comp% (center), Priority (right) */}
          <View className="flex-row items-center justify-between mb-2">
            {/* Left: Due Date */}
            <Text className={cn(
              "text-sm",
              isDarkMode ? "text-slate-400" : "text-gray-600"
            )}>
              Due: {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
            
            {/* Center: Completion status with review states */}
            {isCompleted && task.reviewAccepted ? (
              // Green bubble: 100% and accepted by assigner
              <View className="bg-green-500 px-2 py-1 rounded-full flex-row items-center">
                <Ionicons name="checkmark-circle" size={12} color="white" />
                <Text className="text-white text-sm font-semibold ml-1">
                  Closed
                </Text>
              </View>
            ) : isCompleted && task.readyForReview ? (
              // Blue bubble: 100% and submitted for review
              <View className="bg-blue-500 px-2 py-1 rounded-full flex-row items-center">
                <Ionicons name="eye" size={12} color="white" />
                <Text className="text-white text-sm font-semibold ml-1">
                  Reviewing
                </Text>
              </View>
            ) : (
              // Plain text: 0-100% normal display
              <Text className={cn(
                "text-sm font-semibold",
                isDarkMode ? "text-slate-400" : "text-gray-500"
              )}>
                Comp. {task.completionPercentage}%
              </Text>
            )}
            
            {/* Right: Priority Badge */}
            <View className={cn("px-2 py-1 rounded", getPriorityColor(task.priority))}>
              <Text className="text-sm font-semibold capitalize">
                {task.priority}
              </Text>
            </View>
          </View>
      
          {/* Line 3: Assigner → Assignees */}
          <View className="flex-row items-center">
            <View className={cn(
              "w-4 h-4 rounded-full items-center justify-center mr-1",
              isDarkMode ? "bg-blue-900" : "bg-blue-100"
            )}>
              <Ionicons name="person" size={8} color={isDarkMode ? "#60a5fa" : "#3b82f6"} />
            </View>
            <Text className={cn(
              "text-sm mr-1 font-medium",
              isDarkMode ? "text-slate-300" : "text-gray-600"
            )} numberOfLines={1}>
              {assigner?.name || 'Unknown'}
            </Text>
            <Ionicons name="arrow-forward" size={10} color={isDarkMode ? "#64748b" : "#9ca3af"} />
            <View className={cn(
              "w-4 h-4 rounded-full items-center justify-center ml-1 mr-1",
              isDarkMode ? "bg-green-900" : "bg-green-100"
            )}>
              <Ionicons name="people" size={8} color={isDarkMode ? "#34d399" : "#10b981"} />
            </View>
            <Text className={cn(
              "text-sm flex-1 font-medium",
              isDarkMode ? "text-slate-300" : "text-gray-600"
            )} numberOfLines={1}>
              {assignees.length > 0 
                ? assignees.length === 1 
                  ? assignees[0]?.name 
                  : `${assignees[0]?.name} +${assignees.length - 1}`
                : 'Unassigned'
              }
            </Text>
          </View>
        </View>
        
        {/* Photo on the right (most recent photo from updates or attachments) */}
        {taskPhoto && (
          <View className="ml-3">
            {imageError ? (
              // Placeholder when image fails to load
              <View className={cn(
                "w-20 h-20 rounded-lg items-center justify-center",
                isDarkMode ? "bg-slate-700" : "bg-gray-200"
              )}>
                <Ionicons 
                  name="image-outline" 
                  size={32} 
                  color={isDarkMode ? "#64748b" : "#9ca3af"} 
                />
              </View>
            ) : (
              <Image
                source={{ uri: taskPhoto }}
                className="w-20 h-20 rounded-lg"
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            )}
            {totalPhotos > 1 && (
              <View className="absolute bottom-1 right-1 bg-black/70 rounded px-1.5 py-0.5">
                <Text className="text-white text-sm font-semibold">
                  +{totalPhotos - 1}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

