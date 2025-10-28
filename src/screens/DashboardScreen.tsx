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
import { useThemeStore } from "../state/themeStore";
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
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProjectSwitching, setIsProjectSwitching] = useState(false);
  const [isQuickOverviewExpanded, setIsQuickOverviewExpanded] = useState(false);
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
    
    // Case 4: User has multiple projects → Don't auto-select, user must choose
    if (userProjectCount > 1) {
      // Keep current selection if valid, otherwise clear to show picker
      if (selectedProjectId !== null) {
        const isValid = userProjects.some(p => p.id === selectedProjectId);
        if (!isValid) {
          console.log(`   → Selected project invalid, clearing to show picker`);
          setSelectedProject(null, user.id);
        } else {
          console.log(`   → Project already selected: keeping current`);
        }
      } else {
        console.log(`   → Multiple projects, no selection - showing picker`);
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

  // Filter tasks by selected project
  // If no project selected, show tasks from ALL user projects
  // BUT: For review workflow, tasks submitted for review should be visible even if
  // project filter is active (as long as the task matches the selected project)
  const projectFilteredTasks = selectedProjectId && selectedProjectId !== ""
    ? tasks.filter(task => task.projectId === selectedProjectId)
    : tasks.filter(task => userProjects.some(p => p.id === task.projectId)); // Show all project tasks when no specific project selected

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

  // No longer block rendering when no project selected - show "All Projects" mode instead

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
    <SafeAreaView className={cn("flex-1", isDarkMode ? "bg-slate-900" : "bg-gray-50")}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {/* Header */}
      <StandardHeader 
        title="Dashboard"
        rightElement={
          <View className="flex-row items-center">
            {/* Theme Toggle */}
            <Pressable
              onPress={toggleDarkMode}
              className="mr-3 p-2"
            >
              <Ionicons 
                name={isDarkMode ? "sunny" : "moon"} 
                size={22} 
                color={isDarkMode ? "#fbbf24" : "#475569"} 
              />
            </Pressable>
            
            <View className="mr-2">
              <Text className={cn("text-sm font-semibold text-right", isDarkMode ? "text-white" : "text-gray-900")}>
                {user.name}
            </Text>
              <Text className={cn("text-xs text-right capitalize", isDarkMode ? "text-slate-400" : "text-gray-600")}>
                {user.role}
              </Text>
            </View>
            <View className="w-8 h-8 bg-blue-600 rounded-full items-center justify-center">
              <Text className="text-white font-bold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        }
      />

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
            className={cn(
              "rounded-2xl p-4 mb-4 flex-row items-center justify-between",
              isDarkMode ? "bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl" : "bg-white border border-gray-200"
            )}
            style={isDarkMode ? {
              shadowColor: "#6366f1",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            } : undefined}
          >
            <View className="flex-row items-center flex-1">
              {isDarkMode ? (
                <View className="bg-white/20 rounded-full p-2">
                  <Ionicons name="business" size={22} color="#ffffff" />
                </View>
              ) : (
                <Ionicons name="business" size={20} color="#2563eb" />
              )}
              <View className={cn("flex-1", isDarkMode ? "ml-3" : "ml-2")}>
                <Text className={cn("text-base", isDarkMode ? "font-bold text-white" : "font-semibold text-gray-900")}>
                  {selectedProject?.name || "All Projects"}
                </Text>
                {selectedProject?.description ? (
                  <Text className={cn("text-xs mt-0.5", isDarkMode ? "text-indigo-100" : "text-gray-600")} numberOfLines={1}>
                    {selectedProject?.description}
                  </Text>
                ) : !selectedProject && (
                  <Text className={cn("text-xs mt-0.5", isDarkMode ? "text-indigo-100" : "text-gray-600")} numberOfLines={1}>
                    Viewing tasks from all projects
                  </Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-down" size={isDarkMode ? 20 : 18} color={isDarkMode ? "#ffffff" : "#2563eb"} />
          </Pressable>
        
          {/* Today's Tasks Section - Only show if user has starred tasks */}
        {(() => {
            const starredTasks = getStarredTasks(user.id).filter(task => 
              selectedProjectId ? task.projectId === selectedProjectId : true
            );
            
            if (starredTasks.length === 0) return null;
          
          return (
              <View className="bg-slate-800 rounded-2xl p-4 mb-4 border border-slate-700">
                <View className="flex-row items-center mb-3">
                  <View className="bg-amber-500/20 rounded-full p-2">
                    <Ionicons name="star" size={18} color="#fbbf24" />
                  </View>
                  <Text className="text-base font-bold text-white ml-3">
                  Today's Tasks ({starredTasks.length})
                </Text>
              </View>
              
                {/* Vertical list of tasks */}
                <View className="gap-2">
                  {starredTasks.map((task) => (
                    <Pressable
                      key={task.id}
                      onPress={() => onNavigateToTaskDetail && onNavigateToTaskDetail(task.id)}
                      className="bg-slate-700 border border-slate-600 rounded-xl p-3"
                    >
                      <View className="flex-row items-start justify-between mb-2">
                        <Text className="flex-1 font-bold text-white mr-2" numberOfLines={2}>
                                {task.title}
                              </Text>
                              <Pressable
                                onPress={(e) => {
                                  e.stopPropagation();
                                  toggleTaskStar(task.id, user.id);
                                }}
                          className="p-0.5"
                        >
                          <Ionicons name="star" size={18} color="#fbbf24" />
                              </Pressable>
                          </View>
                          
                      <Text className="text-xs text-slate-300 mb-2" numberOfLines={2}>
                              {task.description}
                            </Text>
                          
                          <View className="flex-row items-center justify-between">
                        <View className={cn(
                          "px-3 py-1 rounded-full",
                          task.priority === "critical" ? "bg-red-500/20" :
                          task.priority === "high" ? "bg-orange-500/20" :
                          task.priority === "medium" ? "bg-amber-500/20" :
                          "bg-emerald-500/20"
                        )}>
                          <Text className={cn(
                            "text-xs font-bold",
                            task.priority === "critical" ? "text-red-400" :
                            task.priority === "high" ? "text-orange-400" :
                            task.priority === "medium" ? "text-amber-400" :
                            "text-emerald-400"
                          )}>
                            {task.priority.toUpperCase()}
                              </Text>
                            </View>
                        
                        <Text className="text-sm font-bold text-white">
                          {task.completionPercentage}%
                            </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
            </View>
          );
        })()}

          {/* ===== PRIORITY SUMMARY SECTION ===== */}
          <View className="bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-4">
            <View className="flex-row items-center mb-4">
              <View className="bg-indigo-500/20 rounded-full p-2">
                <Ionicons name="speedometer-outline" size={20} color="#818cf8" />
              </View>
              <Text className="text-lg font-bold text-white ml-3">
                Priority Summary
              </Text>
            </View>

            {/* 1. URGENT! Section */}
            <View className="mb-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="alert-circle" size={18} color="#f87171" />
                <Text className="text-sm font-bold text-red-400 ml-2">URGENT!</Text>
              </View>
              <View className="flex-row gap-3">
                {/* My Overdues */}
                <Pressable 
                  className="flex-1 bg-red-500/10 border border-red-500/30 rounded-xl p-3 items-center"
                  onPress={() => {
                    setSectionFilter("all");
                    setStatusFilter("overdue");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-black text-red-400 mb-1">
                    {myOverdueTasks.length + inboxOverdueTasks.length}
                  </Text>
                  <Text className="text-xs text-red-300 text-center font-semibold" numberOfLines={1}>
                    My Overdues
                  </Text>
                </Pressable>
                
                {/* Chase Now */}
                <Pressable 
                  className="flex-1 bg-red-500/10 border border-red-500/30 rounded-xl p-3 items-center"
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("overdue");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-black text-red-400 mb-1">
                    {outboxOverdueTasks.length}
                  </Text>
                  <Text className="text-xs text-red-300 text-center font-semibold" numberOfLines={1}>
                    Chase Now
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-slate-700 mb-4" />

            {/* 2. ON MY PLATE Section */}
            <View className="mb-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="hourglass-outline" size={18} color="#fbbf24" />
                <Text className="text-sm font-bold text-amber-400 ml-2">ON MY PLATE</Text>
              </View>
              <View className="flex-row gap-3">
                {/* New Incoming Tasks */}
                <Pressable 
                  className="flex-1 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 items-center"
                  onPress={() => {
                    setSectionFilter("inbox");
                    setStatusFilter("received");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-black text-amber-400 mb-1">
                    {inboxReceivedTasks.length}
                  </Text>
                  <Text className="text-xs text-amber-300 text-center font-semibold" numberOfLines={2}>
                    New Incoming{'\n'}Tasks
                  </Text>
                </Pressable>
                
                {/* Completed Review Now */}
                <Pressable 
                  className="flex-1 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 items-center"
                  onPress={() => {
                    setSectionFilter("inbox");
                    setStatusFilter("reviewing");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-black text-cyan-400 mb-1">
                    {inboxReviewingTasks.length}
                  </Text>
                  <Text className="text-xs text-cyan-300 text-center font-semibold" numberOfLines={2}>
                    Completed{'\n'}Review Now
                  </Text>
                </Pressable>
                
                {/* My On-going Tasks */}
                <Pressable 
                  className="flex-1 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 items-center"
                  onPress={() => {
                    setSectionFilter("all");
                    setStatusFilter("wip");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-black text-orange-400 mb-1">
                    {myWIPTasks.length + inboxWIPTasks.length}
                  </Text>
                  <Text className="text-xs text-orange-300 text-center font-semibold" numberOfLines={2}>
                    My On-going{'\n'}Tasks
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-slate-700 mb-4" />

            {/* 3. ON OTHERS' PLATE Section */}
            <View className="mb-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="eye-outline" size={18} color="#a78bfa" />
                <Text className="text-sm font-bold text-purple-400 ml-2">ON OTHERS' PLATE</Text>
              </View>
              <View className="flex-row gap-3">
                {/* Waiting to Be Accepted */}
                <Pressable 
                  className="flex-1 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 items-center"
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("assigned");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-black text-amber-400 mb-1">
                    {outboxAssignedTasks.length}
                  </Text>
                  <Text className="text-xs text-amber-300 text-center font-semibold" numberOfLines={2}>
                    Waiting to Be{'\n'}Accepted
                  </Text>
                </Pressable>
                
                {/* Sent for Review */}
                <Pressable 
                  className="flex-1 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 items-center"
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("reviewing");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-black text-cyan-400 mb-1">
                    {outboxReviewingTasks.length}
                  </Text>
                  <Text className="text-xs text-cyan-300 text-center font-semibold" numberOfLines={2}>
                    Sent for{'\n'}Review
                  </Text>
                </Pressable>
                
                {/* Others Working on My Tasks */}
                <Pressable 
                  className="flex-1 bg-violet-500/10 border border-violet-500/30 rounded-xl p-3 items-center"
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("wip");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-3xl font-black text-violet-400 mb-1">
                    {outboxWIPTasks.length}
                  </Text>
                  <Text className="text-xs text-violet-300 text-center font-semibold" numberOfLines={2}>
                    Others Working{'\n'}on My Tasks
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-slate-700 mb-4" />

            {/* 4. ACCOMPLISHMENTS Section */}
            <View>
              <View className="flex-row items-center mb-3">
                <Ionicons name="trophy-outline" size={18} color="#34d399" />
                <Text className="text-sm font-bold text-emerald-400 ml-2">ACCOMPLISHMENTS</Text>
              </View>
              <View className="flex-row gap-3">
                {/* All Done Tasks */}
                <Pressable 
                  className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 items-center"
                  onPress={() => {
                    setSectionFilter("all");
                    setStatusFilter("done");
                    onNavigateToTasks();
                  }}
                >
                  <Text className="text-4xl font-black text-emerald-400 mb-1">
                    {myDoneTasks.length + inboxDoneTasks.length + outboxDoneTasks.length}
                  </Text>
                  <Text className="text-xs text-emerald-300 text-center font-semibold" numberOfLines={2}>
                    All Done{'\n'}Tasks
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* ===== QUICK OVERVIEW SECTION (COLLAPSIBLE) ===== */}
          <View className="bg-slate-800 rounded-2xl border border-slate-700 mb-4">
            {/* Header with Collapse/Expand */}
            <Pressable 
              onPress={() => setIsQuickOverviewExpanded(!isQuickOverviewExpanded)}
              className="p-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="bg-blue-500/20 rounded-full p-2">
                  <Ionicons name="list-outline" size={20} color="#60a5fa" />
                </View>
                <Text className="text-base font-bold text-white ml-3">
                  Quick Overview
                </Text>
              </View>
              <Ionicons 
                name={isQuickOverviewExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#94a3b8" 
              />
            </Pressable>

            {/* Collapsible Content */}
            {isQuickOverviewExpanded && (
              <View className="px-4 pb-4">
                {/* Section 1: My Tasks */}
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle-outline" size={18} color="#34d399" />
                  <Text className="text-sm font-bold text-emerald-400 ml-2">
                    My Tasks ({myTasksTotal})
                  </Text>
                </View>
                <Text className="text-xs text-slate-400 italic">
                  Tap star in Tasks screen
                </Text>
              </View>
              
              <View className="flex-row gap-2">
                {/* Rejected */}
                  <Pressable 
                    className="flex-1 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 items-center"
                    onPress={() => {
                    setSectionFilter("my_tasks");
                      setStatusFilter("rejected");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-amber-400 mb-1">{myRejectedTasks.length}</Text>
                    <Text className="text-xs text-amber-300 text-center font-medium" numberOfLines={1}>Rejected</Text>
                  </Pressable>
                  
                {/* WIP */}
                  <Pressable 
                    className="flex-1 bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("my_tasks");
                      setStatusFilter("wip");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-orange-400 mb-1">{myWIPTasks.length}</Text>
                    <Text className="text-xs text-orange-300 text-center font-medium" numberOfLines={1}>WIP</Text>
                  </Pressable>
                  
                {/* Done */}
                  <Pressable 
                    className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("my_tasks");
                      setStatusFilter("done");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-emerald-400 mb-1">{myDoneTasks.length}</Text>
                    <Text className="text-xs text-emerald-300 text-center font-medium" numberOfLines={1}>Done</Text>
                  </Pressable>
                  
                {/* Overdue */}
                  <Pressable 
                    className="flex-1 bg-red-500/10 border border-red-500/30 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("my_tasks");
                      setStatusFilter("overdue");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-red-400 mb-1">{myOverdueTasks.length}</Text>
                    <Text className="text-xs text-red-300 text-center font-medium" numberOfLines={1}>Overdue</Text>
                  </Pressable>
                </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-slate-700 my-4" />

            {/* Section 2: Inbox */}
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="mail-outline" size={18} color="#60a5fa" />
                  <Text className="text-sm font-bold text-blue-400 ml-2">
                    Inbox ({inboxTotal})
                  </Text>
                </View>
              </View>
              
              <View className="flex-row gap-2">
                {/* Received */}
                  <Pressable 
                    className="flex-1 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("inbox");
                      setStatusFilter("received");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-amber-400 mb-1">{inboxReceivedTasks.length}</Text>
                    <Text className="text-xs text-amber-300 text-center font-medium" numberOfLines={1}>Received</Text>
                  </Pressable>
                  
                {/* WIP */}
                  <Pressable 
                    className="flex-1 bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("inbox");
                      setStatusFilter("wip");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-orange-400 mb-1">{inboxWIPTasks.length}</Text>
                    <Text className="text-xs text-orange-300 text-center font-medium" numberOfLines={1}>WIP</Text>
                  </Pressable>
                  
                {/* Reviewing */}
                  <Pressable 
                    className="flex-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("inbox");
                      setStatusFilter("reviewing");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-cyan-400 mb-1">{inboxReviewingTasks.length}</Text>
                    <Text className="text-xs text-cyan-300 text-center font-medium" numberOfLines={1}>Reviewing</Text>
                  </Pressable>
                  
                {/* Done */}
                  <Pressable 
                    className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("inbox");
                      setStatusFilter("done");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-emerald-400 mb-1">{inboxDoneTasks.length}</Text>
                    <Text className="text-xs text-emerald-300 text-center font-medium" numberOfLines={1}>Done</Text>
                  </Pressable>
                  
                {/* Overdue */}
                  <Pressable 
                    className="flex-1 bg-red-500/10 border border-red-500/30 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("inbox");
                      setStatusFilter("overdue");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-red-400 mb-1">{inboxOverdueTasks.length}</Text>
                    <Text className="text-xs text-red-300 text-center font-medium" numberOfLines={1}>Overdue</Text>
                  </Pressable>
                </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-slate-700 my-4" />

            {/* Section 3: Outbox */}
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="send-outline" size={18} color="#a78bfa" />
                  <Text className="text-sm font-bold text-purple-400 ml-2">
                    Outbox ({outboxTotal})
                  </Text>
                </View>
              </View>
              
              <View className="flex-row gap-2">
                {/* Assigned */}
                  <Pressable 
                    className="flex-1 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("outbox");
                      setStatusFilter("assigned");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-amber-400 mb-1">{outboxAssignedTasks.length}</Text>
                    <Text className="text-xs text-amber-300 text-center font-medium" numberOfLines={1}>Assigned</Text>
                  </Pressable>
                  
                {/* WIP */}
                  <Pressable 
                    className="flex-1 bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("outbox");
                      setStatusFilter("wip");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-orange-400 mb-1">{outboxWIPTasks.length}</Text>
                    <Text className="text-xs text-orange-300 text-center font-medium" numberOfLines={1}>WIP</Text>
                  </Pressable>
                  
                {/* Reviewing */}
                  <Pressable 
                    className="flex-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("outbox");
                      setStatusFilter("reviewing");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-cyan-400 mb-1">{outboxReviewingTasks.length}</Text>
                    <Text className="text-xs text-cyan-300 text-center font-medium" numberOfLines={1}>Reviewing</Text>
                  </Pressable>
                  
                {/* Done */}
                  <Pressable 
                    className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("outbox");
                      setStatusFilter("done");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-emerald-400 mb-1">{outboxDoneTasks.length}</Text>
                    <Text className="text-xs text-emerald-300 text-center font-medium" numberOfLines={1}>Done</Text>
                  </Pressable>
                  
                {/* Overdue */}
                  <Pressable 
                    className="flex-1 bg-red-500/10 border border-red-500/30 rounded-lg p-2 items-center"
                    onPress={() => {
                      setSectionFilter("outbox");
                      setStatusFilter("overdue");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className="text-2xl font-bold text-red-400 mb-1">{outboxOverdueTasks.length}</Text>
                    <Text className="text-xs text-red-300 text-center font-medium" numberOfLines={1}>Overdue</Text>
                  </Pressable>
              </View>
                </View>
              </View>
            )}
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
                onPress={async () => {
                  // Only refresh if actually changing projects
                  if (selectedProjectId === project.id) {
                    setShowProjectPicker(false);
                    return;
                  }
                  
                  setIsProjectSwitching(true);
                  setSelectedProject(project.id, user.id);
                  setShowProjectPicker(false);
                  
                  // Refresh all data when project changes (treat as re-login)
                  try {
                    console.log('🔄 Project changed - refreshing all data...');
                    await Promise.all([
                      fetchTasks(),
                      fetchProjects(),
                      fetchUserProjectAssignments(user.id),
                      fetchUsers()
                    ]);
                    console.log('✅ Data refresh complete');
                  } catch (error) {
                    console.error('❌ Error refreshing data:', error);
                    Alert.alert('Error', 'Failed to refresh data. Please try again.');
                  } finally {
                    setIsProjectSwitching(false);
                  }
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
        onSearch={() => {
          setSelectedProject(null, user.id);
          setSectionFilter("all");
          onNavigateToTasks();
        }}
        onReports={onNavigateToReports}
      />

      {/* Project Switching Loading Overlay */}
      {isProjectSwitching && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <View className="bg-white rounded-xl p-6 items-center shadow-lg">
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              Switching Project...
                </Text>
            <Text className="text-sm text-gray-600 text-center">
              Refreshing all data for the new project
                </Text>
          </View>
              </View>
            )}
    </SafeAreaView>
  );
}
