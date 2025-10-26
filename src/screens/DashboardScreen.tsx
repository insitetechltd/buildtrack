import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { useProjectStoreWithInit } from "../state/projectStore.supabase";
import { useProjectFilterStore } from "../state/projectFilterStore";
import { useCompanyStore } from "../state/companyStore";
import { useTranslation } from "../utils/useTranslation";
import { Task, Priority, SubTask } from "../types/buildtrack";
import { cn } from "../utils/cn";
import { LoadingIndicator } from "../components/LoadingIndicator";
import StandardHeader from "../components/StandardHeader";
import ModalHandle from "../components/ModalHandle";
import ExpandableUtilityFAB from "../components/ExpandableUtilityFAB";

interface DashboardScreenProps {
  onNavigateToTasks: () => void;
  onNavigateToCreateTask: () => void;
  onNavigateToProfile: () => void;
  onNavigateToReports?: () => void;
  onNavigateToTaskDetail?: (taskId: string, subTaskId?: string) => void;
}

export default function DashboardScreen({ 
  onNavigateToTasks, 
  onNavigateToCreateTask, 
  onNavigateToProfile,
  onNavigateToReports,
  onNavigateToTaskDetail
}: DashboardScreenProps) {
  const { user } = useAuthStore();
  const taskStore = useTaskStore();
  const tasks = taskStore.tasks;
  const { fetchTasks, getStarredTasks, toggleTaskStar } = taskStore;
  const projectStore = useProjectStoreWithInit();
  const { getProjectsByUser, getProjectById, fetchProjects, fetchUserProjectAssignments } = projectStore;
  const { selectedProjectId, setSelectedProject, setSectionFilter, setStatusFilter, getLastSelectedProject } = useProjectFilterStore();
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const t = useTranslation();

  // Get projects user is participating in
  const userProjects = user ? getProjectsByUser(user.id) : [];

  // Smart project selection logic - Run only on mount or when user/projects change
  useEffect(() => {
    if (!user) return;
    
    const userProjectCount = userProjects.length;
    
    console.log(`🎯 Smart Project Selection for ${user.name}:`);
    console.log(`   - User projects: ${userProjectCount}`);
    console.log(`   - Current selection: ${selectedProjectId || 'none'}`);
    
    // Case 1: User has no projects → Clear selection
    if (userProjectCount === 0) {
      console.log(`   → No projects assigned, clearing selection`);
      if (selectedProjectId !== null) {
        setSelectedProject(null, user.id);
      }
      return;
    }
    
    // Case 2: Check if current selection is still valid
    if (selectedProjectId) {
      const isUserInProject = userProjects.some(p => p.id === selectedProjectId);
      if (isUserInProject) {
        console.log(`   → Current selection is valid, keeping it`);
        return; // Keep current selection
      } else {
        console.log(`   → Current selection invalid, will auto-select`);
      }
    }
    
    // Case 3: User has exactly 1 project → Auto-select it
    if (userProjectCount === 1) {
      const singleProject = userProjects[0];
      if (selectedProjectId !== singleProject.id) {
        console.log(`   → Only 1 project, auto-selecting: ${singleProject.name}`);
        setSelectedProject(singleProject.id, user.id);
      }
      return;
    }
    
    // Case 4: User has multiple projects → Use last selected for this user
    if (userProjectCount > 1) {
      const lastSelected = getLastSelectedProject(user.id);
      
      // Verify last selected is still valid for this user
      const isLastSelectedValid = lastSelected && userProjects.some(p => p.id === lastSelected);
      
      if (isLastSelectedValid && selectedProjectId !== lastSelected) {
        console.log(`   → Multiple projects, using last selected for user`);
        setSelectedProject(lastSelected, user.id);
      } else if (!isLastSelectedValid && selectedProjectId !== null) {
        console.log(`   → Multiple projects, no valid last selection`);
        console.log(`   → User must manually select from picker`);
        setSelectedProject(null, user.id);
      }
    }
  }, [user?.id, userProjects.length]); // Only depend on user ID and project count to avoid infinite loop

  // Fetch tasks when Dashboard mounts
  useEffect(() => {
    if (user) {
      console.log('Dashboard: Fetching tasks for user:', user.id);
      fetchTasks();
    }
  }, [user, fetchTasks]);

  // Manual refresh function
  const handleRefresh = async () => {
    if (!user) return;
    
    console.log('🔄 Manual refresh triggered from Dashboard...');
    
    try {
      await Promise.all([
        fetchProjects(),
        fetchUserProjectAssignments(user.id),
        taskStore.fetchTasks()
      ]);
      console.log('✅ Manual refresh completed');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
    }
  };

  // Auto-refresh data on component mount
  useEffect(() => {
    if (user) {
      console.log('🔄 Auto-refreshing data on Dashboard mount...');
      handleRefresh();
    }
  }, [user]);

  if (!user) return null;

  // Only show project statistics when a project is selected
  const activeProjects = selectedProjectId && selectedProjectId !== "" ? userProjects.filter(p => p.status === "active") : [];
  const planningProjects = selectedProjectId && selectedProjectId !== "" ? userProjects.filter(p => p.status === "planning") : [];
  
  // Get selected project name for display
  const selectedProject = selectedProjectId ? getProjectById(selectedProjectId) : null;

  // Filter tasks by selected project - show NO tasks when no project is selected
  const projectFilteredTasks = selectedProjectId && selectedProjectId !== ""
    ? tasks.filter(task => task.projectId === selectedProjectId)
    : []; // Show no tasks when no project is selected

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

  // Section 1: My Tasks - Tasks I assigned to MYSELF (self-assigned only)
  // These are tasks where I am both the creator AND the assignee
  const myTasks = projectFilteredTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
    const isCreatedByMe = task.assignedBy === user.id;
    
    // Include if assigned to me AND created by me (self-assigned)
    return isAssignedToMe && isCreatedByMe;
  });

  const mySubTasks = projectFilteredTasks.flatMap(task => {
    // Only include subtasks I created and assigned to myself
    return collectSubTasksAssignedTo(task.subTasks, user.id)
      .filter(subTask => subTask.assignedBy === user.id)
      .map(subTask => ({ ...subTask, isSubTask: true as const }));
  });

  const myAllTasks = [...myTasks, ...mySubTasks];
  
  // Helper function to check if a task is overdue
  const isOverdue = (task: any) => {
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    return dueDate < now;
  };

  // New categorization logic for My Tasks (includes self-assigned + assigned by others)
  // Note: Self-assigned tasks auto-accept, so no "Incoming" needed
  
  // 1.1 WIP: Tasks in progress (accepted, not complete, not overdue)
  const myWIPTasks = myAllTasks.filter(task => 
    task.accepted && 
    task.completionPercentage < 100 &&
    !isOverdue(task) &&
    task.currentStatus !== "rejected"
  );
  
  // 1.2 Done: Tasks completed (includes self-completed without review)
  const myDoneTasks = myAllTasks.filter(task => 
    task.completionPercentage === 100 &&
    task.currentStatus !== "rejected"
  );
  
  // 1.3 Overdue: Tasks past due date but not completed
  const myOverdueTasks = myAllTasks.filter(task => 
    task.completionPercentage < 100 && 
    isOverdue(task) &&
    task.currentStatus !== "rejected"
  );
  
  // 1.4 Rejected: Tasks I assigned to others that were rejected
  // Get tasks from outbox that were rejected
  const myRejectedTasks = projectFilteredTasks.filter(task => {
    const isCreatedByMe = task.assignedBy === user.id;
    return isCreatedByMe && task.currentStatus === "rejected";
  });

  // Section 2: Inbox - Tasks assigned to me by others (need acceptance)
  // These are tasks where others assigned them to me, but I didn't create them
  const inboxTasks = projectFilteredTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
    const isCreatedByMe = task.assignedBy === user.id;
    
    // Include if assigned to me but NOT created by me
    return isAssignedToMe && !isCreatedByMe;
  });

  const inboxSubTasks = projectFilteredTasks.flatMap(task => {
    // Only include subtasks assigned to me but NOT created by me
    return collectSubTasksAssignedTo(task.subTasks, user.id)
      .filter(subTask => subTask.assignedBy !== user.id)
      .map(subTask => ({ ...subTask, isSubTask: true as const }));
  });

  const inboxAllTasks = [...inboxTasks, ...inboxSubTasks];
  
  // Apply same categorization logic to inbox tasks
  // 2.1 Received: Tasks assigned to me but not accepted yet
  const inboxReceivedTasks = inboxAllTasks.filter(task => 
    !task.accepted && task.currentStatus !== "rejected"
  );
  
  // 2.2 WIP: Tasks I've accepted, either in progress OR completed but not submitted for review
  const inboxWIPTasks = inboxAllTasks.filter(task => 
    task.accepted && 
    !isOverdue(task) &&
    task.currentStatus !== "rejected" &&
    (
      task.completionPercentage < 100 || // Still in progress
      (task.completionPercentage === 100 && !task.readyForReview) // Completed but not submitted
    )
  );
  
  // 2.3 Reviewing: Tasks at 100% submitted for review (pending approval)
  const inboxReviewingTasks = inboxAllTasks.filter(task => 
    task.completionPercentage === 100 &&
    task.readyForReview === true &&
    task.reviewAccepted !== true
  );
  
  // 2.4 Done: Tasks where the assigner has accepted completion
  const inboxDoneTasks = inboxAllTasks.filter(task => 
    task.completionPercentage === 100 &&
    task.reviewAccepted === true
  );
  
  // 2.5 Overdue: Tasks past due date but not completed
  const inboxOverdueTasks = inboxAllTasks.filter(task => 
    task.completionPercentage < 100 && 
    isOverdue(task) &&
    task.currentStatus !== "rejected"
  );
  
  // Section 3: Outbox - Tasks I assigned to others
  // These are tasks where I created them and assigned them to others (not myself)
  const outboxTasks = projectFilteredTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
    const isCreatedByMe = task.assignedBy === user.id;
    
    // Include if created by me but NOT assigned to me (assigned to others)
    // Exclude rejected tasks (they auto-reassign to creator and show in My Tasks)
    return isCreatedByMe && !isAssignedToMe && task.currentStatus !== "rejected";
  });

  const outboxSubTasks = projectFilteredTasks.flatMap(task => {
    // Only include subtasks created by me but NOT assigned to me
    return collectSubTasksAssignedBy(task.subTasks, user.id)
      .filter(subTask => {
        const assignedTo = subTask.assignedTo || [];
        const isAssignedToMe = !Array.isArray(assignedTo) || !assignedTo.includes(user.id);
        // Exclude rejected subtasks (they auto-reassign to creator and show in My Tasks)
        return isAssignedToMe && subTask.currentStatus !== "rejected";
      })
      .map(subTask => ({ ...subTask, isSubTask: true as const }));
  });

  const outboxAllTasks = [...outboxTasks, ...outboxSubTasks];
  
  // Apply same categorization logic to outbox tasks
  // 3.1 Assigned: Tasks I assigned but assignee hasn't accepted yet
  const outboxAssignedTasks = outboxAllTasks.filter(task => 
    !task.accepted && task.currentStatus !== "rejected"
  );
  
  // 3.2 WIP: Tasks assignee has accepted, either in progress OR completed but not submitted for review
  const outboxWIPTasks = outboxAllTasks.filter(task => 
    task.accepted && 
    !isOverdue(task) &&
    task.currentStatus !== "rejected" &&
    (
      task.completionPercentage < 100 || // Still in progress
      (task.completionPercentage === 100 && !task.readyForReview) // Completed but not submitted
    )
  );
  
  // 3.3 Reviewing: Tasks at 100% submitted for my review (pending my approval)
  const outboxReviewingTasks = outboxAllTasks.filter(task => 
    task.completionPercentage === 100 &&
    task.readyForReview === true &&
    task.reviewAccepted !== true
  );
  
  // 3.4 Done: Tasks where I've accepted completion
  const outboxDoneTasks = outboxAllTasks.filter(task => 
    task.completionPercentage === 100 &&
    task.reviewAccepted === true
  );
  
  // 3.5 Overdue: Tasks past due date but not completed
  const outboxOverdueTasks = outboxAllTasks.filter(task => 
    task.completionPercentage < 100 && 
    isOverdue(task) &&
    task.currentStatus !== "rejected"
  );

  // Debug logging to understand task counts
  console.log('🔍 Dashboard Task Analysis:', {
    userId: user.id,
    userName: user.name,
    selectedProjectId: selectedProjectId,
    totalTasks: tasks.length,
    projectFilteredTasks: projectFilteredTasks.length,
    myTasksCount: myAllTasks.length,
    inboxTasksCount: inboxAllTasks.length,
    outboxTasksCount: outboxAllTasks.length,
    allTasksDetails: tasks.map(t => ({ 
      id: t.id, 
      title: t.title, 
      projectId: t.projectId,
      assignedBy: t.assignedBy, 
      assignedTo: t.assignedTo 
    })),
    myTasksDetails: myAllTasks.map(t => ({ id: t.id, title: t.title, assignedBy: t.assignedBy, assignedTo: t.assignedTo })),
    inboxTasksDetails: inboxAllTasks.map(t => ({ id: t.id, title: t.title, assignedBy: t.assignedBy, assignedTo: t.assignedTo })),
    outboxTasksDetails: outboxAllTasks.map(t => ({ id: t.id, title: t.title, assignedBy: t.assignedBy, assignedTo: t.assignedTo }))
  });

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "critical": return "text-red-600 bg-red-50";
      case "high": return "text-orange-600 bg-orange-50";
      case "medium": return "text-yellow-600 bg-yellow-50";
      case "low": return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600";
      case "in_progress": return "text-blue-600";
      case "rejected": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const StatCard = ({ 
    title, 
    count, 
    icon, 
    color = "bg-blue-50", 
    iconColor = "#3b82f6",
    onPress 
  }: {
    title: string;
    count: number;
    icon: string;
    color?: string;
    iconColor?: string;
    onPress?: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      className={cn("flex-1 p-4 rounded-xl", color)}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Ionicons name={icon as any} size={24} color={iconColor} />
        <Text className="text-2xl font-bold text-gray-900">{count}</Text>
      </View>
      <Text className="text-sm text-gray-600">{title}</Text>
    </Pressable>
  );

  const TaskPreviewCard = ({ task }: { task: Task }) => (
    <Pressable className="bg-white border border-gray-200 rounded-lg p-5 mb-3">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="font-bold text-gray-900 text-lg mb-2" numberOfLines={2}>
            {task.title}
          </Text>
          <Text className="text-base text-gray-600" numberOfLines={2}>
            {task.description}
          </Text>
        </View>
        <View className={cn("px-4 py-2 rounded ml-3", getPriorityColor(task.priority))}>
          <Text className="text-sm font-bold capitalize">
            {task.priority}
          </Text>
        </View>
      </View>
      
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons 
            name="time-outline" 
            size={20} 
            color="#6b7280" 
          />
          <Text className="text-sm text-gray-500 ml-2 font-semibold">
            Due {new Date(task.dueDate).toLocaleDateString()}
          </Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-gray-300 mr-2" />
          <Text className={cn("text-sm font-bold capitalize", getStatusColor(task.currentStatus))}>
            {task.currentStatus.replace("_", " ")}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View className="mt-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm text-gray-600 font-semibold">Progress</Text>
          <Text className="text-sm text-gray-600 font-bold">{task.completionPercentage}%</Text>
        </View>
        <View className="w-full bg-gray-200 rounded-full h-3">
          <View 
            className="bg-blue-600 h-3 rounded-full" 
            style={{ width: `${task.completionPercentage}%` }}
          />
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      <LoadingIndicator 
        isLoading={projectStore.isLoading || taskStore.isLoading} 
        text="Syncing data..." 
      />
      
      {/* Standard Header */}
      <StandardHeader 
        title={t.nav.dashboard}
        rightElement={
          <View className="flex-row items-center">
            <Text className="text-base font-medium text-gray-700 mr-2">
              {user.name} ({user.role})
            </Text>
            <Pressable 
              onPress={onNavigateToProfile}
              className="w-10 h-10 items-center justify-center"
            >
              <Ionicons name="person-circle-outline" size={32} color="#3b82f6" />
            </Pressable>
          </View>
        }
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Project Filter Picker */}
        <View className="px-6 pt-4 pb-2">
          <Pressable
            onPress={() => setShowProjectPicker(true)}
            className="bg-white border-2 border-blue-600 rounded-lg px-4 py-3 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="business-outline" size={28} color="#3b82f6" />
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
                  {selectedProject 
                    ? selectedProject.name 
                    : userProjects.length === 0 
                      ? "No Projects Assigned" 
                      : "---"
                  }
                </Text>
                {!selectedProject && userProjects.length > 0 && (
                  <Text className="text-xs text-gray-500 mt-0.5">
                    Tap to select a project
                  </Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-down" size={28} color="#6b7280" />
          </Pressable>
        </View>
        
        {/* Today's Tasks Section */}
        {(() => {
          const starredTasks = getStarredTasks(user.id);
          const hasStarredTasks = starredTasks.length > 0;
          
          return (
            <View className="px-6 pt-2 pb-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="star" size={20} color="#f59e0b" />
                <Text className="text-lg font-bold text-gray-900 ml-2">
                  Today's Tasks ({starredTasks.length})
                </Text>
              </View>
              
              {hasStarredTasks ? (
                <View className="space-y-2">
                  {starredTasks.map((task: Task) => {
                  const isStarred = task.starredByUsers?.includes(user.id) || false;
                  
                  return (
                    <Pressable
                      key={task.id}
                      onPress={() => {
                        if (onNavigateToTaskDetail) {
                          onNavigateToTaskDetail(task.id);
                        }
                      }}
                      className="bg-white border-2 border-yellow-400 rounded-lg p-3"
                    >
                      {/* Main content: Photo on left, Text on right */}
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
                              <Text className="font-semibold text-gray-900 flex-1" numberOfLines={2}>
                                {task.title}
                              </Text>
                            </View>
                            <View className="flex-row items-center gap-2">
                              {/* Star button */}
                              <Pressable
                                onPress={(e) => {
                                  e.stopPropagation();
                                  toggleTaskStar(task.id, user.id);
                                }}
                                className="p-1"
                              >
                                <Ionicons 
                                  name={isStarred ? "star" : "star-outline"} 
                                  size={18} 
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
                          
                          {/* Task Description */}
                          {task.description && (
                            <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
                              {task.description}
                            </Text>
                          )}
                          
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
                })}
                </View>
              ) : (
                <View className="bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-lg p-3 items-center">
                  <Ionicons name="star-outline" size={24} color="#d97706" />
                  <Text className="text-gray-600 text-sm mt-1 text-center">
                    No tasks starred for today
                  </Text>
                  <Text className="text-gray-500 text-xs mt-0.5 text-center">
                    Tap the star icon on any task to add it here
                  </Text>
                </View>
              )}
            </View>
          );
        })()}
        
        {/* Quick Overview */}
        <View className="px-6 py-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-gray-900">
              {t.dashboard.quickOverview}
            </Text>
            <Pressable
              onPress={onNavigateToReports}
              className="px-4 py-2 bg-blue-600 rounded-lg flex-row items-center"
            >
              <Ionicons name="bar-chart-outline" size={18} color="white" />
              <Text className="text-white font-medium ml-2">Reports</Text>
            </Pressable>
          </View>

          {/* Combined Task Overview Box */}
          <View className="bg-white rounded-lg p-4 border border-gray-200">
            
            {/* Section 1: My Tasks - Self-assigned tasks */}
            <View>
              {/* Title */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
                  <Text className="text-base font-semibold text-gray-900 ml-2">
                    My Tasks ({myAllTasks.length})
                  </Text>
                </View>
                {/* Info text about starring */}
                <Text className="text-xs text-gray-500 italic">
                  Tap star in Tasks screen
                </Text>
              </View>
              
              {/* 4 Status Categories in Single Row */}
              <View className="flex-row gap-2">
                  {/* 1.1 Rejected - YELLOW */}
                  <Pressable 
                    className="flex-1 bg-yellow-50 border border-yellow-300 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("outbox");
                      setStatusFilter("rejected");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-yellow-700 mb-1">{myRejectedTasks.length}</Text>
                    <Text className="text-xs text-yellow-600 text-center" numberOfLines={1}>Rejected</Text>
                  </Pressable>
                  
                  {/* 1.2 WIP - ORANGE */}
                  <Pressable 
                    className="flex-1 bg-orange-50 border border-orange-300 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("my_tasks");
                      setStatusFilter("pending" as any);
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-orange-700 mb-1">{myWIPTasks.length}</Text>
                    <Text className="text-xs text-orange-600 text-center" numberOfLines={1}>WIP</Text>
                  </Pressable>
                  
                  {/* 1.3 Done - GREEN */}
                  <Pressable 
                    className="flex-1 bg-green-50 border border-green-300 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("my_tasks");
                      setStatusFilter("completed");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-green-700 mb-1">{myDoneTasks.length}</Text>
                    <Text className="text-xs text-green-600 text-center" numberOfLines={1}>Done</Text>
                  </Pressable>
                  
                  {/* 1.4 Overdue - RED */}
                  <Pressable 
                    className="flex-1 bg-red-50 border border-red-300 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("my_tasks");
                      setStatusFilter("overdue" as any);
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-red-700 mb-1">{myOverdueTasks.length}</Text>
                    <Text className="text-xs text-red-600 text-center" numberOfLines={1}>Overdue</Text>
                  </Pressable>
                </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-gray-200 my-4" />

            {/* Section 2: Inbox - Tasks assigned to me by others */}
            <View>
              {/* Title */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="mail-outline" size={20} color="#3b82f6" />
                  <Text className="text-base font-semibold text-gray-900 ml-2">
                    Inbox ({inboxAllTasks.length})
                  </Text>
                </View>
              </View>
              
              {/* 5 Status Categories in Single Row */}
              <View className="flex-row gap-2">
                  {/* 2.1 Received - YELLOW */}
                  <Pressable 
                    className="flex-1 bg-yellow-50 border border-yellow-300 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("inbox");
                      setStatusFilter("not_started");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-yellow-700 mb-1">{inboxReceivedTasks.length}</Text>
                    <Text className="text-xs text-yellow-600 text-center" numberOfLines={1}>Received</Text>
                  </Pressable>
                  
                  {/* 2.2 WIP - ORANGE */}
                  <Pressable 
                    className="flex-1 bg-orange-50 border border-orange-300 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("inbox");
                      setStatusFilter("pending" as any);
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-orange-700 mb-1">{inboxWIPTasks.length}</Text>
                    <Text className="text-xs text-orange-600 text-center" numberOfLines={1}>WIP</Text>
                  </Pressable>
                  
                  {/* 2.3 Reviewing - BLUE */}
                  <Pressable 
                    className="flex-1 bg-blue-50 border border-blue-300 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("inbox");
                      setStatusFilter("pending" as any);
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-blue-700 mb-1">{inboxReviewingTasks.length}</Text>
                    <Text className="text-xs text-blue-600 text-center" numberOfLines={1}>Reviewing</Text>
                  </Pressable>
                  
                  {/* 2.4 Done - GREEN */}
                  <Pressable 
                    className="flex-1 bg-green-50 border border-green-300 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("inbox");
                      setStatusFilter("completed");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-green-700 mb-1">{inboxDoneTasks.length}</Text>
                    <Text className="text-xs text-green-600 text-center" numberOfLines={1}>Done</Text>
                  </Pressable>
                  
                  {/* 2.5 Overdue - RED */}
                  <Pressable 
                    className="flex-1 bg-red-50 border border-red-300 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("inbox");
                      setStatusFilter("overdue" as any);
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-red-700 mb-1">{inboxOverdueTasks.length}</Text>
                    <Text className="text-xs text-red-600 text-center" numberOfLines={1}>Overdue</Text>
                  </Pressable>
                </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-gray-200 my-4" />

            {/* Section 3: Outbox - Tasks I assigned to others */}
            <View>
              {/* Title */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="send-outline" size={20} color="#7c3aed" />
                  <Text className="text-base font-semibold text-gray-900 ml-2">
                    Outbox ({outboxAllTasks.length})
                  </Text>
                </View>
              </View>
              
              {/* 5 Status Categories in Single Row */}
              <View className="flex-row gap-2">
                  {/* 3.1 Assigned - YELLOW */}
                  <Pressable 
                    className="flex-1 bg-yellow-50 border border-yellow-300 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("outbox");
                      setStatusFilter("not_started");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-yellow-700 mb-1">{outboxAssignedTasks.length}</Text>
                    <Text className="text-xs text-yellow-600 text-center" numberOfLines={1}>Assigned</Text>
                  </Pressable>
                  
                  {/* 3.2 WIP - ORANGE */}
                  <Pressable 
                    className="flex-1 bg-orange-50 border border-orange-300 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("outbox");
                      setStatusFilter("pending" as any);
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-orange-700 mb-1">{outboxWIPTasks.length}</Text>
                    <Text className="text-xs text-orange-600 text-center" numberOfLines={1}>WIP</Text>
                  </Pressable>
                  
                  {/* 3.3 Reviewing - BLUE */}
                  <Pressable 
                    className="flex-1 bg-blue-50 border border-blue-300 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("outbox");
                      setStatusFilter("pending" as any);
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-blue-700 mb-1">{outboxReviewingTasks.length}</Text>
                    <Text className="text-xs text-blue-600 text-center" numberOfLines={1}>Reviewing</Text>
                  </Pressable>
                  
                  {/* 3.4 Done - GREEN */}
                  <Pressable 
                    className="flex-1 bg-green-50 border border-green-300 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("outbox");
                      setStatusFilter("completed");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-green-700 mb-1">{outboxDoneTasks.length}</Text>
                    <Text className="text-xs text-green-600 text-center" numberOfLines={1}>Done</Text>
                  </Pressable>
                  
                  {/* 3.5 Overdue - RED */}
                  <Pressable 
                    className="flex-1 bg-red-50 border border-red-300 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("outbox");
                      setStatusFilter("overdue" as any);
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-red-700 mb-1">{outboxOverdueTasks.length}</Text>
                    <Text className="text-xs text-red-600 text-center" numberOfLines={1}>Overdue</Text>
                  </Pressable>
                </View>
            </View>
            
          </View>
        </View>

      </ScrollView>

      {/* Project Picker Modal */}
      <Modal
        visible={showProjectPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProjectPicker(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <StatusBar style="dark" />
          
          <ModalHandle />
          
          {/* Modal Header */}
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => setShowProjectPicker(false)}
              className="mr-4 w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="text-lg font-semibold text-gray-900 flex-1">
              {t.dashboard.selectProject}
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {/* Individual Projects */}
            <Text className="text-xs font-semibold text-gray-500 uppercase mb-2 mt-2">
              {t.dashboard.yourProjects} ({userProjects.length})
            </Text>
            
            {/* No Project Option - Only show when user has no projects assigned */}
            {userProjects.length === 0 && (
              <Pressable
                onPress={() => {
                  setSelectedProject(null, user.id);
                  setShowProjectPicker(false);
                }}
                className={cn(
                  "bg-white border rounded-lg px-4 py-4 mb-3 flex-row items-center",
                  (!selectedProjectId || selectedProjectId === "") ? "border-blue-500 bg-blue-50" : "border-gray-300"
                )}
              >
                <View className={cn(
                  "w-5 h-5 rounded-full border-2 items-center justify-center mr-3",
                  (!selectedProjectId || selectedProjectId === "") ? "border-blue-500" : "border-gray-300"
                )}>
                  {(!selectedProjectId || selectedProjectId === "") && (
                    <View className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className={cn(
                    "text-sm font-semibold",
                    (!selectedProjectId || selectedProjectId === "") ? "text-blue-900" : "text-gray-900"
                  )} numberOfLines={1}>
                    --- (No Project Selected)
                  </Text>
                  <Text className="text-xs text-gray-600 mt-0.5" numberOfLines={1}>
                    No projects assigned to you yet
                  </Text>
                </View>
                <Ionicons name="remove-outline" size={24} color={(!selectedProjectId || selectedProjectId === "") ? "#3b82f6" : "#6b7280"} />
              </Pressable>
            )}
            
            {userProjects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => {
                  setSelectedProject(project.id, user.id);
                  setShowProjectPicker(false);
                }}
                className={cn(
                  "bg-white border rounded-lg px-4 py-4 mb-3 flex-row items-center",
                  selectedProjectId === project.id ? "border-blue-500 bg-blue-50" : "border-gray-300"
                )}
              >
                <View className={cn(
                  "w-5 h-5 rounded-full border-2 items-center justify-center mr-3",
                  selectedProjectId === project.id ? "border-blue-500" : "border-gray-300"
                )}>
                  {selectedProjectId === project.id && (
                    <View className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className={cn(
                    "text-sm font-semibold",
                    selectedProjectId === project.id ? "text-blue-900" : "text-gray-900"
                  )} numberOfLines={1}>
                    {project.name}
                  </Text>
                  <Text className="text-xs text-gray-600 mt-0.5" numberOfLines={1}>
                    {project.location.city}, {project.location.state} • {project.status}
                  </Text>
                </View>
                <Ionicons name="folder-outline" size={24} color={selectedProjectId === project.id ? "#3b82f6" : "#6b7280"} />
              </Pressable>
            ))}
            
            {userProjects.length === 0 && (
              <View className="bg-white border border-gray-200 rounded-lg p-8 items-center">
                <Ionicons name="folder-open-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-500 text-center mt-2">
                  No projects assigned to you yet
                </Text>
                <Text className="text-gray-400 text-center mt-1 text-sm">
                  Contact your admin to get assigned to projects
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Expandable Utility FAB */}
      <ExpandableUtilityFAB onCreateTask={onNavigateToCreateTask} />
    </SafeAreaView>
  );
}
// Force reload 1759505832
// Force reload: 1759506479
// Force reload: 1759506549
// Force reload: 1759507000 - Fixed 4-button layout
