import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, Linking, ScrollView, Alert, Animated, Dimensions } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { Task, Priority, TaskStatus } from "../types/buildtrack";
import { cn } from "../utils/cn";
import { useAuthStore } from "../state/authStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { useUserStoreWithInit } from "../state/userStore.supabase";
import { useThemeStore } from "../state/themeStore";
import { useTranslation } from "../utils/useTranslation";
import { useDateFormatter } from "../utils/dateFormatter";
import CachedImage from "./CachedImage";
import { isDesktop } from "../utils/platformUtils";

// ✅ UPDATED: Task can now have parentTaskId to indicate it's nested
interface TaskCardProps {
  task: Task;
  onNavigateToTaskDetail: (taskId: string, subTaskId?: string) => void;
  className?: string;
}

export default function TaskCard({ task, onNavigateToTaskDetail, className }: TaskCardProps) {
  const t = useTranslation();
  const dateFormatter = useDateFormatter();
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

  // Get all photos from task updates and attachments
  const getAllTaskPhotos = () => {
    const photos: string[] = [];
    
    // Add attachments (from initial task creation)
    if (task.attachments && task.attachments.length > 0) {
      photos.push(...task.attachments);
    }
    
    // Add photos from task updates (most recent first)
    if (task.updates && task.updates.length > 0) {
      for (let i = task.updates.length - 1; i >= 0; i--) {
        const update = task.updates[i];
        if (update.photos && update.photos.length > 0) {
          photos.push(...update.photos);
        }
      }
    }
    
    return photos;
  };

  const taskPhotos = getAllTaskPhotos();

  // Track which images failed to load
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  
  // Reset error state when photos change
  useEffect(() => {
    setImageErrors(new Set());
  }, [taskPhotos.length]);
  
  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  };

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

  const getStatusColor = (status: TaskStatus | string | undefined) => {
    if (!status) return "text-gray-600 bg-gray-50 border-gray-200";
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case "approved":
      case "completed":
      case "accepted":
        return "text-green-700 bg-green-50 border-green-200";
      case "in_progress":
      case "wip":
        return "text-blue-700 bg-blue-50 border-blue-200";
      case "submitted_for_review":
      case "reviewing":
        return "text-purple-700 bg-purple-50 border-purple-200";
      case "rejected":
      case "declined":
        return "text-red-700 bg-red-50 border-red-200";
      case "new":
      case "assigned":
        return "text-amber-700 bg-amber-50 border-amber-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  const formatStatus = (status: TaskStatus | string | undefined) => {
    if (!status) return "New";
    return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  // Swipeable ref
  const swipeableRef = useRef<Swipeable>(null);

  // Check permissions for archive and delete
  const isTaskCreator = user && String(task.assignedBy) === String(user.id);
  const isAssignee = user && Array.isArray(task.assignedTo) && task.assignedTo.includes(user.id);
  const isAssigner = user && String(task.assignedBy) === String(user.id);
  const canArchive = task.status === 'approved' && (isAssigner || isAssignee) && !task.archivedAt;
  const canDelete = isTaskCreator && !task.deletedAt;

  // Archive handler
  const handleArchive = async () => {
    if (!user || !canArchive) return;
    
    Alert.alert(
      'Archive Task',
      'Are you sure you want to archive this task?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => swipeableRef.current?.close() },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await taskStore.archiveTask(task.id, user.id);
              Alert.alert('Success', 'Task archived successfully.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to archive task.');
            }
          },
        },
      ]
    );
  };

  // Delete handler
  const handleDelete = async () => {
    if (!user || !canDelete) return;
    
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? The task will be hidden from both you and the assignee, but will remain in the database for audit purposes.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => swipeableRef.current?.close() },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await taskStore.deleteTaskById(task.id, user.id);
              Alert.alert('Success', 'Task deleted successfully.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete task.');
            }
          },
        },
      ]
    );
  };

  // Render right action (delete - swipe left)
  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    if (!canDelete) return null;

    return (
      <View style={{ flexDirection: 'row', height: '100%', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
        <Pressable
          onPress={handleDelete}
          style={{ 
            width: 100,
            marginLeft: 8,
            marginTop: 0,
            backgroundColor: '#dc2626',
            borderRadius: 8, // rounded-lg = 8px
            borderWidth: 1, // border class = 1px (matches card border)
            borderColor: 'transparent', // border but transparent
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%', // Match full height - padding is internal to card, not part of outer dimensions
          }}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="trash-outline" size={32} color="white" />
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginTop: 6 }}>Delete</Text>
          </View>
        </Pressable>
      </View>
    );
  };

  // Render left action (archive - swipe right)
  const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    if (!canArchive) return null;

    return (
      <View style={{ flexDirection: 'row', height: '100%', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
        <Pressable
          onPress={handleArchive}
          style={{ 
            width: 100,
            marginRight: 8,
            marginTop: 0,
            backgroundColor: '#2563eb',
            borderRadius: 8, // rounded-lg = 8px
            borderWidth: 1, // border class = 1px (matches card border)
            borderColor: 'transparent', // border but transparent
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%', // Match full height - padding is internal to card, not part of outer dimensions
          }}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="archive-outline" size={32} color="white" />
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginTop: 6 }}>Archive</Text>
          </View>
        </Pressable>
      </View>
    );
  };

  // Determine if card should have margin (only when not in Swipeable)
  const cardMarginClass = (canArchive || canDelete) ? "" : (className || "mb-2");
  // Cache platform detection to prevent re-renders
  const isDesktopPlatform = React.useMemo(() => isDesktop(), []);

  const cardContent = (
    <View className={cn("relative", cardMarginClass)}>
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
        cardMarginClass
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
    
        {/* Line 2: Due Date, Status, Priority, and Completion */}
        <View className="flex-row items-center justify-between mb-2 flex-wrap gap-2">
          {/* Left: Due Date */}
          <Text className={cn(
            "text-sm",
            isDarkMode ? "text-slate-400" : "text-gray-600"
          )}>
            {t.taskDetail.due}: {dateFormatter.formatDate(task.dueDate, { month: 'short', day: 'numeric' })}
          </Text>
          
          {/* Right side: Status, Priority, and Completion in a row */}
          <View className="flex-row items-center gap-2">
            {/* Status Badge */}
            <View className={cn("px-2 py-0.5 rounded border", getStatusColor(task.status || task.currentStatus))}>
              <Text className="text-xs font-semibold capitalize">
                {formatStatus(task.status || task.currentStatus)}
              </Text>
            </View>
            
            {/* Priority Badge */}
            <View className={cn("px-2 py-0.5 rounded border", getPriorityColor(task.priority))}>
              <Text className="text-xs font-semibold capitalize">
                {task.priority}
              </Text>
            </View>
            
            {/* Completion percentage */}
            {isCompleted && task.reviewAccepted ? (
              // Green bubble: 100% and accepted by assigner
              <View className="bg-green-500 px-2 py-0.5 rounded-full flex-row items-center">
                <Ionicons name="checkmark-circle" size={10} color="white" />
                <Text className="text-white text-xs font-semibold ml-1">
                  {task.completionPercentage}%
                </Text>
              </View>
            ) : isCompleted && task.readyForReview ? (
              // Blue bubble: 100% and submitted for review
              <View className="bg-blue-500 px-2 py-0.5 rounded-full flex-row items-center">
                <Ionicons name="eye" size={10} color="white" />
                <Text className="text-white text-xs font-semibold ml-1">
                  {task.completionPercentage}%
                </Text>
              </View>
            ) : (
              // Plain text: 0-100% normal display
              <Text className={cn(
                "text-xs font-semibold",
                isDarkMode ? "text-slate-400" : "text-gray-500"
              )}>
                {task.completionPercentage}%
              </Text>
            )}
          </View>
        </View>
    
        {/* Line 3: Assigner → Assignees */}
        <View className="flex-row items-center">
          {/* Assigner - Clickable to call */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation(); // Prevent opening task detail
              if (assigner?.phone) {
                Linking.openURL(`tel:${assigner.phone}`).catch((err) => {
                  console.error('Failed to open phone dialer:', err);
                });
              }
            }}
            disabled={!assigner?.phone}
            className="flex-row items-center"
          >
            <View className={cn(
              "w-4 h-4 rounded-full items-center justify-center mr-1",
              isDarkMode ? "bg-blue-900" : "bg-blue-100"
            )}>
              <Ionicons name="person" size={8} color={isDarkMode ? "#60a5fa" : "#3b82f6"} />
            </View>
            <Text className={cn(
              "text-sm mr-1 font-medium",
              isDarkMode ? "text-slate-300" : "text-gray-600",
              assigner?.phone ? "underline" : ""
            )} numberOfLines={1}>
              {assigner?.name || 'Unknown'}
            </Text>
          </Pressable>
          <Ionicons name="arrow-forward" size={10} color={isDarkMode ? "#64748b" : "#9ca3af"} />
          {/* Assignees - Clickable to call (first assignee only) */}
          {assignees.length > 0 ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation(); // Prevent opening task detail
                if (assignees[0]?.phone) {
                  Linking.openURL(`tel:${assignees[0].phone}`).catch((err) => {
                    console.error('Failed to open phone dialer:', err);
                  });
                }
              }}
              disabled={!assignees[0]?.phone}
              className="flex-row items-center flex-1"
            >
              <View className={cn(
                "w-4 h-4 rounded-full items-center justify-center ml-1 mr-1",
                isDarkMode ? "bg-green-900" : "bg-green-100"
              )}>
                <Ionicons name="people" size={8} color={isDarkMode ? "#34d399" : "#10b981"} />
              </View>
              <Text className={cn(
                "text-sm flex-1 font-medium",
                isDarkMode ? "text-slate-300" : "text-gray-600",
                assignees[0]?.phone ? "underline" : ""
              )} numberOfLines={1}>
                {assignees.length === 1 
                  ? assignees[0]?.name 
                  : `${assignees[0]?.name} +${assignees.length - 1}`
                }
              </Text>
            </Pressable>
          ) : (
            <View className="flex-row items-center flex-1">
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
                Unassigned
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Photos section - Only show when there are photos */}
      {taskPhotos.length > 0 && (
        <View className={cn(
          "mt-3 pt-3 border-t",
          isDarkMode ? "border-slate-700" : "border-gray-200"
        )}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 4 }}
          >
            <View className="flex-row gap-2">
              {taskPhotos.slice(0, 5).map((photo, index) => (
                <View key={index} className="relative">
                  {imageErrors.has(index) ? (
                    <View className={cn(
                      "w-14 h-14 rounded-lg items-center justify-center",
                      isDarkMode ? "bg-slate-700" : "bg-gray-200"
                    )}>
                      <Ionicons 
                        name="image-outline" 
                        size={20} 
                        color={isDarkMode ? "#64748b" : "#9ca3af"} 
                      />
                    </View>
                  ) : (
                    <CachedImage
                      uri={photo}
                      className="w-14 h-14 rounded-lg"
                      resizeMode="cover"
                      onError={() => handleImageError(index)}
                    />
                  )}
                  {index === 4 && taskPhotos.length > 5 && (
                    <View className="absolute inset-0 bg-black/50 rounded-lg items-center justify-center">
                      <Text className="text-white text-xs font-semibold">
                        +{taskPhotos.length - 5}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
      </Pressable>
      
      {/* Desktop action buttons (shown on macOS/desktop instead of swipe) */}
      {isDesktopPlatform && (canArchive || canDelete) && (
        <View className="absolute top-3 right-3 flex-row gap-2 z-10">
          {canArchive && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation(); // Prevent opening task detail
                handleArchive();
              }}
              className={cn(
                "w-9 h-9 items-center justify-center rounded-lg",
                isDarkMode ? "bg-blue-600" : "bg-blue-500"
              )}
            >
              <Ionicons name="archive-outline" size={18} color="white" />
            </Pressable>
          )}
          {canDelete && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation(); // Prevent opening task detail
                handleDelete();
              }}
              className={cn(
                "w-9 h-9 items-center justify-center rounded-lg",
                isDarkMode ? "bg-red-600" : "bg-red-500"
              )}
            >
              <Ionicons name="trash-outline" size={18} color="white" />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );

  // Wrap in Swipeable if user can archive or delete AND on touch device
  if (!isDesktopPlatform && (canArchive || canDelete)) {
    return (
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={canArchive ? renderLeftActions : undefined}
        renderRightActions={canDelete ? renderRightActions : undefined}
        leftThreshold={40}
        rightThreshold={40}
        overshootLeft={false}
        overshootRight={false}
      >
        {cardContent}
      </Swipeable>
    );
  }

  // Return without swipeable if no actions available or on desktop
  return cardContent;
}

