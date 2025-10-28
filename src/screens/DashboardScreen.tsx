import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Image,
  RefreshControl,
  Alert,
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
import { useUserStore } from "../state/userStore.supabase";

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const t = useTranslation();
  const { fetchUsers } = useUserStore();

  // Pull-to-refresh handler (silent - no alerts)
  const handleRefresh = async () => {
    if (!user) return;
    
    setIsRefreshing(true);
    console.log('🔄 [Pull-to-Refresh] Syncing all data...');
    
    try {
      // Sync all data in parallel
      await Promise.all([
        fetchTasks(),
        fetchProjects(),
        fetchUserProjectAssignments(user.id),
        fetchUsers(),
      ]);
      
      console.log('✅ [Pull-to-Refresh] Sync completed');
    } catch (error) {
      console.error('❌ [Pull-to-Refresh] Sync failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Manual refresh handler for FAB (with alerts)
  const handleManualRefresh = async () => {
    if (!user) return;
    
    console.log('🔄 Manual refresh triggered from FAB...');
    
    try {
      // Refresh all stores
      await Promise.all([
        fetchTasks(),
        fetchProjects(),
        fetchUserProjectAssignments(user.id),
        fetchUsers(),
      ]);
      
      console.log('✅ Manual refresh completed');
      Alert.alert('Success', 'Data refreshed successfully!');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
    }
  };

  // Get projects user is participating in
  const userProjects = user ? getProjectsByUser(user.id) : [];
  const userProjectCount = userProjects.length;

  // Smart project selection logic
  useEffect(() => {
    if (!user) return;
    
    console.log(`📊 [DashboardScreen] Project selection check:
      - User: ${user.name}
      - User projects: ${userProjectCount}
      - Selected: ${selectedProjectId || "null"}
    `);

    // Case 1: User has no projects → Clear selection
    if (userProjectCount === 0) {
      if (selectedProjectId !== null) {
        console.log(`   → No projects, clearing selection`);
        setSelectedProject(null, user.id);
      }
      return;
    }

    // Case 2: User has 1 project → Auto-select it
    if (userProjectCount === 1) {
      const singleProject = userProjects[0];
      if (selectedProjectId !== singleProject.id) {
        console.log(`   → Single project, auto-selecting: ${singleProject.name}`);
        setSelectedProject(singleProject.id, user.id);
      }
      return;
    }

    // Case 3: Selected project is invalid → Clear selection
    const isSelectedProjectValid = selectedProjectId && userProjects.some(p => p.id === selectedProjectId);
    if (selectedProjectId && !isSelectedProjectValid) {
      console.log(`   → Selected project ${selectedProjectId} is invalid, clearing`);
      setSelectedProject(null, user.id);
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

  // Note: Data syncing now handled by DataSyncManager (3-min polling + foreground refresh)
  // Pull-to-refresh provides manual control

  if (!user) return null;

  // Only show project statistics when a project is selected
  const activeProjects = selectedProjectId && selectedProjectId !== "" ? userProjects.filter(p => p.status === "active") : [];
  const planningProjects = selectedProjectId && selectedProjectId !== "" ? userProjects.filter(p => p.status === "planning") : [];
  
  // Get selected project name for display
  const selectedProject = selectedProjectId ? getProjectById(selectedProjectId) : null;

  // Filter tasks by selected project - show NO tasks when no project is selected
  // BUT: For review workflow, tasks submitted for review should be visible even if
  // project filter is active (as long as the task matches the selected project)
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

  // Helper function to check if a task is overdue
  const isOverdue = (task: any) => {
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    return dueDate < now;
  };

  // ===== MY TASKS SECTION =====
  // My Tasks: Tasks I created and assigned to myself (self-assigned)
  const myTasksParent = projectFilteredTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
    const isCreatedByMe = task.assignedBy === user.id;
    return isAssignedToMe && isCreatedByMe;
  });

  const myTasksSubTasks = projectFilteredTasks.flatMap(task => {
    return collectSubTasksAssignedTo(task.subTasks, user.id)
      .filter(subTask => subTask.assignedBy === user.id)
      .map(subTask => ({ ...subTask, isSubTask: true as const }));
  });

  const myTasksAll = [...myTasksParent, ...myTasksSubTasks];

  // My Tasks: Rejected
  const myRejectedTasks = myTasksAll.filter(task => task.currentStatus === "rejected");

  // My Tasks: WIP (self-assigned, accepted or doesn't need acceptance, not complete, not overdue, not rejected)
  const myWIPTasks = myTasksAll.filter(task => {
    const isSelfAssigned = task.assignedBy === user.id;
    const isAcceptedOrSelfAssigned = task.accepted || (isSelfAssigned && !task.accepted);
    return isAcceptedOrSelfAssigned &&
           task.completionPercentage < 100 &&
           !isOverdue(task) &&
           task.currentStatus !== "rejected";
  });

  // My Tasks: Done (100% complete, not rejected)
  const myDoneTasks = myTasksAll.filter(task => 
    task.completionPercentage === 100 &&
    task.currentStatus !== "rejected"
  );

  // My Tasks: Overdue (<100%, past due, not rejected)
  const myOverdueTasks = myTasksAll.filter(task =>
    task.completionPercentage < 100 &&
    isOverdue(task) &&
    task.currentStatus !== "rejected"
  );

  const myTasksTotal = myTasksAll.length;

  // ===== INBOX SECTION =====
  // Inbox: Tasks assigned TO me BY others
  const inboxParentTasks = projectFilteredTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
    const isCreatedByMe = task.assignedBy === user.id;
    return isAssignedToMe && !isCreatedByMe; // Assigned to me but NOT created by me
  });

  const inboxSubTasks = projectFilteredTasks.flatMap(task => {
    return collectSubTasksAssignedTo(task.subTasks, user.id)
      .filter(subTask => subTask.assignedBy !== user.id)
      .map(subTask => ({ ...subTask, isSubTask: true as const }));
  });

  const inboxAll = [...inboxParentTasks, ...inboxSubTasks];

  // Inbox: Received (not accepted, not rejected)
  const inboxReceivedTasks = inboxAll.filter(task =>
    !task.accepted &&
    task.currentStatus !== "rejected"
  );

  // Inbox: WIP (accepted, not overdue, not rejected, <100% or (100% but not ready for review))
  const inboxWIPTasks = inboxAll.filter(task =>
    task.accepted &&
    !isOverdue(task) &&
    task.currentStatus !== "rejected" &&
    (task.completionPercentage < 100 ||
     (task.completionPercentage === 100 && !task.readyForReview))
  );

  // Inbox: Reviewing (tasks I CREATED waiting for my review action)
  const inboxReviewingTasks = projectFilteredTasks.filter(task => {
    const isCreatedByMeForReview = task.assignedBy === user.id;
    return isCreatedByMeForReview &&
           task.completionPercentage === 100 &&
           task.readyForReview === true &&
           task.reviewAccepted !== true;
  });

  // Inbox: Done (100% complete, review accepted)
  const inboxDoneTasks = inboxAll.filter(task =>
    task.completionPercentage === 100 &&
    task.reviewAccepted === true
  );

  // Inbox: Overdue (<100%, past due, not rejected)
  const inboxOverdueTasks = inboxAll.filter(task =>
    task.completionPercentage < 100 &&
    isOverdue(task) &&
    task.currentStatus !== "rejected"
  );

  const inboxTotal = inboxAll.length;

  // ===== OUTBOX SECTION =====
  // Outbox: Tasks I assigned TO others (not self-assigned only, not rejected)
  const outboxParentTasks = projectFilteredTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
    const isCreatedByMe = task.assignedBy === user.id;
    const isSelfAssignedOnly = isCreatedByMe && isAssignedToMe && assignedTo.length === 1;
    return isCreatedByMe && !isSelfAssignedOnly && task.currentStatus !== "rejected";
  });

  const outboxSubTasks = projectFilteredTasks.flatMap(task =>
    collectSubTasksAssignedBy(task.subTasks, user.id)
      .filter(subTask => {
        const assignedTo = subTask.assignedTo || [];
        return !Array.isArray(assignedTo) || !assignedTo.includes(user.id);
      })
      .map(subTask => ({ ...subTask, isSubTask: true as const }))
  );

  const outboxAll = [...outboxParentTasks, ...outboxSubTasks];

  // Outbox: Assigned (not accepted, not rejected)
  const outboxAssignedTasks = outboxAll.filter(task =>
    !task.accepted &&
    task.currentStatus !== "rejected"
  );

  // Outbox: WIP (accepted, not overdue, not rejected, <100% or (100% but not ready for review))
  const outboxWIPTasks = outboxAll.filter(task =>
    task.accepted &&
    !isOverdue(task) &&
    task.currentStatus !== "rejected" &&
    (task.completionPercentage < 100 ||
     (task.completionPercentage === 100 && !task.readyForReview))
  );

  // Outbox: Reviewing (tasks I'm ASSIGNED TO that I submitted for review)
  const outboxReviewingTasks = projectFilteredTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
    const isCreatedByMe = task.assignedBy === user.id;
    return !isCreatedByMe &&
           isAssignedToMe &&
           task.completionPercentage === 100 &&
           task.readyForReview === true &&
           task.reviewAccepted !== true;
  });

  // Outbox: Done (100% complete, review accepted)
  const outboxDoneTasks = outboxAll.filter(task =>
    task.completionPercentage === 100 &&
    task.reviewAccepted === true
  );

  // Outbox: Overdue (<100%, past due, not rejected)
  const outboxOverdueTasks = outboxAll.filter(task =>
    task.completionPercentage < 100 &&
    isOverdue(task) &&
    task.currentStatus !== "rejected"
  );

  const outboxTotal = outboxAll.length;

  // Loading state
  if (!selectedProject && userProjectCount > 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <StandardHeader title="Dashboard" />
        
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="folder-open-outline" size={64} color="#9ca3af" />
          <Text className="text-lg font-semibold text-gray-900 mt-4 text-center">
            Select a Project
          </Text>
          <Text className="text-sm text-gray-600 mt-2 text-center mb-6">
            Choose a project to view your dashboard and tasks
          </Text>
          <Pressable
            onPress={() => setShowProjectPicker(true)}
            className="bg-blue-600 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Choose Project</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (userProjectCount === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <StandardHeader title="Dashboard" />
        
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="folder-open-outline" size={64} color="#9ca3af" />
          <Text className="text-lg font-semibold text-gray-900 mt-4 text-center">
            No Projects Yet
          </Text>
          <Text className="text-sm text-gray-600 mt-2 text-center">
            You haven't been assigned to any projects yet. Contact your admin to get started.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <StandardHeader title="Dashboard" />

      {/* Main Content with Pull-to-Refresh */}
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="p-4">
          {/* Project Picker */}
          <Pressable
            onPress={() => setShowProjectPicker(true)}
            className="bg-white rounded-lg p-3 mb-3 border-2 border-blue-300 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="business" size={20} color="#2563eb" />
              <View className="ml-2 flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {selectedProject?.name}
                </Text>
                {selectedProject?.description && (
                  <Text className="text-xs text-gray-600 mt-0.5" numberOfLines={1}>
                    {selectedProject?.description}
                  </Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-down" size={18} color="#2563eb" />
          </Pressable>

          {/* Today's Tasks Section - Only show if user has starred tasks */}
          {(() => {
            const starredTasks = getStarredTasks(user.id).filter(task => 
              selectedProjectId ? task.projectId === selectedProjectId : true
            );
            
            if (starredTasks.length === 0) return null;

            return (
              <View className="bg-white rounded-lg p-3 mb-3 border-2 border-yellow-400">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="star" size={18} color="#f59e0b" />
                  <Text className="text-sm font-semibold text-gray-900 ml-2">
                    Today's Tasks ({starredTasks.length})
                  </Text>
                </View>
                
                {/* Vertical list of tasks */}
                <View className="gap-2">
                  {starredTasks.map((task) => (
                    <Pressable
                      key={task.id}
                      onPress={() => onNavigateToTaskDetail && onNavigateToTaskDetail(task.id)}
                      className="bg-yellow-50 border border-yellow-300 rounded-lg p-2"
                    >
                      <View className="flex-row items-start justify-between mb-1">
                        <Text className="flex-1 font-semibold text-gray-900 mr-2" numberOfLines={2}>
                          {task.title}
                        </Text>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            toggleTaskStar(task.id, user.id);
                          }}
                          className="p-0.5"
                        >
                          <Ionicons name="star" size={16} color="#f59e0b" />
                        </Pressable>
                      </View>
                      
                      <Text className="text-xs text-gray-600 mb-1.5" numberOfLines={2}>
                        {task.description}
                      </Text>
                      
                      <View className="flex-row items-center justify-between">
                        <View className={cn(
                          "px-2 py-0.5 rounded-full border",
                          task.priority === "critical" ? "bg-red-50 border-red-200" :
                          task.priority === "high" ? "bg-orange-50 border-orange-200" :
                          task.priority === "medium" ? "bg-yellow-50 border-yellow-200" :
                          "bg-green-50 border-green-200"
                        )}>
                          <Text className={cn(
                            "text-xs font-medium",
                            task.priority === "critical" ? "text-red-700" :
                            task.priority === "high" ? "text-orange-700" :
                            task.priority === "medium" ? "text-yellow-700" :
                            "text-green-700"
                          )}>
                            {task.priority}
                          </Text>
                        </View>
                        
                        <Text className="text-xs font-semibold text-gray-700">
                          {task.completionPercentage}%
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })()}

          {/* Quick Overview Section */}
          <View className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="list-outline" size={20} color="#3b82f6" />
              <Text className="text-base font-semibold text-gray-900 ml-2">
                Quick Overview
              </Text>
            </View>

            {/* Section 1: My Tasks */}
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
                  <Text className="text-base font-semibold text-gray-900 ml-2">
                    My Tasks ({myTasksTotal})
                  </Text>
                </View>
                <Text className="text-xs text-gray-500 italic">
                  Tap star in Tasks screen
                </Text>
              </View>
              
              <View className="flex-row gap-2">
                {/* Rejected */}
                <Pressable 
                  className="flex-1 bg-yellow-50 border border-yellow-300 rounded-lg p-2 items-center"
                  onPress={() => {
                    setSectionFilter("my_tasks");
                    setStatusFilter("rejected");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-2xl font-bold text-yellow-700 mb-1">{myRejectedTasks.length}</Text>
                  <Text className="text-xs text-yellow-600 text-center" numberOfLines={1}>Rejected</Text>
                </Pressable>
                
                {/* WIP */}
                <Pressable 
                  className="flex-1 bg-orange-50 border border-orange-300 rounded-lg p-2 items-center"
                  onPress={() => {
                    setSectionFilter("my_tasks");
                    setStatusFilter("wip");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-2xl font-bold text-orange-700 mb-1">{myWIPTasks.length}</Text>
                  <Text className="text-xs text-orange-600 text-center" numberOfLines={1}>WIP</Text>
                </Pressable>
                
                {/* Done */}
                <Pressable 
                  className="flex-1 bg-green-50 border border-green-300 rounded-lg p-2 items-center"
                  onPress={() => {
                    setSectionFilter("my_tasks");
                    setStatusFilter("done");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-2xl font-bold text-green-700 mb-1">{myDoneTasks.length}</Text>
                  <Text className="text-xs text-green-600 text-center" numberOfLines={1}>Done</Text>
                </Pressable>
                
                {/* Overdue */}
                <Pressable 
                  className="flex-1 bg-red-50 border border-red-300 rounded-lg p-2 items-center"
                  onPress={() => {
                    setSectionFilter("my_tasks");
                    setStatusFilter("overdue");
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

            {/* Section 2: Inbox */}
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="mail-outline" size={20} color="#3b82f6" />
                  <Text className="text-base font-semibold text-gray-900 ml-2">
                    Inbox ({inboxTotal})
                  </Text>
                </View>
              </View>
              
              <View className="flex-row gap-2">
                {/* Received */}
                <Pressable 
                  className="flex-1 bg-yellow-50 border border-yellow-300 rounded-lg p-2 items-center"
                  onPress={() => {
                    setSectionFilter("inbox");
                    setStatusFilter("received");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-2xl font-bold text-yellow-700 mb-1">{inboxReceivedTasks.length}</Text>
                  <Text className="text-xs text-yellow-600 text-center" numberOfLines={1}>Received</Text>
                </Pressable>
                
                {/* WIP */}
                <Pressable 
                  className="flex-1 bg-orange-50 border border-orange-300 rounded-lg p-2 items-center"
                  onPress={() => {
                    setSectionFilter("inbox");
                    setStatusFilter("wip");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-2xl font-bold text-orange-700 mb-1">{inboxWIPTasks.length}</Text>
                  <Text className="text-xs text-orange-600 text-center" numberOfLines={1}>WIP</Text>
                </Pressable>
                
                {/* Reviewing */}
                <Pressable 
                  className="flex-1 bg-blue-50 border border-blue-300 rounded-lg p-2 items-center"
                  onPress={() => {
                    setSectionFilter("inbox");
                    setStatusFilter("reviewing");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-2xl font-bold text-blue-700 mb-1">{inboxReviewingTasks.length}</Text>
                  <Text className="text-xs text-blue-600 text-center" numberOfLines={1}>Reviewing</Text>
                </Pressable>
                
                {/* Done */}
                <Pressable 
                  className="flex-1 bg-green-50 border border-green-300 rounded-lg p-2 items-center"
                  onPress={() => {
                    setSectionFilter("inbox");
                    setStatusFilter("done");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-2xl font-bold text-green-700 mb-1">{inboxDoneTasks.length}</Text>
                  <Text className="text-xs text-green-600 text-center" numberOfLines={1}>Done</Text>
                </Pressable>
                
                {/* Overdue */}
                <Pressable 
                  className="flex-1 bg-red-50 border border-red-300 rounded-lg p-2 items-center"
                  onPress={() => {
                    setSectionFilter("inbox");
                    setStatusFilter("overdue");
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

            {/* Section 3: Outbox */}
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="send-outline" size={20} color="#7c3aed" />
                  <Text className="text-base font-semibold text-gray-900 ml-2">
                    Outbox ({outboxTotal})
                  </Text>
                </View>
              </View>
              
              <View className="flex-row gap-2">
                {/* Assigned */}
                <Pressable 
                  className="flex-1 bg-yellow-50 border border-yellow-300 rounded-lg p-2 items-center"
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("assigned");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-2xl font-bold text-yellow-700 mb-1">{outboxAssignedTasks.length}</Text>
                  <Text className="text-xs text-yellow-600 text-center" numberOfLines={1}>Assigned</Text>
                </Pressable>
                
                {/* WIP */}
                <Pressable 
                  className="flex-1 bg-orange-50 border border-orange-300 rounded-lg p-2 items-center"
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("wip");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-2xl font-bold text-orange-700 mb-1">{outboxWIPTasks.length}</Text>
                  <Text className="text-xs text-orange-600 text-center" numberOfLines={1}>WIP</Text>
                </Pressable>
                
                {/* Reviewing */}
                <Pressable 
                  className="flex-1 bg-blue-50 border border-blue-300 rounded-lg p-2 items-center"
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("reviewing");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-2xl font-bold text-blue-700 mb-1">{outboxReviewingTasks.length}</Text>
                  <Text className="text-xs text-blue-600 text-center" numberOfLines={1}>Reviewing</Text>
                </Pressable>
                
                {/* Done */}
                <Pressable 
                  className="flex-1 bg-green-50 border border-green-300 rounded-lg p-2 items-center"
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("done");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-2xl font-bold text-green-700 mb-1">{outboxDoneTasks.length}</Text>
                  <Text className="text-xs text-green-600 text-center" numberOfLines={1}>Done</Text>
                </Pressable>
                
                {/* Overdue */}
                <Pressable 
                  className="flex-1 bg-red-50 border border-red-300 rounded-lg p-2 items-center"
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("overdue");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-2xl font-bold text-red-700 mb-1">{outboxOverdueTasks.length}</Text>
                  <Text className="text-xs text-red-600 text-center" numberOfLines={1}>Overdue</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* ===== PRIORITY SUMMARY SECTION ===== */}
          <View className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="speedometer-outline" size={20} color="#6366f1" />
              <Text className="text-base font-semibold text-gray-900 ml-2">
                Priority Summary
              </Text>
            </View>

            {/* 1. URGENT! Section */}
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text className="text-sm font-semibold text-red-600 ml-2">Urgent!</Text>
              </View>
              <View className="flex-row gap-2">
                {/* My Overdues */}
                <Pressable 
                  className="flex-1 bg-red-50 border border-red-300 rounded-lg p-3 items-center"
                  onPress={() => {
                    setSectionFilter("all");
                    setStatusFilter("overdue");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-bold text-red-700 mb-1">
                    {myOverdueTasks.length + inboxOverdueTasks.length}
                  </Text>
                  <Text className="text-sm text-red-600 text-center" numberOfLines={1}>
                    My Overdues
                  </Text>
                </Pressable>
                
                {/* Chase Now */}
                <Pressable 
                  className="flex-1 bg-red-50 border border-red-300 rounded-lg p-3 items-center"
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("overdue");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-bold text-red-700 mb-1">
                    {outboxOverdueTasks.length}
                  </Text>
                  <Text className="text-sm text-red-600 text-center" numberOfLines={1}>
                    Chase Now
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-gray-200 mb-4" />

            {/* 2. IN QUEUE Section */}
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="hourglass-outline" size={18} color="#f59e0b" />
                <Text className="text-sm font-semibold text-amber-600 ml-2">In Queue</Text>
              </View>
              <View className="flex-row gap-2">
                {/* Inbox Received */}
                <Pressable 
                  className="flex-1 bg-yellow-50 border border-yellow-300 rounded-lg p-3 items-center"
                  onPress={() => {
                    setSectionFilter("inbox");
                    setStatusFilter("received");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-bold text-yellow-700 mb-1">
                    {inboxReceivedTasks.length}
                  </Text>
                  <Text className="text-sm text-yellow-600 text-center" numberOfLines={2}>
                    Inbox{'\n'}Received
                  </Text>
                </Pressable>
                
                {/* Inbox Review */}
                <Pressable 
                  className="flex-1 bg-blue-50 border border-blue-300 rounded-lg p-3 items-center"
                  onPress={() => {
                    setSectionFilter("inbox");
                    setStatusFilter("reviewing");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-bold text-blue-700 mb-1">
                    {inboxReviewingTasks.length}
                  </Text>
                  <Text className="text-sm text-blue-600 text-center" numberOfLines={2}>
                    Inbox{'\n'}Review
                  </Text>
                </Pressable>
                
                {/* All WIP */}
                <Pressable 
                  className="flex-1 bg-orange-50 border border-orange-300 rounded-lg p-3 items-center"
                  onPress={() => {
                    setSectionFilter("all");
                    setStatusFilter("wip");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-bold text-orange-700 mb-1">
                    {myWIPTasks.length + inboxWIPTasks.length}
                  </Text>
                  <Text className="text-sm text-orange-600 text-center" numberOfLines={2}>
                    All WIP{'\n'}Tasks
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-gray-200 mb-4" />

            {/* 3. MONITORING Section */}
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="eye-outline" size={18} color="#8b5cf6" />
                <Text className="text-sm font-semibold text-purple-600 ml-2">Monitoring</Text>
              </View>
              <View className="flex-row gap-2">
                {/* Outbox Assigned */}
                <Pressable 
                  className="flex-1 bg-yellow-50 border border-yellow-300 rounded-lg p-3 items-center"
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("assigned");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-bold text-yellow-700 mb-1">
                    {outboxAssignedTasks.length}
                  </Text>
                  <Text className="text-sm text-yellow-600 text-center" numberOfLines={2}>
                    Outbox{'\n'}Assigned
                  </Text>
                </Pressable>
                
                {/* Outbox WIP */}
                <Pressable 
                  className="flex-1 bg-orange-50 border border-orange-300 rounded-lg p-3 items-center"
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("wip");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-bold text-orange-700 mb-1">
                    {outboxWIPTasks.length}
                  </Text>
                  <Text className="text-sm text-orange-600 text-center" numberOfLines={2}>
                    Outbox{'\n'}WIP
                  </Text>
                </Pressable>
                
                {/* Outbox Reviewing */}
                <Pressable 
                  className="flex-1 bg-blue-50 border border-blue-300 rounded-lg p-3 items-center"
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("reviewing");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-bold text-blue-700 mb-1">
                    {outboxReviewingTasks.length}
                  </Text>
                  <Text className="text-sm text-blue-600 text-center" numberOfLines={2}>
                    Outbox{'\n'}Reviewing
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-gray-200 mb-4" />

            {/* 4. ACCOMPLISHMENTS Section */}
            <View>
              <View className="flex-row items-center mb-2">
                <Ionicons name="trophy-outline" size={18} color="#10b981" />
                <Text className="text-sm font-semibold text-green-600 ml-2">Accomplishments</Text>
              </View>
              <View className="flex-row gap-2">
                {/* All Done */}
                <Pressable 
                  className="flex-1 bg-green-50 border border-green-300 rounded-lg p-3 items-center"
                  onPress={() => {
                    setSectionFilter("all");
                    setStatusFilter("done");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-bold text-green-700 mb-1">
                    {myDoneTasks.length + inboxDoneTasks.length + outboxDoneTasks.length}
                  </Text>
                  <Text className="text-sm text-green-600 text-center" numberOfLines={2}>
                    All Done{'\n'}Tasks
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Footer space for FAB */}
          <View className="h-32" />
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
                  "bg-white border rounded-lg p-4 mb-2",
                  selectedProjectId === null ? "border-blue-500 bg-blue-50" : "border-gray-200"
                )}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className={cn(
                      "text-base font-semibold",
                      selectedProjectId === null ? "text-blue-700" : "text-gray-900"
                    )}>
                      All Projects
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">
                      View tasks from all assigned projects
                    </Text>
                  </View>
                  {selectedProjectId === null && (
                    <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
                  )}
                </View>
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
                  "bg-white border rounded-lg p-4 mb-2",
                  selectedProjectId === project.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                )}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className={cn(
                      "text-base font-semibold",
                      selectedProjectId === project.id ? "text-blue-700" : "text-gray-900"
                    )}>
                      {project.name}
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">
                      {project.description}
                    </Text>
                    <View className="flex-row items-center mt-2">
                      <View className={cn(
                        "px-2 py-1 rounded-full",
                        project.status === "active" ? "bg-green-100" : "bg-yellow-100"
                      )}>
                        <Text className={cn(
                          "text-xs font-medium",
                          project.status === "active" ? "text-green-700" : "text-yellow-700"
                        )}>
                          {project.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {selectedProjectId === project.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Expandable Utility FAB */}
      <ExpandableUtilityFAB
        onCreateTask={onNavigateToCreateTask}
        onRefresh={handleManualRefresh}
        onProfile={onNavigateToProfile}
        onReports={onNavigateToReports}
      />
    </SafeAreaView>
  );
}
