import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../state/authStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { useProjectStoreWithInit } from "../state/projectStore.supabase";
import { useProjectFilterStore } from "../state/projectFilterStore";
import { useCompanyStore } from "../state/companyStore";
import { useThemeStore } from "../state/themeStore";
import { useTranslation } from "../utils/useTranslation";
import { Task, Priority } from "../types/buildtrack";
import { cn } from "../utils/cn";
import { LoadingIndicator } from "../components/LoadingIndicator";
import StandardHeader from "../components/StandardHeader";
import ExpandableUtilityFAB from "../components/ExpandableUtilityFAB";
import TaskCard from "../components/TaskCard";
import { useUserStore } from "../state/userStore.supabase";

interface DashboardScreenProps {
  onNavigateToTasks: () => void;
  onNavigateToCreateTask: () => void;
  onNavigateToProfile: () => void;
  onNavigateToReports?: () => void;
  onNavigateToTaskDetail?: (taskId: string, subTaskId?: string) => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

export default function DashboardScreen({ 
  onNavigateToTasks, 
  onNavigateToCreateTask, 
  onNavigateToProfile,
  onNavigateToReports,
  onNavigateToTaskDetail,
  onNavigateToProjectPicker
}: DashboardScreenProps) {
  const { user, logout } = useAuthStore();
  const taskStore = useTaskStore();
  const tasks = taskStore.tasks;
  const { fetchTasks, getStarredTasks, toggleTaskStar, isLoading: isLoadingTasks } = taskStore;
  const projectStore = useProjectStoreWithInit();
  const { getProjectsByUser, getProjectById, fetchProjects, fetchUserProjectAssignments, isLoading: isLoadingProjects, projects, getUserProjectAssignments } = projectStore;
  const { selectedProjectId, setSelectedProject, setSectionFilter, setStatusFilter, setButtonLabel, getLastSelectedProject } = useProjectFilterStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProjectSwitching, setIsProjectSwitching] = useState(false);
  const [isQuickOverviewExpanded, setIsQuickOverviewExpanded] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const t = useTranslation();
  const userStore = useUserStore();
  const { fetchUsers, isLoading: isLoadingUsers } = userStore;
  
  // Track if we've already run initial project selection to prevent re-running on data refreshes
  const hasRunInitialSelection = useRef(false);
  // Track if we're currently waiting for database query to complete (to prevent premature picker display)
  const isWaitingForDBQuery = useRef(false);

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
  
  // Check if user assignments have been loaded (needed for getProjectsByUser to work correctly)
  const userAssignments = user ? getUserProjectAssignments(user.id) : [];
  const hasUserAssignmentsLoaded = user ? (userAssignments.length > 0 || !isLoadingProjects) : false;

  // Track when projects AND user assignments have been initialized
  // Both are needed because getProjectsByUser depends on userAssignments
  useEffect(() => {
    // Mark as initialized when:
    // 1. Loading is complete AND we have a user, OR
    // 2. We have projects in the store (which means at least one fetch completed)
    // Note: We don't require userAssignments to have data (user might have 0 projects),
    // but we do require loading to be complete
    if ((!isLoadingProjects && user) || projects.length > 0) {
      setHasInitialized(true);
    }
  }, [projects.length, isLoadingProjects, user]);

  // Check if any critical data is still loading
  const isAnyDataLoading = isLoadingProjects || isLoadingTasks || isLoadingUsers;

  // 🔄 Refetch tasks when screen comes into focus (e.g., returning from TaskDetailScreen)
  // Only refetch if data is stale (more than 30 seconds old)
  const lastFetchTime = useRef<number>(0);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      const STALE_TIME = 30000; // 30 seconds
      
      // Only fetch if data is stale or this is the first focus
      if (timeSinceLastFetch > STALE_TIME || lastFetchTime.current === 0) {
        console.log('🔄 DashboardScreen focused - refreshing tasks (data is stale)...');
        lastFetchTime.current = now;
        fetchTasks().catch((error) => {
          console.error('🔄❌ Error refreshing tasks on focus:', error);
        });
      } else {
        console.log('⏭️ DashboardScreen focused - skipping refresh (data is fresh)');
      }
    }, [fetchTasks])
  );

  // Smart project selection logic - ONLY runs once on initial load
  // This prevents unexpected project switching during data refreshes
  useEffect(() => {
    // Only run once on initial load
    // Wait for initialization AND ensure we're not still loading (to avoid race conditions)
    if (!user || !hasInitialized || hasRunInitialSelection.current || isLoadingProjects) return;
    
    // Recalculate userProjects here to ensure we have the latest data
    const currentUserProjects = getProjectsByUser(user.id);
    const currentUserProjectCount = currentUserProjects.length;
    
    console.log(`📊 [DashboardScreen] Initial project selection logic (one-time):
      - User: ${user.name}
      - User projects: ${currentUserProjectCount}
      - Selected: ${selectedProjectId || "null"}
      - Loading: ${isLoadingProjects}
    `);
    
    // Use async IIFE to handle async operations in useEffect
    (async () => {
      try {
        // Case 1: User has no projects → Clear any selection
        if (currentUserProjectCount === 0) {
          if (selectedProjectId !== null) {
            console.log(`   → No projects, clearing selection`);
            await setSelectedProject(null, user.id);
          }
          // Mark that we've completed the initial selection
          hasRunInitialSelection.current = true;
          return;
        }
        
        // Case 2: User has exactly 1 project → Auto-select it (only on initial load)
        if (currentUserProjectCount === 1) {
          const singleProject = currentUserProjects[0];
          if (selectedProjectId !== singleProject.id) {
            console.log(`   → Single project, auto-selecting: ${singleProject.name}`);
            await setSelectedProject(singleProject.id, user.id);
          }
          // Mark that we've completed the initial selection
          hasRunInitialSelection.current = true;
          return;
        }

        // Case 3: User has multiple projects
        if (currentUserProjectCount > 1) {
          // Mark that we're waiting for database query
          isWaitingForDBQuery.current = true;
          
          // Always check database first to get the most up-to-date last selected project
          const lastSelectedFromDB = await getLastSelectedProject(user.id);
          
          // Mark that database query is complete
          isWaitingForDBQuery.current = false;
          
          // Check if current selection matches database (cross-device sync check)
          const currentSelectionMatchesDB = selectedProjectId === lastSelectedFromDB;
          const isCurrentSelectionValid = selectedProjectId && currentUserProjects.some(p => p.id === selectedProjectId);
          
          // If current selection matches database AND is valid, keep it
          if (currentSelectionMatchesDB && isCurrentSelectionValid) {
            console.log(`   → Current selection matches database: ${selectedProjectId}`);
            // Mark that we've completed the initial selection
            hasRunInitialSelection.current = true;
            return;
          }
          
          // If database has a different (or no) value, use database value
          if (lastSelectedFromDB && currentUserProjects.some(p => p.id === lastSelectedFromDB)) {
            console.log(`   → Database has different value, restoring: ${lastSelectedFromDB} (current was: ${selectedProjectId || 'null'})`);
            await setSelectedProject(lastSelectedFromDB, user.id);
            // Mark that we've completed the initial selection
            hasRunInitialSelection.current = true;
            return;
          }
          
          // If current selection is valid but doesn't match database, still use it (user might have manually selected)
          // But log a warning about the mismatch
          if (isCurrentSelectionValid) {
            console.log(`   ⚠️ Current selection (${selectedProjectId}) is valid but doesn't match database (${lastSelectedFromDB || 'null'}) - keeping current`);
            // Sync current selection to database for consistency
            await setSelectedProject(selectedProjectId, user.id);
            // Mark that we've completed the initial selection
            hasRunInitialSelection.current = true;
            return;
          }
          
          // No valid selection anywhere - open picker
          console.log(`   → No valid selection found - opening picker`);
          onNavigateToProjectPicker?.(false); // Don't allow back if no selection
          // Mark that we've completed the initial selection
          hasRunInitialSelection.current = true;
        }
      } catch (error) {
        console.error('❌ [DashboardScreen] Error in initial project selection:', error);
        // Even on error, mark as complete to prevent infinite loops
        hasRunInitialSelection.current = true;
        isWaitingForDBQuery.current = false;
      }
    })();
  }, [user?.id, hasInitialized, isLoadingProjects, userProjectCount]);
  
  // Separate effect to validate current selection when projects change (but don't auto-switch)
  // This only runs AFTER initial selection has been made
  useEffect(() => {
    // Skip if we haven't initialized yet, initial selection hasn't run, still loading, or waiting for DB query
    if (!user || !hasInitialized || !hasRunInitialSelection.current || isLoadingProjects || isWaitingForDBQuery.current) return;
    
    // Recalculate to get latest data
    const currentUserProjects = getProjectsByUser(user.id);
    const currentUserProjectCount = currentUserProjects.length;
    
    // Use async IIFE to handle async operations in useEffect
    (async () => {
      // If user has no projects, clear selection
      if (currentUserProjectCount === 0 && selectedProjectId !== null) {
        console.log(`⚠️ [DashboardScreen] User has no projects, clearing selection`);
        await setSelectedProject(null, user.id);
        return;
      }
      
      // Edge case: If user has multiple projects but no selection (e.g., projects loaded after initial run)
      if (currentUserProjectCount > 1 && selectedProjectId === null) {
        // Mark that we're waiting for database query
        isWaitingForDBQuery.current = true;
        
        // Check if there's a last selected project we can restore
        const lastSelected = await getLastSelectedProject(user.id);
        
        // Mark that database query is complete
        isWaitingForDBQuery.current = false;
        
        const isLastSelectedValid = lastSelected && currentUserProjects.some(p => p.id === lastSelected);
        
        if (isLastSelectedValid) {
          console.log(`⚠️ [DashboardScreen] Restoring last selected project after late data load: ${lastSelected}`);
          await setSelectedProject(lastSelected, user.id);
        } else {
          console.log(`⚠️ [DashboardScreen] Multiple projects available but no selection - opening picker`);
          onNavigateToProjectPicker?.(false); // Don't allow back if no selection
        }
        return;
      }
      
      // If current selection is invalid (project no longer accessible), clear it
      if (selectedProjectId && !currentUserProjects.some(p => p.id === selectedProjectId)) {
        console.log(`⚠️ [DashboardScreen] Current project no longer accessible, clearing selection`);
        await setSelectedProject(null, user.id);
        // Optionally show picker if user has multiple projects
        if (currentUserProjectCount > 1) {
          onNavigateToProjectPicker?.(true); // Allow back
        }
      }
    })();
  }, [userProjectCount, selectedProjectId, user?.id, hasInitialized, isLoadingProjects]);

  // Note: Data syncing now handled by DataSyncManager (3-min polling + foreground refresh)
  // Pull-to-refresh provides manual control

  if (!user) return null;

  // Show loading indicator while critical data is being fetched or not yet initialized
  // Check all loading states: projects, tasks, and users
  if (isAnyDataLoading || !hasInitialized) {
    return (
      <SafeAreaView className={cn("flex-1", isDarkMode ? "bg-slate-900" : "bg-gray-50")}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <StandardHeader title="Dashboard" />
        
        <View className="flex-1 items-center justify-center">
          <LoadingIndicator isLoading={true} />
          <Text className={cn("text-base mt-4", isDarkMode ? "text-slate-400" : "text-gray-600")}>
            {isLoadingProjects ? "Loading projects..." : isLoadingTasks ? "Loading tasks..." : isLoadingUsers ? "Loading users..." : "Loading data..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Only show project statistics when a project is selected
  const activeProjects = selectedProjectId && selectedProjectId !== "" ? userProjects.filter(p => p.status === "active") : [];
  const planningProjects = selectedProjectId && selectedProjectId !== "" ? userProjects.filter(p => p.status === "planning") : [];
  
  // Get selected project name for display
  const selectedProject = selectedProjectId ? getProjectById(selectedProjectId) : null;

  // Filter tasks by selected project - must have a project selected
  const projectFilteredTasks = selectedProjectId && selectedProjectId !== ""
    ? tasks.filter(task => task.projectId === selectedProjectId)
    : []; // No tasks shown if no project selected (should not reach here due to early returns)

  // ✅ UPDATED: Simplified for unified tasks table
  // Get all nested tasks (tasks with parentTaskId) assigned by a user
  const getNestedTasksAssignedBy = (userId: string): Task[] => {
    return projectFilteredTasks.filter(task => 
      isNestedTask(task) && // Is a nested task
      task.assignedBy === userId
    );
  };

  // Get all nested tasks assigned to a user
  const getNestedTasksAssignedTo = (userId: string): Task[] => {
    return projectFilteredTasks.filter(task => {
      const assignedTo = task.assignedTo || [];
      return isNestedTask(task) && // Is a nested task
             Array.isArray(assignedTo) && 
             assignedTo.includes(userId);
    });
  };

  // Helper: Check if task is top-level (not a subtask)
  const isTopLevelTask = (task: Task) => {
    return !task.parentTaskId || task.parentTaskId === null || task.parentTaskId === '';
  };

  // Helper: Check if task is nested (has a parent)
  const isNestedTask = (task: Task) => {
    return !!task.parentTaskId && task.parentTaskId !== null && task.parentTaskId !== '';
  };

  // Helper function to check if a task is overdue
  const isOverdue = (task: any) => {
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    return dueDate < now;
  };

  // ===== MY TASKS SECTION =====
  // My Tasks: Tasks I created and assigned to myself (self-assigned)
  // Now includes both top-level and nested tasks (all in one table!)
  const myTasksParent = projectFilteredTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
    const isCreatedByMe = task.assignedBy === user.id;
    return isTopLevelTask(task) && isAssignedToMe && isCreatedByMe; // Top-level only
  });

  const myTasksNested = getNestedTasksAssignedTo(user.id)
    .filter(task => task.assignedBy === user.id);

  const myTasksAll = [...myTasksParent, ...myTasksNested];

  // My Tasks: Rejected
  const myRejectedTasks = myTasksAll.filter(task => task.currentStatus === "rejected");

  // My Tasks: WIP (self-assigned, accepted or doesn't need acceptance, not complete, not overdue, not rejected, not review accepted)
  const myWIPTasks = myTasksAll.filter(task => {
    const isSelfAssigned = task.assignedBy === user.id;
    const isAcceptedOrSelfAssigned = task.accepted || (isSelfAssigned && !task.accepted);
    return isAcceptedOrSelfAssigned && 
           task.completionPercentage < 100 &&
           !isOverdue(task) &&
           task.currentStatus !== "rejected" &&
           !task.reviewAccepted;
  });
  
  // My Tasks: Done (100% complete, review accepted)
  const myDoneTasks = myTasksAll.filter(task => 
    task.completionPercentage === 100 &&
    task.reviewAccepted === true
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
    return isTopLevelTask(task) && isAssignedToMe && !isCreatedByMe; // Top-level only
  });

  const inboxNestedTasks = getNestedTasksAssignedTo(user.id)
    .filter(task => task.assignedBy !== user.id);

  const inboxAll = [...inboxParentTasks, ...inboxNestedTasks];

  // Inbox: Received (not yet responded, not rejected)
  // Helper: Check if task is pending acceptance (accepted === false, no declineReason, not rejected)
  const isPendingAcceptance = (task: Task) => {
    return task.accepted === false && 
           !task.declineReason && 
           task.currentStatus !== "rejected";
  };
  
  const inboxReceivedTasks = inboxAll.filter(task => isPendingAcceptance(task));
  
  // Inbox: WIP (accepted, not overdue, not rejected, <100% or (100% but not ready for review), not review accepted)
  const inboxWIPTasks = inboxAll.filter(task =>
    task.accepted && 
    !isOverdue(task) &&
    task.currentStatus !== "rejected" &&
    (task.completionPercentage < 100 ||
     (task.completionPercentage === 100 && !task.readyForReview)) &&
    !task.reviewAccepted
  );

  // Inbox: Reviewing (tasks I CREATED waiting for my review action)
  // NOTE: Includes both top-level and nested tasks (all tasks I created)
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
    return isTopLevelTask(task) && isCreatedByMe && !isSelfAssignedOnly && task.currentStatus !== "rejected"; // Top-level only
  });

  const outboxNestedTasks = getNestedTasksAssignedBy(user.id)
    .filter(task => {
      const assignedTo = task.assignedTo || [];
      return !Array.isArray(assignedTo) || !assignedTo.includes(user.id);
    });

  const outboxAll = [...outboxParentTasks, ...outboxNestedTasks];

  // Outbox: Assigned (pending acceptance, not rejected)
  const outboxAssignedTasks = outboxAll.filter(task =>
    task.accepted === false && 
    !task.declineReason && 
    task.currentStatus !== "rejected"
  );
  
  // Outbox: WIP (accepted, not overdue, not rejected, <100% or (100% but not ready for review), not review accepted)
  const outboxWIPTasks = outboxAll.filter(task =>
    task.accepted && 
    !isOverdue(task) &&
    task.currentStatus !== "rejected" &&
    (task.completionPercentage < 100 ||
     (task.completionPercentage === 100 && !task.readyForReview)) &&
    !task.reviewAccepted
  );

  // Outbox: Reviewing (tasks I'm ASSIGNED TO that I submitted for review)
  // NOTE: Includes both top-level and nested tasks (all tasks assigned to me)
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

  // Determine what to show based on user's project situation
  const shouldShowDashboard = selectedProjectId !== null;
  const shouldShowNoProjects = userProjectCount === 0;
  // Show empty state if user has multiple projects but no selection
  const shouldShowEmptyState = userProjectCount > 1 && !selectedProjectId;

  return (
    <SafeAreaView className={cn("flex-1", isDarkMode ? "bg-slate-900" : "bg-gray-50")}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {/* Header */}
      <StandardHeader 
        title="Dashboard"
        rightElement={
          <Pressable 
            onPress={() => setShowProfileMenu(true)}
            className="flex-row items-center"
          >
            <View className="mr-2">
              <Text className={cn("text-base font-semibold text-right", isDarkMode ? "text-white" : "text-gray-900")}>
                {user.name}
            </Text>
              <Text className={cn("text-sm text-right capitalize", isDarkMode ? "text-slate-400" : "text-gray-600")}>
                {user.role}
              </Text>
            </View>
            <View className="w-8 h-8 bg-blue-600 rounded-full items-center justify-center">
              <Text className="text-white font-bold text-base">
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          </Pressable>
        }
      />

      {/* Main Content */}
      {shouldShowNoProjects ? (
        // Show "No Projects Yet" screen
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="folder-open-outline" size={64} color={isDarkMode ? "#94a3b8" : "#9ca3af"} />
          <Text className={cn("text-xl font-semibold mt-4 text-center", isDarkMode ? "text-white" : "text-gray-900")}>
            No Projects Yet
          </Text>
          <Text className={cn("text-base mt-2 text-center", isDarkMode ? "text-slate-400" : "text-gray-600")}>
            You haven't been assigned to any projects yet. Contact your admin to get started.
          </Text>
        </View>
      ) : shouldShowEmptyState ? (
        // Show empty state for first-time multi-project users (picker will open automatically)
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="business-outline" size={64} color={isDarkMode ? "#94a3b8" : "#9ca3af"} />
          <Text className={cn("text-xl font-semibold mt-4 text-center", isDarkMode ? "text-white" : "text-gray-900")}>
            Select a Project
          </Text>
          <Text className={cn("text-base mt-2 text-center", isDarkMode ? "text-slate-400" : "text-gray-600")}>
            Please select a project to view your dashboard
          </Text>
        </View>
      ) : (
        // Show full dashboard with pull-to-refresh
        <ScrollView 
          className="flex-1" 
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          <View className="px-4 pb-4 pt-1.5">
            {/* Project Name Display */}
            {selectedProject && (
              <View className="mb-4 mt-1.5">
                <Text className={cn(
                  "text-2xl font-bold",
                  isDarkMode ? "text-white" : "text-gray-900"
                )}>
                  {selectedProject.name}
                </Text>
              </View>
            )}
            
            {/* Key Tasks Section - Only show if user has starred tasks AND a project is selected */}
        {(() => {
            // Don't show any tasks if no project is selected
            if (!selectedProjectId) return null;
            
            const starredTasks = getStarredTasks(user.id).filter(task => 
              task.projectId === selectedProjectId
            );
            
            if (starredTasks.length === 0) return null;
          
          return (
              <View className={cn(
                "rounded-2xl p-4 mb-4",
                isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-yellow-50 border border-yellow-200"
              )}>
                <View className="flex-row items-center mb-3">
                  {isDarkMode ? (
                    <View className="bg-amber-500/20 rounded-full p-2">
                      <Ionicons name="star" size={18} color="#fbbf24" />
                    </View>
                  ) : (
                    <Ionicons name="star" size={18} color="#f59e0b" />
                  )}
                  <Text className={cn(
                    "text-lg ml-3",
                    isDarkMode ? "font-bold text-white" : "font-semibold text-gray-900"
                  )}>
                  Key Tasks ({starredTasks.length})
                </Text>
              </View>
              
                {/* Vertical list of tasks using TaskCard */}
                <View className="gap-2">
                  {starredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onNavigateToTaskDetail={(taskId: string, subTaskId?: string) => {
                        if (onNavigateToTaskDetail) {
                          onNavigateToTaskDetail(taskId, subTaskId);
                        }
                      }}
                    />
                  ))}
                </View>
            </View>
          );
        })()}

          {/* ===== PRIORITY SUMMARY SECTION ===== */}
          {selectedProjectId && (
          <View className={cn(
            "rounded-2xl p-4 mb-4",
            isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"
          )}>
            {/* 1. Overdue Section */}
            <View className="mb-4">
              <View className="flex-row items-center mb-3">
                <View className={cn(
                  "rounded-full p-1.5 mr-2",
                  isDarkMode ? "bg-red-900/40" : "bg-red-100"
                )}>
                  <Ionicons 
                    name="alarm-outline" 
                    size={18} 
                    color={isDarkMode ? "#fca5a5" : "#dc2626"} 
                  />
                </View>
                <Text className={cn(
                  "text-lg font-bold",
                  isDarkMode ? "text-red-400" : "text-red-600"
                )}>
                  {isDarkMode ? "OVERDUE" : "Overdue"}
                </Text>
              </View>
              <View className={cn("flex-row", isDarkMode ? "gap-3" : "gap-2")}>
                {/* My Overdues */}
                <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-3 items-center",
                    isDarkMode ? "bg-red-900 border-2 border-red-600" : "bg-red-50 border border-red-300"
                  )}
                  onPress={() => {
                    setSectionFilter("my_work");
                    setStatusFilter("overdue");
                    setButtonLabel("Overdue - My Action Required Now");
                    onNavigateToTasks();
                  }}
                >
                  <Text className={cn(
                    "text-4xl mb-1",
                    isDarkMode ? "font-black text-red-300" : "font-bold text-red-700"
                  )}>
                    {myOverdueTasks.length + inboxOverdueTasks.length}
                  </Text>
                  <Text className={cn(
                    "text-center text-base font-semibold",
                    isDarkMode ? "text-red-200" : "text-red-600"
                  )} numberOfLines={2}>
                    My Action{'\n'}Required Now
                  </Text>
                </Pressable>
                
                {/* Chase Now */}
                <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-3 items-center",
                    isDarkMode ? "bg-red-900 border-2 border-red-600" : "bg-red-50 border border-red-300"
                  )}
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("overdue");
                    setButtonLabel("Overdue - Follow Up Now");
                    onNavigateToTasks();
                  }}
                >
                  <Text className={cn(
                    "text-4xl mb-1",
                    isDarkMode ? "font-black text-red-300" : "font-bold text-red-700"
                  )}>
                    {outboxOverdueTasks.length}
                  </Text>
                  <Text className={cn(
                    "text-center text-base font-semibold",
                    isDarkMode ? "text-red-200" : "text-red-600"
                  )} numberOfLines={2}>
                    Follow Up{'\n'}Now
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Divider */}
            <View className={cn("h-px mb-4", isDarkMode ? "bg-slate-700" : "bg-gray-200")} />

            {/* 2. TASKS FOR ME Section */}
            <View className="mb-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="mail-outline" size={20} color={isDarkMode ? "#fbbf24" : "#f59e0b"} />
                <Text className={cn(
                  "text-lg font-bold ml-2",
                  isDarkMode ? "text-amber-400" : "text-amber-600"
                )}>
                  {isDarkMode ? "TASKS FOR ME" : "Tasks for me"}
                </Text>
              </View>
              <View className={cn("flex-row", isDarkMode ? "gap-3" : "gap-2")}>
                {/* New Incoming Tasks */}
                <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-3 items-center",
                    isDarkMode ? "bg-amber-900 border-2 border-amber-600" : "bg-yellow-50 border border-yellow-300"
                  )}
                  onPress={() => {
                    setSectionFilter("inbox");
                    setStatusFilter("received");
                    setButtonLabel("Tasks for me - New Requests");
                    onNavigateToTasks();
                  }}
                >
                  <Text className={cn(
                    "text-4xl mb-1",
                    isDarkMode ? "font-black text-amber-300" : "font-bold text-yellow-700"
                  )}>
                    {inboxReceivedTasks.length}
                  </Text>
                  <Text className={cn(
                    "text-center text-base font-semibold",
                    isDarkMode ? "text-amber-200" : "text-yellow-600"
                  )} numberOfLines={2}>
                    New{'\n'}Requests
                  </Text>
                </Pressable>
                
                {/* My On-going Tasks */}
                <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-3 items-center",
                    isDarkMode ? "bg-violet-900 border-2 border-violet-600" : "bg-orange-50 border border-orange-300"
                  )}
                  onPress={() => {
                    setSectionFilter("my_work");
                    setStatusFilter("wip");
                    setButtonLabel("Tasks for me - Current Tasks");
                    onNavigateToTasks();
                  }}
                >
                  <Text className={cn(
                    "text-4xl mb-1",
                    isDarkMode ? "font-black text-violet-300" : "font-bold text-orange-700"
                  )}>
                    {myWIPTasks.length + inboxWIPTasks.length}
                  </Text>
                  <Text className={cn(
                    "text-center text-base font-semibold",
                    isDarkMode ? "text-violet-200" : "text-orange-600"
                  )} numberOfLines={2}>
                    Current{'\n'}Tasks
                  </Text>
                </Pressable>
                
                {/* Completed Review Now */}
                <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-3 items-center",
                    isDarkMode ? "bg-cyan-900 border-2 border-cyan-600" : "bg-blue-50 border border-blue-300"
                  )}
                  onPress={() => {
                    setSectionFilter("inbox");
                    setStatusFilter("reviewing");
                    setButtonLabel("Tasks for me - Pending my review");
                    onNavigateToTasks();
                  }}
                >
                  <Text className={cn(
                    "text-4xl mb-1",
                    isDarkMode ? "font-black text-cyan-300" : "font-bold text-blue-700"
                  )}>
                    {inboxReviewingTasks.length}
                  </Text>
                  <Text className={cn(
                    "text-center text-base font-semibold",
                    isDarkMode ? "text-cyan-200" : "text-blue-600"
                  )} numberOfLines={2}>
                    Pending{'\n'}my review
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Divider */}
            <View className={cn("h-px mb-4", isDarkMode ? "bg-slate-700" : "bg-gray-200")} />

            {/* 3. TASKS FROM ME Section */}
            <View className="mb-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="paper-plane-outline" size={20} color={isDarkMode ? "#a78bfa" : "#8b5cf6"} />
                <Text className={cn(
                  "text-lg font-bold ml-2",
                  isDarkMode ? "text-purple-400" : "text-purple-600"
                )}>
                  {isDarkMode ? "TASKS FROM ME" : "Tasks from me"}
                </Text>
              </View>
              <View className={cn("flex-row", isDarkMode ? "gap-3" : "gap-2")}>
                {/* Waiting to Be Accepted */}
                <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-3 items-center",
                    isDarkMode ? "bg-amber-900 border-2 border-amber-600" : "bg-yellow-50 border border-yellow-300"
                  )}
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("assigned");
                    setButtonLabel("Tasks from me - Pending Acceptance");
                    onNavigateToTasks();
                  }}
                >
                  <Text className={cn(
                    "text-4xl mb-1",
                    isDarkMode ? "font-black text-amber-300" : "font-bold text-yellow-700"
                  )}>
                    {outboxAssignedTasks.length}
                  </Text>
                  <Text className={cn(
                    "text-center text-base font-semibold",
                    isDarkMode ? "text-amber-200" : "text-yellow-600"
                  )} numberOfLines={2}>
                    Pending{'\n'}Acceptance
                  </Text>
                </Pressable>
                
                {/* Others Working on My Tasks */}
                <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-3 items-center",
                    isDarkMode ? "bg-violet-900 border-2 border-violet-600" : "bg-orange-50 border border-orange-300"
                  )}
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("wip");
                    setButtonLabel("Tasks from me - Team Proceeding");
                    onNavigateToTasks();
                  }}
                >
                  <Text className={cn(
                    "text-4xl mb-1",
                    isDarkMode ? "font-black text-violet-300" : "font-bold text-orange-700"
                  )}>
                    {outboxWIPTasks.length}
                  </Text>
                  <Text className={cn(
                    "text-center text-base font-semibold",
                    isDarkMode ? "text-violet-200" : "text-orange-600"
                  )} numberOfLines={2}>
                    Team{'\n'}Proceeding
                  </Text>
                </Pressable>
                
                {/* Sent for Review */}
                <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-3 items-center",
                    isDarkMode ? "bg-cyan-900 border-2 border-cyan-600" : "bg-blue-50 border border-blue-300"
                  )}
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("reviewing");
                    setButtonLabel("Tasks from me - Pending Approval");
                    onNavigateToTasks();
                  }}
                >
                  <Text className={cn(
                    "text-4xl mb-1",
                    isDarkMode ? "font-black text-cyan-300" : "font-bold text-blue-700"
                  )}>
                    {outboxReviewingTasks.length}
                  </Text>
                  <Text className={cn(
                    "text-center text-base font-semibold",
                    isDarkMode ? "text-cyan-200" : "text-blue-600"
                  )} numberOfLines={2}>
                    Pending{'\n'}Approval
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Divider */}
            <View className={cn("h-px mb-4", isDarkMode ? "bg-slate-700" : "bg-gray-200")} />

            {/* 4. ACCOMPLISHMENTS Section */}
            <View>
              <View className="flex-row items-center mb-3">
                <Ionicons name="trophy-outline" size={18} color={isDarkMode ? "#34d399" : "#10b981"} />
                <Text className={cn(
                  "text-base font-bold ml-2",
                  isDarkMode ? "text-emerald-400" : "text-green-600"
                )}>
                  {isDarkMode ? "ACCOMPLISHMENTS" : "Accomplishments"}
                </Text>
              </View>
              <View className={cn("flex-row", isDarkMode ? "gap-3" : "gap-2")}>
                {/* All Done Tasks */}
                <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-4 items-center",
                    isDarkMode ? "bg-emerald-900 border-2 border-emerald-600" : "bg-green-50 border border-green-300"
                  )}
                  onPress={() => {
                    setSectionFilter("my_work");
                    setStatusFilter("done");
                    setButtonLabel("Accomplishments - Work Accepted");
                    onNavigateToTasks();
                  }}
                >
                  <Text className={cn(
                    "text-4xl mb-1",
                    isDarkMode ? "font-black text-emerald-300" : "font-bold text-green-700"
                  )}>
                    {myDoneTasks.length + inboxDoneTasks.length + outboxDoneTasks.length}
                  </Text>
                  <Text className={cn(
                    "text-center text-base font-semibold",
                    isDarkMode ? "text-emerald-200" : "text-green-600"
                  )} numberOfLines={2}>
                    Work{'\n'}Accepted
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
          )}

          {/* ===== QUICK OVERVIEW SECTION (COLLAPSIBLE) ===== */}
          {selectedProjectId && (
          <View className={cn(
            "rounded-2xl mb-4",
            isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"
          )}>
            {/* Header with Collapse/Expand */}
            <Pressable 
              onPress={() => setIsQuickOverviewExpanded(!isQuickOverviewExpanded)}
              className="p-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                {isDarkMode ? (
                  <View className="bg-blue-500/20 rounded-full p-2">
                    <Ionicons name="list-outline" size={20} color="#60a5fa" />
                  </View>
                ) : (
                  <Ionicons name="list-outline" size={20} color="#3b82f6" />
                )}
                <Text className={cn(
                  "text-lg font-bold ml-3",
                  isDarkMode ? "text-white" : "text-gray-900"
                )}>
                  Quick Overview
                </Text>
              </View>
              <Ionicons 
                name={isQuickOverviewExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={isDarkMode ? "#94a3b8" : "#6b7280"} 
              />
            </Pressable>

            {/* Collapsible Content */}
            {isQuickOverviewExpanded && (
              <View className="px-4 pb-4">
                {/* Section 1: My Tasks */}
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle-outline" size={18} color={isDarkMode ? "#34d399" : "#10b981"} />
                  <Text className={cn(
                    "text-base font-bold ml-2",
                    isDarkMode ? "text-emerald-400" : "text-gray-900"
                  )}>
                    My Tasks ({myTasksTotal})
                  </Text>
                </View>
                <Text className={cn(
                  "text-sm italic",
                  isDarkMode ? "text-slate-400" : "text-gray-500"
                )}>
                  Tap star in Tasks screen
                </Text>
              </View>
              
              <View className="flex-row gap-2">
                {/* Rejected */}
                  <Pressable 
                    className={cn(
                      "flex-1 rounded-lg p-2 items-center",
                      isDarkMode ? "bg-amber-900 border border-amber-600" : "bg-yellow-50 border border-yellow-300"
                    )}
                    onPress={() => {
                    setSectionFilter("my_tasks");
                      setStatusFilter("rejected");
                      setButtonLabel("My Tasks - Rejected");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className={cn(
                      "text-3xl mb-1",
                      isDarkMode ? "font-bold text-amber-300" : "font-bold text-yellow-700"
                    )}>{myRejectedTasks.length}</Text>
                    <Text className={cn(
                      "text-center font-medium",
                      isDarkMode ? "text-sm text-amber-200" : "text-sm text-yellow-600"
                    )} numberOfLines={1}>Rejected</Text>
                  </Pressable>
                  
                {/* WIP */}
                  <Pressable 
                    className={cn(
                      "flex-1 rounded-lg p-2 items-center",
                      isDarkMode ? "bg-orange-900 border border-orange-600" : "bg-orange-50 border border-orange-300"
                    )}
                    onPress={() => {
                      setSectionFilter("my_tasks");
                      setStatusFilter("wip");
                      setButtonLabel("My Tasks - WIP");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className={cn(
                      "text-3xl mb-1",
                      isDarkMode ? "font-bold text-orange-300" : "font-bold text-orange-700"
                    )}>{myWIPTasks.length}</Text>
                    <Text className={cn(
                      "text-center font-medium",
                      isDarkMode ? "text-sm text-orange-200" : "text-sm text-orange-600"
                    )} numberOfLines={1}>WIP</Text>
                  </Pressable>
                  
                {/* Done */}
                  <Pressable 
                    className={cn(
                      "flex-1 rounded-lg p-2 items-center",
                      isDarkMode ? "bg-emerald-900 border border-emerald-600" : "bg-green-50 border border-green-300"
                    )}
                    onPress={() => {
                      setSectionFilter("my_tasks");
                      setStatusFilter("done");
                      setButtonLabel("My Tasks - Done");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className={cn(
                      "text-3xl mb-1",
                      isDarkMode ? "font-bold text-emerald-300" : "font-bold text-green-700"
                    )}>{myDoneTasks.length}</Text>
                    <Text className={cn(
                      "text-center font-medium",
                      isDarkMode ? "text-sm text-emerald-200" : "text-sm text-green-600"
                    )} numberOfLines={1}>Done</Text>
                  </Pressable>
                  
                {/* Overdue */}
                  <Pressable 
                    className={cn(
                      "flex-1 rounded-lg p-2 items-center",
                      isDarkMode ? "bg-red-900 border border-red-600" : "bg-red-50 border border-red-300"
                    )}
                    onPress={() => {
                      setSectionFilter("my_tasks");
                      setStatusFilter("overdue");
                      setButtonLabel("My Tasks - Overdue");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className={cn(
                      "text-3xl mb-1",
                      isDarkMode ? "font-bold text-red-300" : "font-bold text-red-700"
                    )}>{myOverdueTasks.length}</Text>
                    <Text className={cn(
                      "text-center font-medium",
                      isDarkMode ? "text-sm text-red-200" : "text-sm text-red-600"
                    )} numberOfLines={1}>Overdue</Text>
                  </Pressable>
                </View>
            </View>

            {/* Divider */}
            <View className={cn("h-px my-4", isDarkMode ? "bg-slate-700" : "bg-gray-200")} />

            {/* Section 2: Inbox */}
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="mail-outline" size={isDarkMode ? 18 : 20} color={isDarkMode ? "#60a5fa" : "#3b82f6"} />
                  <Text className={cn(
                    "text-base font-bold ml-2",
                    isDarkMode ? "text-blue-400" : "text-gray-900"
                  )}>
                    Inbox ({inboxTotal})
                  </Text>
                </View>
              </View>
              
              <View className="flex-row gap-2">
                {/* Received */}
                  <Pressable 
                    className={cn(
                      "flex-1 rounded-lg p-2 items-center",
                      isDarkMode ? "bg-amber-900 border border-amber-600" : "bg-yellow-50 border border-yellow-300"
                    )}
                    onPress={() => {
                      setSectionFilter("inbox");
                      setStatusFilter("received");
                      setButtonLabel("Inbox - Received");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className={cn(
                      "text-3xl mb-1",
                      isDarkMode ? "font-bold text-amber-300" : "font-bold text-yellow-700"
                    )}>{inboxReceivedTasks.length}</Text>
                    <Text className={cn(
                      "text-center font-medium",
                      isDarkMode ? "text-sm text-amber-200" : "text-sm text-yellow-600"
                    )} numberOfLines={1}>Received</Text>
                  </Pressable>
                  
                {/* WIP */}
                  <Pressable 
                    className={cn(
                      "flex-1 rounded-lg p-2 items-center",
                      isDarkMode ? "bg-orange-900 border border-orange-600" : "bg-orange-50 border border-orange-300"
                    )}
                    onPress={() => {
                      setSectionFilter("inbox");
                      setStatusFilter("wip");
                      setButtonLabel("Inbox - WIP");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className={cn(
                      "text-3xl mb-1",
                      isDarkMode ? "font-bold text-orange-300" : "font-bold text-orange-700"
                    )}>{inboxWIPTasks.length}</Text>
                    <Text className={cn(
                      "text-center font-medium",
                      isDarkMode ? "text-sm text-orange-200" : "text-sm text-orange-600"
                    )} numberOfLines={1}>WIP</Text>
                  </Pressable>
                  
                {/* Reviewing */}
                  <Pressable 
                    className={cn(
                      "flex-1 rounded-lg p-2 items-center",
                      isDarkMode ? "bg-cyan-900 border border-cyan-600" : "bg-blue-50 border border-blue-300"
                    )}
                    onPress={() => {
                      setSectionFilter("inbox");
                      setStatusFilter("reviewing");
                      setButtonLabel("Inbox - Reviewing");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className={cn(
                      "text-3xl mb-1",
                      isDarkMode ? "font-bold text-cyan-300" : "font-bold text-blue-700"
                    )}>{inboxReviewingTasks.length}</Text>
                    <Text className={cn(
                      "text-center font-medium",
                      isDarkMode ? "text-sm text-cyan-200" : "text-sm text-blue-600"
                    )} numberOfLines={1}>Reviewing</Text>
                  </Pressable>
                  
                {/* Done */}
                  <Pressable 
                    className={cn(
                      "flex-1 rounded-lg p-2 items-center",
                      isDarkMode ? "bg-emerald-900 border border-emerald-600" : "bg-green-50 border border-green-300"
                    )}
                    onPress={() => {
                      setSectionFilter("inbox");
                      setStatusFilter("done");
                      setButtonLabel("Inbox - Done");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className={cn(
                      "text-3xl mb-1",
                      isDarkMode ? "font-bold text-emerald-300" : "font-bold text-green-700"
                    )}>{inboxDoneTasks.length}</Text>
                    <Text className={cn(
                      "text-center font-medium",
                      isDarkMode ? "text-sm text-emerald-200" : "text-sm text-green-600"
                    )} numberOfLines={1}>Done</Text>
                  </Pressable>
                  
                {/* Overdue */}
                  <Pressable 
                    className={cn(
                      "flex-1 rounded-lg p-2 items-center",
                      isDarkMode ? "bg-red-900 border border-red-600" : "bg-red-50 border border-red-300"
                    )}
                    onPress={() => {
                      setSectionFilter("inbox");
                      setStatusFilter("overdue");
                      setButtonLabel("Inbox - Overdue");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className={cn(
                      "text-3xl mb-1",
                      isDarkMode ? "font-bold text-red-300" : "font-bold text-red-700"
                    )}>{inboxOverdueTasks.length}</Text>
                    <Text className={cn(
                      "text-center font-medium",
                      isDarkMode ? "text-sm text-red-200" : "text-sm text-red-600"
                    )} numberOfLines={1}>Overdue</Text>
                  </Pressable>
                </View>
            </View>

            {/* Divider */}
            <View className={cn("h-px my-4", isDarkMode ? "bg-slate-700" : "bg-gray-200")} />

            {/* Section 3: Outbox */}
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="send-outline" size={isDarkMode ? 18 : 20} color={isDarkMode ? "#a78bfa" : "#7c3aed"} />
                  <Text className={cn(
                    "text-base font-bold ml-2",
                    isDarkMode ? "text-purple-400" : "text-gray-900"
                  )}>
                    Outbox ({outboxTotal})
                  </Text>
                </View>
              </View>
              
              <View className="flex-row gap-2">
                {/* Assigned */}
                  <Pressable 
                    className={cn(
                      "flex-1 rounded-lg p-2 items-center",
                      isDarkMode ? "bg-amber-900 border border-amber-600" : "bg-yellow-50 border border-yellow-300"
                    )}
                    onPress={() => {
                      setSectionFilter("outbox");
                      setStatusFilter("assigned");
                      setButtonLabel("Outbox - Assigned");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className={cn(
                      "text-3xl mb-1",
                      isDarkMode ? "font-bold text-amber-300" : "font-bold text-yellow-700"
                    )}>{outboxAssignedTasks.length}</Text>
                    <Text className={cn(
                      "text-center font-medium",
                      isDarkMode ? "text-sm text-amber-200" : "text-sm text-yellow-600"
                    )} numberOfLines={1}>Assigned</Text>
                  </Pressable>
                  
                {/* WIP */}
                  <Pressable 
                    className={cn(
                      "flex-1 rounded-lg p-2 items-center",
                      isDarkMode ? "bg-orange-900 border border-orange-600" : "bg-orange-50 border border-orange-300"
                    )}
                    onPress={() => {
                      setSectionFilter("outbox");
                      setStatusFilter("wip");
                      setButtonLabel("Outbox - WIP");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className={cn(
                      "text-3xl mb-1",
                      isDarkMode ? "font-bold text-orange-300" : "font-bold text-orange-700"
                    )}>{outboxWIPTasks.length}</Text>
                    <Text className={cn(
                      "text-center font-medium",
                      isDarkMode ? "text-sm text-orange-200" : "text-sm text-orange-600"
                    )} numberOfLines={1}>WIP</Text>
                  </Pressable>
                  
                {/* Reviewing */}
                  <Pressable 
                    className={cn(
                      "flex-1 rounded-lg p-2 items-center",
                      isDarkMode ? "bg-cyan-900 border border-cyan-600" : "bg-blue-50 border border-blue-300"
                    )}
                    onPress={() => {
                      setSectionFilter("outbox");
                      setStatusFilter("reviewing");
                      setButtonLabel("Outbox - Reviewing");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className={cn(
                      "text-3xl mb-1",
                      isDarkMode ? "font-bold text-cyan-300" : "font-bold text-blue-700"
                    )}>{outboxReviewingTasks.length}</Text>
                    <Text className={cn(
                      "text-center font-medium",
                      isDarkMode ? "text-sm text-cyan-200" : "text-sm text-blue-600"
                    )} numberOfLines={1}>Reviewing</Text>
                  </Pressable>
                  
                {/* Done */}
                  <Pressable 
                    className={cn(
                      "flex-1 rounded-lg p-2 items-center",
                      isDarkMode ? "bg-emerald-900 border border-emerald-600" : "bg-green-50 border border-green-300"
                    )}
                    onPress={() => {
                      setSectionFilter("outbox");
                      setStatusFilter("done");
                      setButtonLabel("Outbox - Done");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className={cn(
                      "text-3xl mb-1",
                      isDarkMode ? "font-bold text-emerald-300" : "font-bold text-green-700"
                    )}>{outboxDoneTasks.length}</Text>
                    <Text className={cn(
                      "text-center font-medium",
                      isDarkMode ? "text-sm text-emerald-200" : "text-sm text-green-600"
                    )} numberOfLines={1}>Done</Text>
                  </Pressable>
                  
                {/* Overdue */}
                  <Pressable 
                    className={cn(
                      "flex-1 rounded-lg p-2 items-center",
                      isDarkMode ? "bg-red-900 border border-red-600" : "bg-red-50 border border-red-300"
                    )}
                    onPress={() => {
                      setSectionFilter("outbox");
                      setStatusFilter("overdue");
                      setButtonLabel("Outbox - Overdue");
                      onNavigateToTasks();
                    }}
                  >
                    <Text className={cn(
                      "text-3xl mb-1",
                      isDarkMode ? "font-bold text-red-300" : "font-bold text-red-700"
                    )}>{outboxOverdueTasks.length}</Text>
                    <Text className={cn(
                      "text-center font-medium",
                      isDarkMode ? "text-sm text-red-200" : "text-sm text-red-600"
                    )} numberOfLines={1}>Overdue</Text>
                  </Pressable>
              </View>
                </View>
              </View>
            )}
          </View>
          )}

          {/* Footer space for FAB */}
          <View className="h-32" />
        </View>
      </ScrollView>
      )}

      {/* Profile Menu Modal */}
      <Modal
        visible={showProfileMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <Pressable 
          className="flex-1 bg-black/50"
          onPress={() => setShowProfileMenu(false)}
        >
          <View className="absolute top-16 right-4 bg-white rounded-xl shadow-lg overflow-hidden min-w-[200px]"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            {/* User Info Header */}
            <View className="bg-blue-600 px-4 py-3 border-b border-blue-700">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3">
                  <Text className="text-blue-600 font-bold text-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base" numberOfLines={1}>
                    {user.name}
                  </Text>
                  <Text className="text-blue-100 text-sm capitalize">
                    {user.role}
                  </Text>
                </View>
              </View>
            </View>

            {/* Menu Options */}
            <View className="py-2">
              <Pressable
                onPress={() => {
                  setShowProfileMenu(false);
                  onNavigateToProjectPicker?.(true);
                }}
                className="flex-row items-center px-4 py-3 active:bg-gray-100"
              >
                <Ionicons name="business-outline" size={22} color="#3b82f6" />
                <Text className="text-gray-900 text-base font-medium ml-3">
                  Change Project
                </Text>
              </Pressable>

              <View className="h-px bg-gray-200 mx-4" />

              <Pressable
                onPress={() => {
                  setShowProfileMenu(false);
                  onNavigateToProfile();
                }}
                className="flex-row items-center px-4 py-3 active:bg-gray-100"
              >
                <Ionicons name="person-outline" size={22} color="#3b82f6" />
                <Text className="text-gray-900 text-base font-medium ml-3">
                  Profile & Settings
                </Text>
              </Pressable>

              <View className="h-px bg-gray-200 mx-4" />

              <Pressable
                onPress={() => {
                  setShowProfileMenu(false);
                  Alert.alert(
                    "Logout",
                    "Are you sure you want to logout?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { 
                        text: "Logout", 
                        style: "destructive",
                        onPress: logout
                      },
                    ]
                  );
                }}
                className="flex-row items-center px-4 py-3 active:bg-gray-100"
              >
                <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                <Text className="text-red-600 text-base font-medium ml-3">
                  Logout
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Expandable Utility FAB */}
      <ExpandableUtilityFAB 
        onCreateTask={onNavigateToCreateTask}
        onSearch={() => {
          setSectionFilter("my_work");
          onNavigateToTasks();
        }}
        onReports={onNavigateToReports}
      />

      {/* Project Switching Loading Overlay */}
      {isProjectSwitching && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <View className="bg-white rounded-xl p-6 items-center shadow-lg">
            <Text className="text-xl font-semibold text-gray-900 mb-2">
              Switching Project...
                </Text>
            <Text className="text-base text-gray-600 text-center">
              Refreshing all data for the new project
                </Text>
          </View>
              </View>
            )}
    </SafeAreaView>
  );
}
