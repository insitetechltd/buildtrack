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
  onNavigateToTaskDetail?: (taskId: string, subTaskId?: string) => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

export default function DashboardScreen({ 
  onNavigateToTasks, 
  onNavigateToCreateTask, 
  onNavigateToProfile,
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
      Alert.alert(t.dashboard.success, t.dashboard.dataRefreshed);
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      Alert.alert(t.dashboard.error, t.dashboard.refreshFailed);
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
    if (!user) return;
    
    // Mark as initialized when:
    // 1. Loading is complete (both projects and assignments have been fetched)
    // 2. We have either projects in the store OR we've confirmed the user has 0 projects
    // This ensures getProjectsByUser will return accurate results
    const hasProjectsLoaded = projects.length > 0;
    const hasAssignmentsLoaded = !isLoadingProjects; // When loading is false, assignments fetch is complete
    
    // Only mark as initialized if loading is complete
    // This prevents premature initialization before data is fetched
    if (!isLoadingProjects && (hasProjectsLoaded || userAssignments.length >= 0)) {
      // Additional check: if we have assignments but no projects, we might still be loading projects
      // So only mark initialized if we have projects OR we've confirmed user has 0 assignments
      if (hasProjectsLoaded || (userAssignments.length === 0 && hasAssignmentsLoaded)) {
        setHasInitialized(true);
      }
    }
  }, [projects.length, isLoadingProjects, user, userAssignments.length]);

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
    
    // Ensure projects have been fetched - if projects array is empty but we're not loading,
    // we might need to fetch them first
    if (projects.length === 0 && !isLoadingProjects) {
      console.log('⚠️ [DashboardScreen] Projects array is empty but not loading - fetching projects...');
      fetchProjects();
      fetchUserProjectAssignments(user.id);
      return; // Wait for next render after fetch
    }
    
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
      // BUT: Only validate if we have projects loaded (don't clear if projects are still loading or empty)
      // This prevents race conditions where projects haven't loaded yet (e.g., after phone login)
      if (selectedProjectId && 
          currentUserProjects.length > 0 && // Only validate if projects are actually loaded
          !currentUserProjects.some(p => p.id === selectedProjectId)) {
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
      <SafeAreaView edges={['bottom', 'left', 'right']} className={cn("flex-1", isDarkMode ? "bg-slate-900" : "bg-gray-50")}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <StandardHeader 
          title={t.nav.dashboard}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToProjectPicker={onNavigateToProjectPicker}
        />
        
        <View className="flex-1 items-center justify-center">
          <LoadingIndicator isLoading={true} />
          <Text className={cn("text-base mt-4", isDarkMode ? "text-slate-400" : "text-gray-600")}>
            {isLoadingProjects ? t.dashboard.loadingProjects : isLoadingTasks ? t.dashboard.loadingTasks : isLoadingUsers ? t.dashboard.loadingUsers : t.dashboard.loadingData}
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
  
  // Debug: Log project filtering
  console.log('🔍 [DASHBOARD DEBUG] Project filtering:', {
    selectedProjectId,
    totalTasks: tasks.length,
    projectFilteredTasksCount: projectFilteredTasks.length,
    projectFilteredTaskIds: projectFilteredTasks.map(t => t.id),
    allTaskProjects: [...new Set(tasks.map(t => t.projectId))]
  });

  // ✅ UPDATED: Simplified for unified tasks table
  // Get all nested tasks (tasks with parentTaskId) assigned by a user
  const getNestedTasksAssignedBy = (userId: string): Task[] => {
    return projectFilteredTasks.filter(task => 
      isNestedTask(task) && // Is a nested task
      String(task.assignedBy) === String(userId) // Use String() comparison for type safety
    );
  };

  // Get all nested tasks assigned to a user
  const getNestedTasksAssignedTo = (userId: string): Task[] => {
    const userIdStr = String(userId);
    return projectFilteredTasks.filter(task => {
      const assignedTo = task.assignedTo || [];
      return isNestedTask(task) && // Is a nested task
             Array.isArray(assignedTo) && 
             assignedTo.some(id => String(id) === userIdStr);
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
  const userIdStr = String(user.id);
  const myTasksParent = projectFilteredTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    // Use String() comparison to handle type mismatches (string vs number)
    const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
    const isCreatedByMe = String(task.assignedBy) === userIdStr;
    const matches = isTopLevelTask(task) && isAssignedToMe && isCreatedByMe;
    
    // Debug logging for Den's tasks - check if task is created by Den OR assigned to Den
    const denUserIds = ['68a2ad9a-b7f1-44c1-9f27-77a91679b79b']; // Den's known ID from debug output
    const isCreatedByDen = denUserIds.some(denId => String(task.assignedBy) === denId);
    const isAssignedToDen = denUserIds.some(denId => Array.isArray(assignedTo) && assignedTo.some(id => String(id) === denId));
    
    if (isCreatedByDen || isAssignedToDen || task.title?.toLowerCase().includes('den')) {
      console.log('🔍 [MY TASKS DEBUG] Den-related task check:', {
        id: task.id,
        title: task.title,
        assignedBy: task.assignedBy,
        assignedByType: typeof task.assignedBy,
        assignedTo,
        assignedToTypes: Array.isArray(assignedTo) ? assignedTo.map((id: any) => typeof id) : [],
        currentUserId: user.id,
        currentUserIdType: typeof user.id,
        currentUserIdStr: userIdStr,
        isAssignedToMe,
        isCreatedByMe,
        isTopLevel: isTopLevelTask(task),
        projectId: task.projectId,
        selectedProjectId,
        matches,
        inProjectFiltered: projectFilteredTasks.includes(task),
        isCreatedByDen,
        isAssignedToDen,
        isSelfAssignedByDen: isCreatedByDen && isAssignedToDen
      });
    }
    
    return matches; // Top-level only
  });

  const myTasksNested = getNestedTasksAssignedTo(user.id)
    .filter(task => String(task.assignedBy) === userIdStr);

  const myTasksAll = [...myTasksParent, ...myTasksNested];

  // Debug: Log all self-assigned tasks found
  console.log('🔍 [MY TASKS] Total self-assigned tasks found:', myTasksAll.length);
  console.log('🔍 [MY TASKS] Current user:', { id: user.id, name: user.name, idType: typeof user.id });
  myTasksAll.forEach(task => {
    console.log('  - Task:', {
      id: task.id,
      title: task.title,
      status: task.status,
      currentStatus: (task as any).currentStatus,
      assignedBy: task.assignedBy,
      assignedByType: typeof task.assignedBy,
      assignedTo: task.assignedTo,
      assignedToTypes: Array.isArray(task.assignedTo) ? task.assignedTo.map((id: any) => typeof id) : [],
      projectId: task.projectId,
      selectedProjectId,
      isSelfAssigned: String(task.assignedBy) === String(user.id) && 
                     Array.isArray(task.assignedTo) && 
                     task.assignedTo.some((id: any) => String(id) === String(user.id))
    });
  });
  
  // Also check for Den's self-assigned tasks specifically (regardless of current user)
  const denUserIds = ['68a2ad9a-b7f1-44c1-9f27-77a91679b79b']; // Den's ID from debug output
  const denSelfAssignedTasks = projectFilteredTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    return denUserIds.some(denId => {
      const isCreatedByDen = String(task.assignedBy) === String(denId);
      const isAssignedToDen = Array.isArray(assignedTo) && assignedTo.some((id: any) => String(id) === String(denId));
      return isCreatedByDen && isAssignedToDen;
    });
  });
  if (denSelfAssignedTasks.length > 0) {
    console.log(`🔍 [DEN SELF-ASSIGNED] Found ${denSelfAssignedTasks.length} Den self-assigned tasks in selected project:`, 
      denSelfAssignedTasks.map(t => ({ 
        id: t.id, 
        title: t.title, 
        status: t.status,
        assignedBy: t.assignedBy,
        assignedTo: t.assignedTo,
        projectId: t.projectId
      }))
    );
  } else {
    console.log('🔍 [DEN SELF-ASSIGNED] No Den self-assigned tasks found in selected project');
    // Check all projects
    const denSelfAssignedAllProjects = tasks.filter(task => {
      const assignedTo = task.assignedTo || [];
      return denUserIds.some(denId => {
        const isCreatedByDen = String(task.assignedBy) === String(denId);
        const isAssignedToDen = Array.isArray(assignedTo) && assignedTo.some((id: any) => String(id) === String(denId));
        return isCreatedByDen && isAssignedToDen;
      });
    });
    if (denSelfAssignedAllProjects.length > 0) {
      console.log(`🔍 [DEN SELF-ASSIGNED] But found ${denSelfAssignedAllProjects.length} Den self-assigned tasks in ALL projects:`, 
        denSelfAssignedAllProjects.map(t => ({ 
          id: t.id, 
          title: t.title, 
          status: t.status,
          projectId: t.projectId,
          inSelectedProject: t.projectId === selectedProjectId,
          selectedProjectId
        }))
      );
    } else {
      console.log('🔍 [DEN SELF-ASSIGNED] ⚠️ No Den self-assigned tasks found in tasks array at all!');
      console.log('🔍 [DEN SELF-ASSIGNED] Total tasks in store:', tasks.length);
      console.log('🔍 [DEN SELF-ASSIGNED] All task IDs:', tasks.map(t => t.id));
    }
  }

  // My Tasks: WIP (in_progress, new, accepted, or rejected for rework, INCLUDING overdue)
  // Use status or currentStatus (for backward compatibility)
  // NOTE: Self-assigned tasks with "new" status should be included (they're auto-accepted)
  // NOTE: Overdue tasks are now included in WIP (redistributed from removed overdue button)
  const getTaskStatus = (task: any) => task.status || task.currentStatus || 'not_started';
  const myWIPTasks = myTasksAll.filter(task => {
    const status = getTaskStatus(task);
    // Include: in_progress, new (self-assigned auto-accepted), accepted, or rejected
    // REMOVED: !isOverdue(task) condition - overdue tasks now included in WIP
    return (status === "in_progress" || status === "new" || status === "accepted" || status === "rejected");
  });
  
  // My Tasks: Done (approved status)
  const myDoneTasks = myTasksAll.filter(task => {
    const status = getTaskStatus(task);
    return status === "approved";
  });
  
  // My Tasks: Overdue (past due, not complete, not rejected)
  // Match TasksScreen filter: only excludes rejected, doesn't require specific status
  const myOverdueTasks = myTasksAll.filter(task => {
    const status = getTaskStatus(task);
    return task.completionPercentage < 100 &&
           isOverdue(task) &&
           status !== "rejected";
  });
  
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

  // Inbox: Received (new status - waiting for assignee response)
  const inboxReceivedTasks = inboxAll.filter(task => 
    task.status === "new"
  );
  
  // Inbox: WIP (in_progress or rejected for rework, INCLUDING overdue)
  // NOTE: Overdue tasks are now included in WIP (redistributed from removed overdue button)
  const inboxWIPTasks = inboxAll.filter(task => {
    // REMOVED: !isOverdue(task) condition - overdue tasks now included in WIP
    return (task.status === "in_progress" || task.status === "rejected");
  });

  // Inbox: Reviewing (tasks I CREATED that are submitted_for_review OR declined by assignee)
  // NOTE: Includes both top-level and nested tasks (all tasks I created)
  // For assigners: Shows declined tasks at any completion % (so they can see what was declined and modify/reassign)
  // For assignees: Declined tasks with 0% completion don't appear in any button (they rejected it)
  const inboxReviewingTasks = projectFilteredTasks.filter(task => {
    const isCreatedByMeForReview = String(task.assignedBy) === String(user.id);
    // Match TasksScreen filter: submitted_for_review requires completionPercentage === 100
    // Declined tasks can be at any completion percentage
    return isCreatedByMeForReview && 
           ((task.status === "submitted_for_review" && task.completionPercentage === 100) ||
            (task.status === "declined"));
  });

  // Inbox: Done (approved status)
  const inboxDoneTasks = inboxAll.filter(task =>
    task.status === "approved"
  );
  
  // Inbox: Overdue (past due, not complete, not rejected)
  // Match TasksScreen filter: only excludes rejected, doesn't require specific status
  const inboxOverdueTasks = inboxAll.filter(task => {
    const status = getTaskStatus(task);
    return task.completionPercentage < 100 &&
           isOverdue(task) &&
           status !== "rejected";
  });

  const inboxTotal = inboxAll.length;

  // ===== OUTBOX SECTION =====
  // Outbox: Tasks I assigned TO others (not self-assigned only, not cancelled)
  const outboxParentTasks = projectFilteredTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
    // Use String() comparison to handle type mismatches
    const isCreatedByMe = String(task.assignedBy) === String(user.id);
    const isSelfAssignedOnly = isCreatedByMe && isAssignedToMe && assignedTo.length === 1;
    const isTopLevel = isTopLevelTask(task);
    const isNotCancelled = task.status !== "cancelled";
    const matches = isTopLevel && isCreatedByMe && !isSelfAssignedOnly && isNotCancelled;
    
    // Debug logging for Task 3
    if (task.title?.toLowerCase().includes("task 3") || 
        (String(task.assignedBy) === String(user.id) && task.completionPercentage === 100)) {
      console.log('📦 [OUTBOX PARENT DEBUG] Task check:', {
        id: task.id,
        title: task.title,
        assignedBy: task.assignedBy,
        assignedByType: typeof task.assignedBy,
        userId: user.id,
        userIdType: typeof user.id,
        isCreatedByMe,
        assignedTo,
        isAssignedToMe,
        isSelfAssignedOnly,
        isTopLevel,
        isNotCancelled,
        matches,
        inProjectFiltered: projectFilteredTasks.includes(task)
      });
    }
    
    return matches;
  });

  const outboxNestedTasks = getNestedTasksAssignedBy(user.id)
    .filter(task => {
      const assignedTo = task.assignedTo || [];
      return !Array.isArray(assignedTo) || !assignedTo.includes(user.id);
    });

  const outboxAll = [...outboxParentTasks, ...outboxNestedTasks];

  // Outbox: Assigned (new status - waiting for assignee acceptance)
  const outboxAssignedTasks = outboxAll.filter(task =>
    task.status === "new"
  );
  
  // Outbox: WIP (accepted, in_progress, or rejected for rework, but NOT tasks submitted for review)
  // Includes tasks at 100% that haven't been submitted for review yet
  // NOTE: Declined tasks should NOT appear here - they appear in "Pending my review" only
  // NOTE: Overdue tasks are now included in WIP (redistributed from removed overdue button)
  const outboxWIPTasks = outboxAll.filter(task => {
    // Exclude tasks submitted for review - they should only appear in "reviewing" filter
    if (task.status === "submitted_for_review") {
      return false;
    }
    // Exclude approved tasks (they're done)
    if (task.status === "approved") {
      return false;
    }
    // Exclude declined tasks - they should only appear in "Pending my review"
    if (task.status === "declined") {
      return false;
    }
    // Include rejected tasks (needs rework)
    if (task.status === "rejected") {
      return true;
    }
    // Include tasks at 100% that are NOT submitted for review and NOT approved
    // These are tasks where assignee completed work but hasn't submitted for review yet
    if (task.completionPercentage === 100 && 
        (task.status === "accepted" || task.status === "in_progress")) {
      return true;
    }
    // Include accepted or in_progress tasks that are not complete
    // REMOVED: !isOverdue(task) condition - overdue tasks now included in WIP
    return (task.status === "accepted" || task.status === "in_progress") &&
           task.completionPercentage < 100;
  });

  // Outbox: Reviewing (tasks assigned TO me that are submitted_for_review - pending my approval)
  // NOTE: This matches the TasksScreen filter which shows tasks assigned TO me (not created by me)
  const outboxReviewingTasks = projectFilteredTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    const userIdStr = String(user.id);
    const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
    const isCreatedByMe = String(task.assignedBy) === userIdStr;
    // Count tasks assigned TO me (not created by me) that are submitted for review
    // This matches the filter logic in TasksScreen
    return !isCreatedByMe &&
           isAssignedToMe &&
           task.completionPercentage === 100 &&
           task.status === "submitted_for_review";
  });
  
  // Outbox: Done (approved status)
  const outboxDoneTasks = outboxAll.filter(task => 
    task.status === "approved"
  );
  
  // Outbox: Overdue (past due, not complete, not rejected)
  // Match TasksScreen filter: only excludes rejected, doesn't require specific status
  const outboxOverdueTasks = outboxAll.filter(task => {
    const status = getTaskStatus(task);
    return task.completionPercentage < 100 &&
           isOverdue(task) &&
           status !== "rejected";
  });

  const outboxTotal = outboxAll.length;

  // ===== OVERDUE COUNTS FOR EACH BUTTON =====
  // Calculate overdue counts for each button category
  const getOverdueCountForMyWIPTasks = () => {
    return myWIPTasks.filter(task => {
      const status = getTaskStatus(task);
      return task.completionPercentage < 100 &&
             isOverdue(task) &&
             status !== "rejected";
    }).length;
  };

  const getOverdueCountForInboxWIPTasks = () => {
    return inboxWIPTasks.filter(task => {
      const status = getTaskStatus(task);
      return task.completionPercentage < 100 &&
             isOverdue(task) &&
             status !== "rejected";
    }).length;
  };

  const getOverdueCountForOutboxWIPTasks = () => {
    return outboxWIPTasks.filter(task => {
      const status = getTaskStatus(task);
      return task.completionPercentage < 100 &&
             isOverdue(task) &&
             status !== "rejected";
    }).length;
  };

  const getOverdueCountForNewRequests = () => {
    return inboxReceivedTasks.filter(task => {
      return isOverdue(task);
    }).length;
  };

  const getOverdueCountForPendingMyReview = () => {
    return inboxReviewingTasks.filter(task => {
      return isOverdue(task);
    }).length;
  };

  const getOverdueCountForPendingAcceptance = () => {
    return outboxAssignedTasks.filter(task => {
      return isOverdue(task);
    }).length;
  };

  const getOverdueCountForPendingApproval = () => {
    return outboxReviewingTasks.filter(task => {
      return isOverdue(task);
    }).length;
  };

  // Overdue counts for each button
  const currentTasksOverdueCount = getOverdueCountForMyWIPTasks() + getOverdueCountForInboxWIPTasks();
  const teamProceedingOverdueCount = getOverdueCountForOutboxWIPTasks();
  const newRequestsOverdueCount = getOverdueCountForNewRequests();
  const pendingMyReviewOverdueCount = getOverdueCountForPendingMyReview();
  const pendingAcceptanceOverdueCount = getOverdueCountForPendingAcceptance();
  const pendingApprovalOverdueCount = getOverdueCountForPendingApproval();

  // ===== CATCH-ALL: Tasks not covered by the 9 main buttons =====
  // This identifies any gaps in the categorization logic
  const catchAllTasks = projectFilteredTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    const userIdStr = String(user.id);
    const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
    const isCreatedByMe = String(task.assignedBy) === userIdStr;
    
    // Only include tasks related to the user
    if (!isAssignedToMe && !isCreatedByMe) {
      return false;
    }
    
    const status = getTaskStatus(task);
    const isSelfAssignedOnly = isCreatedByMe && isAssignedToMe && assignedTo.length === 1;
    const isInMyTasks = (isAssignedToMe && isCreatedByMe) || (isCreatedByMe && task.status === "rejected");
    const isInInbox = isAssignedToMe && !isCreatedByMe;
    const isInOutbox = isCreatedByMe && !isSelfAssignedOnly && task.status !== "rejected";
    
    // Exclude cancelled tasks (they shouldn't appear in any category)
    if (task.status === "cancelled" || status === "cancelled") {
      return false;
    }
    
    // Exclude declined tasks with 0% completion ONLY if user is the assignee (not the creator)
    // For assigners: Declined tasks should appear in "Pending my review" so they can modify/reassign
    // For assignees: Declined tasks with 0% completion don't appear (they rejected it)
    if (task.status === "declined" && task.completionPercentage === 0 && isInInbox) {
      return false; // Assignee rejected it, don't show in catch-all
    }
    // Note: Declined tasks created by me are covered by "Pending my review" button
    
    // Track why task is/isn't excluded
    const exclusionReasons: string[] = [];
    
    // Exclude tasks that match any of the main button criteria:
    
    // 1. My Action Required Now (my_work + overdue) - REMOVED BUTTON
    // Tasks now covered by "Current Tasks" (my_work + wip) which includes overdue
    // No longer need to exclude here - they're included in WIP filter
    
    // 2. Follow Up Now (outbox + overdue) - REMOVED BUTTON
    // Tasks now covered by "Team Proceeding" (outbox + wip) which includes overdue
    // No longer need to exclude here - they're included in WIP filter
    
    // 3. New Requests (inbox + received)
    if (isInInbox && status === "new" && !task.declinedReason && task.completionPercentage < 100) {
      exclusionReasons.push("3. New Requests");
      return false; // Covered by "New Requests"
    }
    
    // 4. Current Tasks (my_work + wip) - NOW INCLUDES OVERDUE TASKS
    if (isInMyTasks || isInInbox) {
      if (task.status === "rejected") {
        // Rejected tasks are included in WIP (no overdue check needed)
        exclusionReasons.push("4. Current Tasks (rejected)");
        return false; // Covered by "Current Tasks" (rejected tasks in WIP)
      }
      if (isInMyTasks) {
        const isAcceptedOrInProgress = status === "accepted" || status === "in_progress" || status === "new";
        // REMOVED: !isOverdue(task) condition - overdue tasks now included in WIP
        if (isAcceptedOrInProgress && task.completionPercentage < 100 && status !== "approved") {
          exclusionReasons.push("4. Current Tasks (my_tasks)");
          return false; // Covered by "Current Tasks"
        }
      }
      if (isInInbox) {
        // REMOVED: !isOverdue(task) condition - overdue tasks now included in WIP
        if ((status === "accepted" || status === "in_progress") && 
            (task.completionPercentage < 100 || (task.completionPercentage === 100 && task.status !== "submitted_for_review")) &&
            status !== "approved") {
          exclusionReasons.push("4. Current Tasks (inbox)");
          return false; // Covered by "Current Tasks"
        }
      }
    }
    
    // 5. Pending my review (inbox + reviewing)
    // Include tasks I created that are:
    // - Submitted for review at 100% completion, OR
    // - Declined at any completion % (so assigner can see what was declined and modify/reassign)
    if (isCreatedByMe && 
        ((task.status === "submitted_for_review" && task.completionPercentage === 100) ||
         (task.status === "declined"))) {
      exclusionReasons.push("5. Pending my review");
      return false; // Covered by "Pending my review"
    }
    
    // 6. Pending Acceptance (outbox + assigned)
    if (isInOutbox && status === "new" && !task.declinedReason) {
      exclusionReasons.push("6. Pending Acceptance");
      return false; // Covered by "Pending Acceptance"
    }
    
    // 7. Team Proceeding (outbox + wip) - NOW INCLUDES OVERDUE TASKS
    if (isInOutbox) {
      if (task.status === "rejected") {
        exclusionReasons.push("7. Team Proceeding (rejected)");
        return false; // Covered by "Team Proceeding" (rejected tasks in WIP)
      }
      // REMOVED: !isOverdue(task) condition - overdue tasks now included in WIP
      if ((status === "accepted" || status === "in_progress") &&
          (task.completionPercentage < 100 || (task.completionPercentage === 100 && task.status !== "submitted_for_review")) &&
          status !== "approved") {
        exclusionReasons.push("7. Team Proceeding");
        return false; // Covered by "Team Proceeding"
      }
    }
    
    // 8. Pending Approval (outbox + reviewing)
    if (!isCreatedByMe && isAssignedToMe && task.completionPercentage === 100 && task.status === "submitted_for_review") {
      exclusionReasons.push("8. Pending Approval");
      return false; // Covered by "Pending Approval"
    }
    
    // 9. Work Accepted (my_work + done)
    if (isInOutbox && status === "approved") {
      exclusionReasons.push("9. Work Accepted (outbox)");
      return false; // Covered by "Work Accepted"
    }
    if (isInMyTasks) {
      if (isSelfAssignedOnly && task.completionPercentage === 100) {
        exclusionReasons.push("9. Work Accepted (self-assigned)");
        return false; // Covered by "Work Accepted" (self-assigned done)
      }
      if (status === "approved") {
        exclusionReasons.push("9. Work Accepted (my_tasks)");
        return false; // Covered by "Work Accepted"
      }
    }
    if (isInInbox && status === "approved") {
      exclusionReasons.push("9. Work Accepted (inbox)");
      return false; // Covered by "Work Accepted"
    }
    
    // If we get here, the task is not covered by any of the 9 main buttons
    // Log detailed information about why this task is uncovered
    console.log('🔍 [CATCH-ALL] Uncovered task found:', {
      id: task.id,
      title: task.title,
      status: task.status,
      currentStatus: task.currentStatus,
      completionPercentage: task.completionPercentage,
      assignedBy: task.assignedBy,
      assignedTo: task.assignedTo,
      isAssignedToMe,
      isCreatedByMe,
      isSelfAssignedOnly,
      isInMyTasks,
      isInInbox,
      isInOutbox,
      isOverdue: isOverdue(task),
      declinedReason: task.declinedReason,
      dueDate: task.dueDate,
      exclusionReasons: exclusionReasons.length > 0 ? exclusionReasons : 'NONE - This is why it\'s uncovered',
      // Check each exclusion condition
      checks: {
        '1_MyActionRequired': isInMyTasks || isInInbox ? 
          (task.completionPercentage < 100 && isOverdue(task) && task.status !== "rejected") : false,
        '2_FollowUpNow': isInOutbox ? 
          ((status === "in_progress" || status === "accepted") && isOverdue(task)) : false,
        '3_NewRequests': isInInbox && status === "new" && !task.declinedReason && task.completionPercentage < 100,
        '4_CurrentTasks_rejected': (isInMyTasks || isInInbox) && task.status === "rejected" && !isOverdue(task),
        '4_CurrentTasks_myTasks': isInMyTasks ? 
          ((status === "accepted" || status === "in_progress" || status === "new") && 
           task.completionPercentage < 100 && !isOverdue(task) && status !== "approved") : false,
        '4_CurrentTasks_inbox': isInInbox ? 
          ((status === "accepted" || status === "in_progress") && !isOverdue(task) && 
           (task.completionPercentage < 100 || (task.completionPercentage === 100 && task.status !== "submitted_for_review")) &&
           status !== "approved") : false,
        '5_PendingMyReview': isCreatedByMe && task.completionPercentage === 100 && 
          (task.status === "submitted_for_review" || task.status === "declined"),
        '6_PendingAcceptance': isInOutbox && status === "new" && !task.declinedReason,
        '7_TeamProceeding_rejected': isInOutbox && task.status === "rejected",
        '7_TeamProceeding': isInOutbox ? 
          ((status === "accepted" || status === "in_progress") && !isOverdue(task) &&
           (task.completionPercentage < 100 || (task.completionPercentage === 100 && task.status !== "submitted_for_review")) &&
           status !== "approved") : false,
        '8_PendingApproval': !isCreatedByMe && isAssignedToMe && task.completionPercentage === 100 && task.status === "submitted_for_review",
        '9_WorkAccepted_outbox': isInOutbox && status === "approved",
        '9_WorkAccepted_selfAssigned': isInMyTasks && isSelfAssignedOnly && task.completionPercentage === 100,
        '9_WorkAccepted_myTasks': isInMyTasks && status === "approved",
        '9_WorkAccepted_inbox': isInInbox && status === "approved",
      }
    });
    
    return true;
  });
  
  // Log summary of uncovered tasks
  if (catchAllTasks.length > 0) {
    console.log(`🔍 [CATCH-ALL] Found ${catchAllTasks.length} uncovered task(s):`, 
      catchAllTasks.map(t => ({ id: t.id, title: t.title, status: t.status, completionPercentage: t.completionPercentage }))
    );
  }

  // Determine what to show based on user's project situation
  const shouldShowNoProjects = userProjectCount === 0;
  // Show an explicit fallback whenever the user has projects but no active selection.
  const shouldShowEmptyState = userProjectCount > 0 && !selectedProjectId;

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className={cn("flex-1", isDarkMode ? "bg-slate-900" : "bg-gray-50")}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {/* Header */}
      <StandardHeader 
        title={t.nav.dashboard}
        subtitle={selectedProject ? selectedProject.name : undefined}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToProjectPicker={(allowBack?: boolean) => {
          onNavigateToProjectPicker?.(allowBack);
        }}
      />

      {/* Main Content */}
      {shouldShowNoProjects ? (
        // Show "No Projects Yet" screen
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="folder-open-outline" size={64} color={isDarkMode ? "#94a3b8" : "#9ca3af"} />
          <Text className={cn("text-xl font-semibold mt-4 text-center", isDarkMode ? "text-white" : "text-gray-900")}>
            {t.dashboard.noProjectsYet}
          </Text>
          <Text className={cn("text-base mt-2 text-center", isDarkMode ? "text-slate-400" : "text-gray-600")}>
            {t.dashboard.noProjectsMessage}
          </Text>
        </View>
      ) : shouldShowEmptyState ? (
        // Show empty state for first-time multi-project users (picker will open automatically)
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="business-outline" size={64} color={isDarkMode ? "#94a3b8" : "#9ca3af"} />
          <Text className={cn("text-xl font-semibold mt-4 text-center", isDarkMode ? "text-white" : "text-gray-900")}>
            {t.dashboard.selectAProject}
          </Text>
          <Text className={cn("text-base mt-2 text-center", isDarkMode ? "text-slate-400" : "text-gray-600")}>
            {t.dashboard.selectProjectMessage}
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
                  {t.dashboard.keyTasks} ({starredTasks.length})
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

            {/* 2. TASKS FOR ME Section */}
            <View className="mb-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="mail-outline" size={20} color={isDarkMode ? "#fbbf24" : "#f59e0b"} />
                <Text className={cn(
                  "text-lg font-bold ml-2",
                  isDarkMode ? "text-amber-400" : "text-amber-600"
                )}>
                  {t.dashboard.tasksForMe}
                </Text>
              </View>
              <View className={cn("flex-row", isDarkMode ? "gap-3" : "gap-2")}>
                {/* New Incoming Tasks */}
                <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-3 items-center relative",
                    isDarkMode ? "bg-amber-900 border-2 border-amber-600" : "bg-yellow-50 border border-yellow-300"
                  )}
                  onPress={() => {
                    setSectionFilter("inbox");
                    setStatusFilter("received");
                    setButtonLabel("Tasks for me - New Requests");
                    onNavigateToTasks();
                  }}
                >
                  {/* Overdue indicator */}
                  {newRequestsOverdueCount > 0 && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setSectionFilter("inbox");
                        setStatusFilter("received-overdue");
                        setButtonLabel("Tasks for me - New Requests (Overdue)");
                        onNavigateToTasks();
                      }}
                      className={cn(
                        "absolute -top-1.5 -right-1.5 bg-red-500 rounded-full items-center justify-center border-2 border-white z-10",
                        newRequestsOverdueCount > 99 ? "px-2 py-1 min-w-[36px]" : "w-9 h-9"
                      )}
                    >
                      <Text className={cn(
                        "text-white font-bold",
                        newRequestsOverdueCount > 99 ? "text-xs" : "text-sm"
                      )}>
                        {newRequestsOverdueCount > 999 ? '999+' : newRequestsOverdueCount}
                      </Text>
                    </Pressable>
                  )}
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
                    {t.dashboard.newRequests}
                  </Text>
                </Pressable>
                
                {/* My On-going Tasks */}
                <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-3 items-center relative",
                    isDarkMode ? "bg-violet-900 border-2 border-violet-600" : "bg-orange-50 border border-orange-300"
                  )}
                  onPress={() => {
                    setSectionFilter("my_work");
                    setStatusFilter("wip");
                    setButtonLabel("Tasks for me - Current Tasks");
                    onNavigateToTasks();
                  }}
                >
                  {/* Overdue indicator */}
                  {currentTasksOverdueCount > 0 && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setSectionFilter("my_work");
                        setStatusFilter("wip-overdue");
                        setButtonLabel("Tasks for me - Current Tasks (Overdue)");
                        onNavigateToTasks();
                      }}
                      className={cn(
                        "absolute -top-1.5 -right-1.5 bg-red-500 rounded-full items-center justify-center border-2 border-white z-10",
                        currentTasksOverdueCount > 99 ? "px-2 py-1 min-w-[36px]" : "w-9 h-9"
                      )}
                    >
                      <Text className={cn(
                        "text-white font-bold",
                        currentTasksOverdueCount > 99 ? "text-xs" : "text-sm"
                      )}>
                        {currentTasksOverdueCount > 999 ? '999+' : currentTasksOverdueCount}
                      </Text>
                    </Pressable>
                  )}
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
                    {t.dashboard.currentTasks}
                  </Text>
                </Pressable>
                
                {/* Completed Review Now */}
                <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-3 items-center relative",
                    isDarkMode ? "bg-cyan-900 border-2 border-cyan-600" : "bg-blue-50 border border-blue-300"
                  )}
                  onPress={() => {
                    setSectionFilter("inbox");
                    setStatusFilter("reviewing");
                    setButtonLabel("Tasks for me - Pending my review");
                    onNavigateToTasks();
                  }}
                >
                  {/* Overdue indicator */}
                  {pendingMyReviewOverdueCount > 0 && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setSectionFilter("inbox");
                        setStatusFilter("reviewing-overdue");
                        setButtonLabel("Tasks for me - Pending my review (Overdue)");
                        onNavigateToTasks();
                      }}
                      className={cn(
                        "absolute -top-1.5 -right-1.5 bg-red-500 rounded-full items-center justify-center border-2 border-white z-10",
                        pendingMyReviewOverdueCount > 99 ? "px-2 py-1 min-w-[36px]" : "w-9 h-9"
                      )}
                    >
                      <Text className={cn(
                        "text-white font-bold",
                        pendingMyReviewOverdueCount > 99 ? "text-xs" : "text-sm"
                      )}>
                        {pendingMyReviewOverdueCount > 999 ? '999+' : pendingMyReviewOverdueCount}
                      </Text>
                    </Pressable>
                  )}
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
                    {t.dashboard.pendingMyReview}
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
                  {t.dashboard.tasksFromMe}
                </Text>
              </View>
              <View className={cn("flex-row", isDarkMode ? "gap-3" : "gap-2")}>
                {/* Waiting to Be Accepted */}
                <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-3 items-center relative",
                    isDarkMode ? "bg-amber-900 border-2 border-amber-600" : "bg-yellow-50 border border-yellow-300"
                  )}
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("assigned");
                    setButtonLabel("Tasks from me - Pending Acceptance");
                    onNavigateToTasks();
                  }}
                >
                  {/* Overdue indicator */}
                  {pendingAcceptanceOverdueCount > 0 && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setSectionFilter("outbox");
                        setStatusFilter("assigned-overdue");
                        setButtonLabel("Tasks from me - Pending Acceptance (Overdue)");
                        onNavigateToTasks();
                      }}
                      className={cn(
                        "absolute -top-1.5 -right-1.5 bg-red-500 rounded-full items-center justify-center border-2 border-white z-10",
                        pendingAcceptanceOverdueCount > 99 ? "px-2 py-1 min-w-[36px]" : "w-9 h-9"
                      )}
                    >
                      <Text className={cn(
                        "text-white font-bold",
                        pendingAcceptanceOverdueCount > 99 ? "text-xs" : "text-sm"
                      )}>
                        {pendingAcceptanceOverdueCount > 999 ? '999+' : pendingAcceptanceOverdueCount}
                      </Text>
                    </Pressable>
                  )}
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
                    {t.dashboard.pendingAcceptance}
                  </Text>
                </Pressable>
                
                {/* Others Working on My Tasks */}
                <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-3 items-center relative",
                    isDarkMode ? "bg-violet-900 border-2 border-violet-600" : "bg-orange-50 border border-orange-300"
                  )}
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("wip");
                    setButtonLabel("Tasks from me - Team Proceeding");
                    onNavigateToTasks();
                  }}
                >
                  {/* Overdue indicator */}
                  {teamProceedingOverdueCount > 0 && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setSectionFilter("outbox");
                        setStatusFilter("wip-overdue");
                        setButtonLabel("Tasks from me - Team Proceeding (Overdue)");
                        onNavigateToTasks();
                      }}
                      className={cn(
                        "absolute -top-1.5 -right-1.5 bg-red-500 rounded-full items-center justify-center border-2 border-white z-10",
                        teamProceedingOverdueCount > 99 ? "px-2 py-1 min-w-[36px]" : "w-9 h-9"
                      )}
                    >
                      <Text className={cn(
                        "text-white font-bold",
                        teamProceedingOverdueCount > 99 ? "text-xs" : "text-sm"
                      )}>
                        {teamProceedingOverdueCount > 999 ? '999+' : teamProceedingOverdueCount}
                      </Text>
                    </Pressable>
                  )}
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
                    {t.dashboard.teamProceeding}
                  </Text>
                </Pressable>
                
                {/* Sent for Review */}
                <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-3 items-center relative",
                    isDarkMode ? "bg-cyan-900 border-2 border-cyan-600" : "bg-blue-50 border border-blue-300"
                  )}
                  onPress={() => {
                    setSectionFilter("outbox");
                    setStatusFilter("reviewing");
                    setButtonLabel("Tasks from me - Pending Approval");
                    onNavigateToTasks();
                  }}
                >
                  {/* Overdue indicator */}
                  {pendingApprovalOverdueCount > 0 && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setSectionFilter("outbox");
                        setStatusFilter("reviewing-overdue");
                        setButtonLabel("Tasks from me - Pending Approval (Overdue)");
                        onNavigateToTasks();
                      }}
                      className={cn(
                        "absolute -top-1.5 -right-1.5 bg-red-500 rounded-full items-center justify-center border-2 border-white z-10",
                        pendingApprovalOverdueCount > 99 ? "px-2 py-1 min-w-[36px]" : "w-9 h-9"
                      )}
                    >
                      <Text className={cn(
                        "text-white font-bold",
                        pendingApprovalOverdueCount > 99 ? "text-xs" : "text-sm"
                      )}>
                        {pendingApprovalOverdueCount > 999 ? '999+' : pendingApprovalOverdueCount}
                      </Text>
                    </Pressable>
                  )}
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
                    {t.dashboard.pendingApproval}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Divider */}
            <View className={cn("h-px mb-4", isDarkMode ? "bg-slate-700" : "bg-gray-200")} />

            {/* 4. REPORT CARDS Section */}
            <View>
              <View className="flex-row items-center mb-3">
                <Ionicons name="document-text-outline" size={20} color={isDarkMode ? "#94a3b8" : "#4b5563"} />
                <Text className={cn(
                  "text-lg font-bold ml-2",
                  isDarkMode ? "text-slate-300" : "text-gray-700"
                )}>
                  {t.dashboard.accomplishments}
                </Text>
              </View>
              <View className={cn("flex-row", isDarkMode ? "gap-3" : "gap-2")}>
                {/* Work Accepted */}
                <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-4 items-center relative",
                    isDarkMode ? "bg-emerald-900 border-2 border-emerald-600" : "bg-green-50 border border-green-300"
                  )}
                  onPress={() => {
                    setSectionFilter("my_work");
                    setStatusFilter("done");
                    setButtonLabel("Report Cards - Work Accepted");
                    onNavigateToTasks();
                  }}
                >
                  {/* Overdue indicator - Done tasks are completed, so no overdue */}
                  <Text className={cn(
                    "text-4xl mb-1",
                    isDarkMode ? "font-black text-emerald-300" : "font-bold text-green-700"
                  )}>
                    {myDoneTasks.length + inboxDoneTasks.length + outboxDoneTasks.length}
                  </Text>
                  <View className="relative items-center justify-center">
                    <Ionicons 
                      name="trophy-outline" 
                      size={20} 
                      color={isDarkMode ? "#34d399" : "#10b981"} 
                      style={{ position: 'absolute', left: -26 }}
                    />
                    <Text className={cn(
                      "text-center text-base font-semibold",
                      isDarkMode ? "text-emerald-200" : "text-green-600"
                    )} numberOfLines={2}>
                      {t.dashboard.workAccepted}
                    </Text>
                  </View>
                </Pressable>
                
                {/* Catch-All: Uncovered Tasks - HIDDEN */}
                {/* <Pressable 
                  className={cn(
                    "flex-1 rounded-xl p-4 items-center",
                    isDarkMode ? "bg-gray-800 border-2 border-gray-600" : "bg-gray-100 border border-gray-400"
                  )}
                  onPress={() => {
                    setSectionFilter("my_work");
                    setStatusFilter("all");
                    setButtonLabel("Catch-All - Uncovered Tasks");
                    onNavigateToTasks();
                  }}
                >
                  <Text className={cn(
                    "text-4xl mb-1",
                    isDarkMode ? "font-black text-gray-300" : "font-bold text-gray-700"
                  )}>
                    {catchAllTasks.length}
                  </Text>
                  <View className="relative items-center justify-center">
                    <Ionicons 
                      name="search-outline" 
                      size={20} 
                      color={isDarkMode ? "#9ca3af" : "#6b7280"} 
                      style={{ position: 'absolute', left: -26 }}
                    />
                    <Text className={cn(
                      "text-center text-base font-semibold",
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    )} numberOfLines={2}>
                      Uncovered Tasks
                    </Text>
                  </View>
                </Pressable> */}
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
                  {t.dashboard.fullTaskList || "Full Task List"}
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
                {/* Task List: All tasks where user is assigner or assignee */}
                {(() => {
                  // Filter tasks where user is either assigner or assignee
                  const allUserTasks = projectFilteredTasks.filter(task => {
                    const assignedTo = task.assignedTo || [];
                    const userIdStr = String(user.id);
                    const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
                    const isCreatedByMe = String(task.assignedBy) === userIdStr;
                    
                    // Include if user is assigner OR assignee
                    return isAssignedToMe || isCreatedByMe;
                  });

                  // Sort tasks: overdue first, then by priority, then by due date
                  const sortedTasks = [...allUserTasks].sort((a, b) => {
                    // Helper to check if overdue
                    const isOverdue = (task: any) => {
                      if (!task.dueDate) return false;
                      const dueDate = new Date(task.dueDate);
                      const now = new Date();
                      return dueDate < now && task.completionPercentage < 100 && task.status !== "rejected";
                    };
                    
                    const aOverdue = isOverdue(a);
                    const bOverdue = isOverdue(b);
                    
                    // Overdue tasks first
                    if (aOverdue && !bOverdue) return -1;
                    if (!aOverdue && bOverdue) return 1;
                    
                    // Then by priority
                    const priorityOrder: { [key: string]: number } = {
                      "high": 1,
                      "medium": 2,
                      "low": 3,
                    };
                    const aPriority = priorityOrder[a.priority || "low"] || 4;
                    const bPriority = priorityOrder[b.priority || "low"] || 4;
                    if (aPriority !== bPriority) return aPriority - bPriority;
                    
                    // Then by due date (earliest first)
                    if (a.dueDate && b.dueDate) {
                      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    }
                    if (a.dueDate) return -1;
                    if (b.dueDate) return 1;
                    
                    return 0;
                  });

                  return (
                    <View>
                      <Text className={cn(
                        "text-base font-semibold mb-3",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>
                        {t.dashboard.allMyTasks || "All My Tasks"} ({sortedTasks.length})
                      </Text>
                      
                      {sortedTasks.length === 0 ? (
                        <View className="py-8 items-center">
                          <Ionicons name="checkmark-circle-outline" size={48} color={isDarkMode ? "#64748b" : "#9ca3af"} />
                          <Text className={cn(
                            "text-base mt-4",
                            isDarkMode ? "text-slate-400" : "text-gray-500"
                          )}>
                            {t.dashboard.noTasks || "No tasks found"}
                          </Text>
                        </View>
                      ) : (
                        <View className="gap-2">
                          {sortedTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onNavigateToTaskDetail={(taskId: string, subTaskId?: string) => {
                                if (onNavigateToTaskDetail) {
                                  onNavigateToTaskDetail(taskId, subTaskId);
                                }
                              }}
                              className="mb-2"
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })()}
              </View>
            )}
          </View>
          )}

          {/* Footer space for FAB */}
          <View className="h-32" />
        </View>
      </ScrollView>
      )}

      {/* Profile Menu */}

      {/* Expandable Utility FAB */}
      <ExpandableUtilityFAB 
        onCreateTask={onNavigateToCreateTask}
      />

      {/* Project Switching Loading Overlay */}
      {isProjectSwitching && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <View className="bg-white rounded-xl p-6 items-center shadow-lg">
            <Text className="text-xl font-semibold text-gray-900 mb-2">
              {t.dashboard.switchingProject}
                </Text>
            <Text className="text-base text-gray-600 text-center">
              {t.dashboard.refreshingData}
                </Text>
          </View>
              </View>
            )}
    </SafeAreaView>
  );
}
