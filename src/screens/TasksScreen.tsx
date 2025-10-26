import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { useUserStoreWithInit } from "../state/userStore.supabase";
import { useProjectStoreWithInit } from "../state/projectStore.supabase";
import { useProjectFilterStore } from "../state/projectFilterStore";
import { useCompanyStore } from "../state/companyStore";
import { Task, Priority, TaskStatus, SubTask } from "../types/buildtrack";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import LogoutFAB from "../components/LogoutFAB";

interface TasksScreenProps {
  onNavigateToTaskDetail: (taskId: string, subTaskId?: string) => void;
  onNavigateToCreateTask: () => void;
}

// Type for task list items (can be Task or SubTask)
type TaskListItem = Task | (SubTask & { isSubTask: true });

export default function TasksScreen({ 
  onNavigateToTaskDetail, 
  onNavigateToCreateTask 
}: TasksScreenProps) {
  const { user } = useAuthStore();
  const taskStore = useTaskStore();
  const tasks = taskStore.tasks;
  const userStore = useUserStoreWithInit();
  const { getUserById } = userStore;
  const projectStore = useProjectStoreWithInit();
  const { getProjectById } = projectStore;
  const { selectedProjectId, setSelectedProject } = useProjectFilterStore();
  const { getCompanyBanner } = useCompanyStore();

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  if (!user) return null;

  const banner = getCompanyBanner(user.companyId);

  
  // Filter tasks by selected project FIRST
  const projectFilteredTasks = selectedProjectId 
    ? tasks.filter(task => task.projectId === selectedProjectId)
    : tasks;

  // Helper function to recursively collect all subtasks assigned by a user
  const collectSubTasksAssignedBy = (subTasks: SubTask[] | undefined, userId: string): SubTask[] => {
    if (!subTasks) return [];
    
    const result: SubTask[] = [];
    for (const subTask of subTasks) {
      if (subTask.assignedBy === userId) {
        result.push(subTask);
      }
      // Recursively collect from nested subtasks
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
      // Recursively collect from nested subtasks
      if (subTask.subTasks) {
        result.push(...collectSubTasksAssignedTo(subTask.subTasks, userId));
      }
    }
    return result;
  };

  // For "My Tasks": Show parent tasks assigned to me + subtasks assigned to me (as individual tasks)
  // BUT: Don't show parent task if user is only assigned to its subtasks
  const myParentTasks = projectFilteredTasks.filter(task => {
    // Only include parent task if user is directly assigned to it
    const assignedTo = task.assignedTo || [];
    const isDirectlyAssigned = Array.isArray(assignedTo) && assignedTo.includes(user.id);
    
    // Check if user is assigned to any subtasks
    const hasAssignedSubtasks = collectSubTasksAssignedTo(task.subTasks, user.id).length > 0;
    
    // Include parent task only if directly assigned, regardless of subtask assignments
    // This prevents showing parent task when user is only assigned to subtasks
    return isDirectlyAssigned && !hasAssignedSubtasks;
  });
  
  const mySubTasks = projectFilteredTasks.flatMap(task => {
    // Only see subtasks assigned to the user
    return collectSubTasksAssignedTo(task.subTasks, user.id)
      .map(subTask => ({ ...subTask, isSubTask: true as const }));
  });
  const myTasks: TaskListItem[] = [...myParentTasks, ...mySubTasks];

  // For "Assigned Tasks": Show parent tasks assigned by me + subtasks assigned by me
  // Same logic: Don't show parent if user only assigned its subtasks
  const assignedParentTasks = projectFilteredTasks.filter(task => {
    const isDirectlyAssignedByMe = task.assignedBy === user.id;
    
    const hasSubtasksAssignedByMe = collectSubTasksAssignedBy(task.subTasks, user.id).length > 0;
    
    return isDirectlyAssignedByMe && !hasSubtasksAssignedByMe;
  });
  
  const assignedSubTasks = projectFilteredTasks.flatMap(task => 
    collectSubTasksAssignedBy(task.subTasks, user.id)
      .map(subTask => ({ ...subTask, isSubTask: true as const }))
  );
  const assignedTasks: TaskListItem[] = [...assignedParentTasks, ...assignedSubTasks];

  // Show all tasks (inbox + outbox combined)
  const currentTasks = [...myTasks, ...assignedTasks];

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

  // Filter tasks based on search only
  const filteredTasks = currentTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Sort tasks by priority (high to low) then by due date (earliest first)
  const sortedTasks = filteredTasks.sort((a, b) => {
    // First sort by priority
    const priorityA = getPriorityOrder(a.priority);
    const priorityB = getPriorityOrder(b.priority);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // If same priority, sort by due date (earliest first)
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // Group tasks by project
  const groupedTasks = sortedTasks.reduce((acc, task) => {
    const projectId = task.projectId;
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(task);
    return acc;
  }, {} as Record<string, TaskListItem[]>);

  // Sort projects by name
  const sortedProjectIds = Object.keys(groupedTasks).sort((a, b) => {
    const projectA = getProjectById(a);
    const projectB = getProjectById(b);
    return (projectA?.name || "").localeCompare(projectB?.name || "");
  });

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
      case "rejected": return "text-red-600 bg-red-50";
      case "not_started": return "text-gray-600 bg-gray-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };


  const CompactTaskCard = ({ task }: { task: TaskListItem }) => {
    const isSubTask = 'isSubTask' in task && task.isSubTask;
    
    // Check if task is new/unread
    const readStatus = taskStore.taskReadStatuses.find(
      (s: any) => s.userId === user?.id && s.taskId === task.id
    );
    const isNew = !readStatus || !readStatus.isRead;

    // Check if task is starred by current user
    const isStarred = task.starredByUsers?.includes(user.id) || false;

    const handleStarPress = (e: any) => {
      e.stopPropagation(); // Prevent opening task detail
      taskStore.toggleTaskStar(task.id, user.id);
    };

    return (
      <Pressable
        onPress={() => {
          // Mark task as read when opened
          if (user && isNew) {
            taskStore.markTaskAsRead(user.id, task.id);
          }
          
          // For subtasks, pass both parent taskId and subTaskId
          if (isSubTask) {
            onNavigateToTaskDetail(task.parentTaskId, task.id);
          } else {
            onNavigateToTaskDetail(task.id);
          }
        }}
        className="bg-white border border-gray-200 rounded-lg p-3 mb-2"
      >
        <View className="flex-row">
          {/* Photo on the left (only first photo) */}
          {task.attachments && task.attachments.length > 0 && (
            <View className="mr-3">
              <Image
                source={{ uri: task.attachments[0] }}
                className="w-20 h-20 rounded-lg"
                resizeMode="cover"
              />
              {task.attachments.length > 1 && (
                <View className="absolute bottom-1 right-1 bg-black/70 rounded px-1.5 py-0.5">
                  <Text className="text-white text-xs font-semibold">
                    +{task.attachments.length - 1}
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {/* Text content on the right */}
          <View className="flex-1">
            {/* Line 1: Title and Priority */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1 mr-2">
                {/* Sub-task indicator */}
                {isSubTask && (
                  <View className="mr-2">
                    <Ionicons name="git-branch-outline" size={12} color="#7c3aed" />
                  </View>
                )}
                {/* NEW badge */}
                {isNew && (
                  <View className="bg-red-500 px-1 py-0.5 rounded-full mr-2">
                    <Text className="text-white text-xs font-bold">NEW</Text>
                  </View>
                )}
                <Text className="font-semibold text-gray-900 flex-1" numberOfLines={2}>
                  {task.title}
                </Text>
              </View>
              <View className="flex-row items-center">
                {/* Star button for Today's Tasks */}
                <Pressable
                  onPress={handleStarPress}
                  className="mr-2 p-1"
                >
                  <Ionicons 
                    name={isStarred ? "star" : "star-outline"} 
                    size={20} 
                    color={isStarred ? "#f59e0b" : "#9ca3af"} 
                  />
                </Pressable>
                {/* Priority badge */}
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
          </View>
        </View>
      </Pressable>
    );
  };

  // Get all user projects for the picker
  const userProjects = projectStore.projects.filter((project: any) => 
    project.companyId === user.companyId
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Standard Header */}
      <StandardHeader 
        title="Tasks"
      />

      <View className="flex-1">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-lg px-4 py-3 mb-4">
          <Ionicons name="search-outline" size={24} color="#6b7280" />
          <TextInput
            className="flex-1 ml-3 text-gray-900 text-base"
            placeholder="Search tasks..."
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
        </View>

        {/* Project Picker */}
        <View className="mt-4">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Project</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              <Pressable
                onPress={() => setSelectedProject(null)}
                className={cn(
                  "px-4 py-2 rounded-full border mr-2",
                  !selectedProjectId
                    ? "bg-blue-600 border-blue-600"
                    : "bg-white border-gray-300"
                )}
              >
                <Text
                  className={cn(
                    "text-sm font-semibold",
                    !selectedProjectId
                      ? "text-white"
                      : "text-gray-600"
                  )}
                >
                  All Projects
                </Text>
              </Pressable>
              {userProjects.map((project) => (
                <Pressable
                  key={project.id}
                  onPress={() => setSelectedProject(project.id)}
                  className={cn(
                    "px-4 py-2 rounded-full border mr-2",
                    selectedProjectId === project.id
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white border-gray-300"
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-semibold",
                      selectedProjectId === project.id
                        ? "text-white"
                        : "text-gray-600"
                    )}
                  >
                    {project.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Task List */}
      <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
        {filteredTasks.length > 0 ? (
          sortedProjectIds.map((projectId) => {
            const project = getProjectById(projectId);
            const projectTasks = groupedTasks[projectId];
            
            return (
              <View key={projectId} className="mb-4">
                {/* Project Header */}
                <View className="flex-row items-center mb-3 bg-gray-100 px-4 py-3 rounded-lg">
                  <Ionicons name="folder-outline" size={22} color="#6b7280" />
                  <Text className="text-base font-bold text-gray-700 ml-2 flex-1">
                    {project?.name || "Unknown Project"}
                  </Text>
                  <View className="bg-gray-200 px-3 py-1 rounded">
                    <Text className="text-sm text-gray-600 font-semibold">
                      {projectTasks.length} task{projectTasks.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
                
                {/* Project Tasks */}
                {projectTasks.map((task) => (
                  <CompactTaskCard key={task.id} task={task} />
                ))}
              </View>
            );
          })
        ) : (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="clipboard-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 text-xl font-semibold mt-4">
              {searchQuery ? "No tasks found" : "No tasks yet"}
            </Text>
            <Text className="text-gray-400 text-base text-center mt-2 px-8">
              {searchQuery 
                ? "Try adjusting your search"
                : "No tasks found"
              }
            </Text>
          </View>
        )}
        </ScrollView>

        {/* Floating Action Button - New Task */}
        {console.log('TasksScreen - User role:', user.role)}
        {console.log('TasksScreen - Show FAB:', user.role !== "admin")}
        <Pressable
          onPress={onNavigateToCreateTask}
          className="absolute bottom-8 right-6 w-14 h-14 bg-orange-500 rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Ionicons name="add" size={28} color="white" />
        </Pressable>

        {/* Logout FAB */}
        <LogoutFAB />
      </View>
    </SafeAreaView>
  );
}// Force reload 1759505833
// Force reload: 1759506479
// Force reload: 1759506549
