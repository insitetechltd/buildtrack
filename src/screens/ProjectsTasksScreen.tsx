import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useTaskStoreWithInit, useTaskStore } from "../state/taskStore";
import { useUserStoreWithInit } from "../state/userStore";
import { useProjectStoreWithInit, useProjectStore } from "../state/projectStore";
import { useProjectFilterStore } from "../state/projectFilterStore";
import { useCompanyStore } from "../state/companyStore";
import { Task, Priority, TaskStatus, SubTask, Project, ProjectStatus } from "../types/buildtrack";
import { cn } from "../utils/cn";
import CompanyBanner from "../components/CompanyBanner";

interface ProjectsTasksScreenProps {
  onNavigateToTaskDetail: (taskId: string, subTaskId?: string) => void;
  onNavigateToCreateTask: () => void;
}

// Type for task list items (can be Task or SubTask)
type TaskListItem = Task | (SubTask & { isSubTask: true });

export default function ProjectsTasksScreen({ 
  onNavigateToTaskDetail, 
  onNavigateToCreateTask 
}: ProjectsTasksScreenProps) {
  const { user } = useAuthStore();
  const taskStore = useTaskStoreWithInit();
  const tasks = taskStore.tasks;
  const userStore = useUserStoreWithInit();
  const { getUserById } = userStore;
  const projectStore = useProjectStoreWithInit();
  const { getProjectById, getProjectsByUser } = projectStore;
  const { selectedProjectId } = useProjectFilterStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all" | "inbox" | "outbox">("all");
  const [refreshing, setRefreshing] = useState(false);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Force stores to re-read from state
    useTaskStore.setState({ isLoading: taskStore.isLoading });
    useProjectStore.setState({ isLoading: projectStore.isLoading });
    
    // Simulate network delay for UX
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, []);

  if (!user) return null;


  // Get user's projects - filter by selected project if one is chosen
  const allUserProjects = getProjectsByUser(user.id);
  const userProjects = selectedProjectId 
    ? allUserProjects.filter(p => p.id === selectedProjectId)
    : allUserProjects;

  // No project-level filtering - show all user projects
  const filteredProjects = userProjects;

  // Helper function to recursively collect all subtasks assigned by a user
  const collectSubTasksAssignedBy = (subTasks: SubTask[] | undefined, userId: string): SubTask[] => {
    if (!subTasks) return [];
    
    const result: SubTask[] = [];
    for (const subTask of subTasks) {
      if (subTask.assignedBy === userId) {
        result.push(subTask);
      }
      if (subTask.subTasks) {
        result.push(...collectSubTasksAssignedBy(subTask.subTasks, userId));
      }
    }
    return result;
  };

  // Helper function to recursively collect all subtasks assigned to a user
  const collectSubTasksAssignedTo = (subTasks: SubTask[] | undefined, userId: string): SubTask[] => {
    if (!subTasks) return [];
    
    const result: SubTask[] = [];
    for (const subTask of subTasks) {
      const assignedTo = subTask.assignedTo || [];
      if (Array.isArray(assignedTo) && assignedTo.includes(userId)) {
        result.push(subTask);
      }
      if (subTask.subTasks) {
        result.push(...collectSubTasksAssignedTo(subTask.subTasks, userId));
      }
    }
    return result;
  };

  // Helper function to get priority order (lower number = higher priority)
  const getPriorityOrder = (priority: Priority): number => {
    switch (priority) {
      case "critical": return 1;
      case "high": return 2;
      case "medium": return 3;
      case "low": return 4;
      default: return 5;
    }
  };

  // Get all tasks across all projects in a flat list
  const getAllTasks = (): TaskListItem[] => {
    // Collect tasks from all user's projects
    const allProjectTasks = userProjects.flatMap(project => {
      const projectTasks = tasks.filter(task => task.projectId === project.id);

      // Get inbox tasks (tasks assigned to me)
      const myParentTasks = projectTasks.filter(task => {
        const assignedTo = task.assignedTo || [];
        const isDirectlyAssigned = Array.isArray(assignedTo) && assignedTo.includes(user.id);
        const hasAssignedSubtasks = collectSubTasksAssignedTo(task.subTasks, user.id).length > 0;
        return isDirectlyAssigned && !hasAssignedSubtasks;
      });
      
      const mySubTasks = projectTasks.flatMap(task => {
        return collectSubTasksAssignedTo(task.subTasks, user.id)
          .map(subTask => ({ ...subTask, isSubTask: true as const }));
      });
      
      const inboxTasks = [...myParentTasks, ...mySubTasks];
      
      // Get outbox tasks (tasks assigned by me)
      const assignedParentTasks = projectTasks.filter(task => {
        const isDirectlyAssignedByMe = task.assignedBy === user.id;
        const hasSubtasksAssignedByMe = collectSubTasksAssignedBy(task.subTasks, user.id).length > 0;
        return isDirectlyAssignedByMe && !hasSubtasksAssignedByMe;
      });
      
      const assignedSubTasks = projectTasks.flatMap(task => 
        collectSubTasksAssignedBy(task.subTasks, user.id)
          .map(subTask => ({ ...subTask, isSubTask: true as const }))
      );
      
      const outboxTasks = [...assignedParentTasks, ...assignedSubTasks];
      
      // Return tasks based on status filter
      if (statusFilter === "inbox") {
        return inboxTasks;
      } else if (statusFilter === "outbox") {
        return outboxTasks;
      } else {
        // For "all" or other status filters, return both inbox and outbox tasks
        // Use a Map to ensure unique tasks by ID
        const uniqueTasks = new Map();
        
        // Add inbox tasks
        inboxTasks.forEach(task => {
          uniqueTasks.set(task.id, task);
        });
        
        // Add outbox tasks (will overwrite if same ID, ensuring uniqueness)
        outboxTasks.forEach(task => {
          uniqueTasks.set(task.id, task);
        });
        
        return Array.from(uniqueTasks.values());
      }
    });

    // Apply search and status filters
    const filteredTasks = allProjectTasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           task.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Handle inbox/outbox filters (already handled in task collection)
      if (statusFilter === "inbox" || statusFilter === "outbox") {
        return matchesSearch;
      }
      
      // Handle regular status filters
      const matchesStatus = statusFilter === "all" || task.currentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort tasks by priority (high to low) then by due date (earliest first)
    return filteredTasks.sort((a, b) => {
      // First sort by priority
      const priorityA = getPriorityOrder(a.priority);
      const priorityB = getPriorityOrder(b.priority);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same priority, sort by due date (earliest first)
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  };

  const allTasks = getAllTasks();

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "critical": return "text-red-600 bg-red-50 border-red-200";
      case "high": return "text-orange-600 bg-orange-50 border-orange-200";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low": return "text-green-600 bg-green-50 border-green-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case "completed": return "text-green-600 bg-green-50";
      case "in_progress": return "text-blue-600 bg-blue-50";
      case "blocked": return "text-red-600 bg-red-50";
      case "not_started": return "text-gray-600 bg-gray-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const CompactTaskCard = ({ task }: { task: TaskListItem }) => {
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
            {/* NEW badge */}
            {isNew && (
              <View className="bg-red-500 px-1 py-0.5 rounded-full mr-2">
                <Text className="text-white text-xs font-bold">NEW</Text>
              </View>
            )}
            <Text className="font-semibold text-gray-900 flex-1">
              {task.title}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {/* Edit button for task creator or assignee */}
            {(task.assignedBy === user?.id || (task.assignedTo || []).includes(user?.id)) && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation(); // Prevent card navigation
                  if (isSubTask) {
                    onNavigateToTaskDetail(task.parentTaskId, task.id);
                  } else {
                    onNavigateToTaskDetail(task.id);
                  }
                }}
                className="w-6 h-6 items-center justify-center bg-blue-50 rounded"
              >
                <Ionicons name="pencil" size={12} color="#3b82f6" />
              </Pressable>
            )}
            <View className={cn("px-2 py-1 rounded", getPriorityColor(task.priority))}>
              <Text className="text-xs font-bold capitalize">
                {task.priority}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Line 2: Due Date and Status */}
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
  };


  const StatusFilterButton = ({ 
    status, 
    label 
  }: { 
    status: TaskStatus | "all" | "inbox" | "outbox"; 
    label: string 
  }) => (
    <Pressable
      onPress={() => setStatusFilter(status)}
      className={cn(
        "px-3 py-1 rounded-full border mr-2",
        statusFilter === status
          ? "bg-blue-600 border-blue-600"
          : "bg-white border-gray-300"
      )}
    >
      <Text
        className={cn(
          "text-sm font-semibold",
          statusFilter === status
            ? "text-white"
            : "text-gray-600"
        )}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Combined Company Banner + Header */}
      <View className="bg-white border-b border-gray-200">
        {/* Company Name + Screen Title */}
        <View className="px-6 py-4">
          {(() => {
            const banner = useCompanyStore.getState().getCompanyBanner(user.companyId);
            if (banner && banner.isVisible) {
              return (
                <View className="mb-2">
                  {banner.imageUri ? (
                    <Image
                      source={{ uri: banner.imageUri }}
                      style={{ width: '100%', height: 60 }}
                      resizeMode="cover"
                      className="rounded-lg"
                    />
                  ) : (
                    <Text 
                      style={{ 
                        color: banner.textColor,
                        fontSize: 20,
                        fontWeight: '700',
                      }}
                      numberOfLines={1}
                    >
                      {banner.text}
                    </Text>
                  )}
                </View>
              );
            }
            return null;
          })()}
          
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900">Tasks</Text>
            </View>
            {user.role !== "admin" && (
              <Pressable
                onPress={onNavigateToCreateTask}
                className="w-10 h-10 bg-blue-600 rounded-full items-center justify-center"
              >
                <Ionicons name="add" size={24} color="white" />
              </Pressable>
            )}
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
            <Ionicons name="search-outline" size={18} color="#6b7280" />
            <TextInput
              className="flex-1 ml-2 text-gray-900 text-sm"
              placeholder="Search tasks..."
              value={searchQuery}
              onChangeText={handleSearchChange}
            />
          </View>

          {/* Status Filters */}
          <View className="mt-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">Filter</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                <StatusFilterButton status="all" label="All" />
                <StatusFilterButton status="inbox" label="Inbox" />
                <StatusFilterButton status="outbox" label="Outbox" />
                <StatusFilterButton status="not_started" label="Not Started" />
                <StatusFilterButton status="in_progress" label="In Progress" />
                <StatusFilterButton status="blocked" label="Blocked" />
                <StatusFilterButton status="completed" label="Completed" />
              </View>
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Filters */}
      <View className="bg-white border-b border-gray-200 px-6 py-2">
        <Text className="text-sm font-bold text-gray-700 mb-2">Task Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row">
            <StatusFilterButton status="all" label="All" />
            <StatusFilterButton status="not_started" label="Not Started" />
            <StatusFilterButton status="in_progress" label="In Progress" />
            <StatusFilterButton status="blocked" label="Blocked" />
            <StatusFilterButton status="completed" label="Completed" />
          </View>
        </ScrollView>
      </View>

      {/* Flat Tasks List */}
      <ScrollView 
        className="flex-1 px-6 py-4" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {allTasks.length > 0 ? (
          <>
            <Text className="text-sm text-gray-600 font-semibold mb-3">
              {allTasks.length} task{allTasks.length !== 1 ? "s" : ""}
            </Text>
            {allTasks.map((task) => (
              <CompactTaskCard key={task.id} task={task} />
            ))}
          </>
        ) : (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="clipboard-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              {searchQuery || statusFilter !== "all" ? "No matching tasks" : "No tasks yet"}
            </Text>
            <Text className="text-gray-400 text-center mt-2 px-8">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "You haven't been assigned any tasks yet"
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
