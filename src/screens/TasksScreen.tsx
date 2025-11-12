import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
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
import { useUserStoreWithInit } from "../state/userStore.supabase";
import { useProjectStoreWithInit, useProjectStore } from "../state/projectStore.supabase";
import { useProjectFilterStore } from "../state/projectFilterStore";
import { useCompanyStore } from "../state/companyStore";
import { useThemeStore } from "../state/themeStore";
import { Task, Priority, TaskStatus, Project, ProjectStatus } from "../types/buildtrack";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import CompanyBanner from "../components/CompanyBanner";
import ExpandableUtilityFAB from "../components/ExpandableUtilityFAB";
import TaskCard from "../components/TaskCard";

interface TasksScreenProps {
  onNavigateToTaskDetail: (taskId: string, subTaskId?: string) => void;
  onNavigateToCreateTask: () => void;
  onNavigateBack?: () => void;
}

// ✅ UPDATED: All tasks are now in unified table (with optional parentTaskId)
type TaskListItem = Task;

export default function TasksScreen({ 
  onNavigateToTaskDetail, 
  onNavigateToCreateTask,
  onNavigateBack 
}: TasksScreenProps) {
  const { user } = useAuthStore();
  const taskStore = useTaskStore();
  const tasks = taskStore.tasks;
  
  const userStore = useUserStoreWithInit();
  const { getUserById } = userStore;
  const projectStore = useProjectStoreWithInit();
  const { getProjectById, getProjectsByUser } = projectStore;
  const { selectedProjectId, sectionFilter, statusFilter, buttonLabel, clearSectionFilter, clearStatusFilter } = useProjectFilterStore();
  const { isDarkMode } = useThemeStore();

  const [localSectionFilter, setLocalSectionFilter] = useState<"my_tasks" | "inbox" | "outbox" | "my_work">("my_work");
  const [localStatusFilter, setLocalStatusFilter] = useState<"not_started" | "in_progress" | "completed" | "rejected" | "pending" | "overdue" | "wip" | "done" | "received" | "reviewing" | "assigned" | "all">("all");
  const [refreshing, setRefreshing] = useState(false);
  
  // Sorting options (can apply multiple)
  const [showSelfAssignedOnly, setShowSelfAssignedOnly] = useState(false);
  // Three-state sort: null (disabled) → "desc" (high to low) → "asc" (low to high) → null
  const [sortByPriority, setSortByPriority] = useState<null | "asc" | "desc">(null);
  const [sortByDueDate, setSortByDueDate] = useState<null | "asc" | "desc">(null);
  
  // Toggle handlers for three-state sorting
  const togglePrioritySort = useCallback(() => {
    setSortByPriority(prev => {
      if (prev === null) return "desc"; // First press: high to low
      if (prev === "desc") return "asc"; // Second press: low to high
      return null; // Third press: disabled
    });
  }, []);
  
  const toggleDueDateSort = useCallback(() => {
    setSortByDueDate(prev => {
      if (prev === null) return "desc"; // First press: earlier to later
      if (prev === "desc") return "asc"; // Second press: later to earlier
      return null; // Third press: disabled
    });
  }, []);

  // Apply filters from store on mount or when they change
  // Handle both filters being set simultaneously from Dashboard Quick Overview buttons
  useEffect(() => {
    console.log('🔍 [ProjectsTasksScreen] Filter Store Update:', { sectionFilter, statusFilter });
    if (sectionFilter && statusFilter) {
      // Both filters set together - apply both immediately
      console.log('✅ [ProjectsTasksScreen] Setting both filters:', { sectionFilter, statusFilter });
      setLocalSectionFilter(sectionFilter);
      setLocalStatusFilter(statusFilter);
      // Clear filters from store AFTER setting local state
      setTimeout(() => {
        clearSectionFilter();
        clearStatusFilter();
      }, 0);
    } else if (sectionFilter) {
      // Only section filter set - apply section, reset status
      console.log('✅ [ProjectsTasksScreen] Setting section filter only:', { sectionFilter });
      setLocalSectionFilter(sectionFilter);
      setLocalStatusFilter("all");
      clearSectionFilter();
    } else if (statusFilter) {
      // Only status filter set - apply status only
      console.log('✅ [ProjectsTasksScreen] Setting status filter only:', { statusFilter });
      setLocalStatusFilter(statusFilter);
      clearStatusFilter();
    }
  }, [sectionFilter, statusFilter, clearSectionFilter, clearStatusFilter]);


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log('🔄 REFRESHING TASKS...');
    // Actually fetch tasks from database
    await taskStore.fetchTasks();
    // Force stores to re-read from state
    useTaskStore.setState({ isLoading: taskStore.isLoading });
    useProjectStore.setState({ isLoading: projectStore.isLoading });
    
    // Simulate network delay for UX
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, [taskStore]);
  
  // 🔍 Fetch tasks on mount if not already loaded
  useEffect(() => {
    console.log('🔍 CHECKING IF TASKS NEED TO BE FETCHED...');
    console.log('🔍 Tasks in store:', tasks.length);
    console.log('🔍 Is loading:', taskStore.isLoading);
    
    if (tasks.length === 0 && !taskStore.isLoading) {
      console.log('🔍 NO TASKS FOUND - FETCHING FROM DATABASE...');
      taskStore.fetchTasks().then(() => {
        console.log('🔍✅ FETCH COMPLETE - Tasks in store:', taskStore.tasks.length);
      }).catch((error) => {
        console.error('🔍❌ FETCH ERROR:', error);
      });
    }
  }, []);

  // 🔄 Refetch tasks when screen comes into focus (e.g., returning from TaskDetailScreen)
  // Only refetch if data is stale (more than 30 seconds old)
  const lastFetchTime = React.useRef<number>(0);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      const STALE_TIME = 30000; // 30 seconds
      
      // Only fetch if data is stale or this is the first focus
      if (timeSinceLastFetch > STALE_TIME || lastFetchTime.current === 0) {
        console.log('🔄 TasksScreen focused - refreshing tasks (data is stale)...');
        lastFetchTime.current = now;
        taskStore.fetchTasks().catch((error) => {
          console.error('🔄❌ Error refreshing tasks on focus:', error);
        });
      } else {
        console.log('⏭️ TasksScreen focused - skipping refresh (data is fresh)');
      }
    }, [taskStore])
  );

  if (!user) return null;


  // Get user's projects - filter by selected project if one is chosen
  const allUserProjects = getProjectsByUser(user.id);
  const userProjects = selectedProjectId 
    ? allUserProjects.filter(p => p.id === selectedProjectId)
    : allUserProjects;

  // No project-level filtering - show all user projects
  const filteredProjects = userProjects;

  // ✅ UPDATED: Simplified for unified tasks table
  // Get all nested tasks (tasks with parentTaskId) assigned by a user
  const getNestedTasksAssignedBy = (userId: string, projectId?: string): Task[] => {
    // 🔍 FIX: Use String() comparison to handle type mismatches
    const userIdStr = String(userId);
    return tasks.filter(task => 
      task.parentTaskId && // Is a nested task
      String(task.assignedBy) === userIdStr &&
      (!projectId || task.projectId === projectId)
    );
  };

  // Get all nested tasks assigned to a user
  const getNestedTasksAssignedTo = (userId: string, projectId?: string): Task[] => {
    return tasks.filter(task => {
      const assignedTo = task.assignedTo || [];
      // 🔍 FIX: Use String() comparison to handle type mismatches
      const userIdStr = String(userId);
      return task.parentTaskId && // Is a nested task
             Array.isArray(assignedTo) && 
             assignedTo.some(id => String(id) === userIdStr) &&
             (!projectId || task.projectId === projectId);
    });
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

  // Helper: Check if task is top-level (not a subtask) - matches DashboardScreen logic
  const isTopLevelTask = (task: Task) => {
    return !task.parentTaskId || task.parentTaskId === null || task.parentTaskId === '';
  };

  // Helper: Check if task is nested (has a parent) - matches DashboardScreen logic
  const isNestedTask = (task: Task) => {
    return !!task.parentTaskId && task.parentTaskId !== null && task.parentTaskId !== '';
  };

  // Get all tasks across all projects in a flat list
  const getAllTasks = (): TaskListItem[] => {
    // 🔍 DEBUG: Comprehensive task analysis
    console.log('🔍 [DEBUG] ========== TASK ANALYSIS START ==========');
    console.log('🔍 [DEBUG] Total tasks in store:', tasks.length);
    console.log('🔍 [DEBUG] Current user:', { id: user?.id, name: user?.name });
    console.log('🔍 [DEBUG] User projects:', userProjects.map(p => ({ id: p.id, name: p.name })));
    
    // Find the specific task
    const testTask = tasks.find(t => t.title?.toLowerCase().includes("testing sub task"));
    if (testTask) {
      console.log('🔍 [DEBUG] ✅ Task FOUND in store:', {
        title: testTask.title,
        id: testTask.id,
        projectId: testTask.projectId,
        parentTaskId: testTask.parentTaskId,
        assignedTo: testTask.assignedTo,
        assignedBy: testTask.assignedBy,
        accepted: testTask.accepted,
        currentStatus: testTask.currentStatus,
        completionPercentage: testTask.completionPercentage,
        user_id: user?.id,
        isAssignedToUser: testTask.assignedTo?.includes(user?.id),
        isInUserProject: userProjects.some(p => p.id === testTask.projectId)
      });
    } else {
      console.log('🔍 [DEBUG] ❌ Task NOT found in store');
      console.log('🔍 [DEBUG] All task titles:', tasks.map(t => t.title));
      
      // Check if there are any tasks with similar names
      const similarTasks = tasks.filter(t => 
        t.title?.toLowerCase().includes("test") || 
        t.title?.toLowerCase().includes("sub")
      );
      if (similarTasks.length > 0) {
        console.log('🔍 [DEBUG] Similar tasks found:', similarTasks.map(t => ({
          title: t.title,
          id: t.id,
          projectId: t.projectId
        })));
      }
    }
    
    // Check all tasks assigned to Peter
    const peterTasks = tasks.filter(t => {
      const assignedTo = t.assignedTo || [];
      return Array.isArray(assignedTo) && assignedTo.includes(user?.id);
    });
    console.log('🔍 [DEBUG] Tasks assigned to Peter:', peterTasks.length);
    console.log('🔍 [DEBUG] Peter tasks details:', peterTasks.map(t => ({
      title: t.title,
      id: t.id,
      projectId: t.projectId,
      assignedBy: t.assignedBy,
      accepted: t.accepted,
      currentStatus: t.currentStatus
    })));
    
    // Collect tasks from all user's projects
    const allProjectTasks = userProjects.flatMap(project => {
      const projectTasks = tasks.filter(task => task.projectId === project.id);
      
      // 🔍 DEBUG: Check if task is in this project
      if (projectTasks.some(t => t.title?.toLowerCase().includes("testing sub task"))) {
        console.log('🔍 [DEBUG] Task found in project:', {
          projectId: project.id,
          projectName: project.name,
          tasksInProject: projectTasks.length
        });
      }

      // Get MY_TASKS (Tasks I assigned to MYSELF - self-assigned only, top-level)
      const myTasksParent = projectTasks.filter(task => {
        const assignedTo = task.assignedTo || [];
        // 🔍 FIX: Use String() comparison to handle type mismatches
        const userIdStr = String(user.id);
        const isDirectlyAssigned = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
        const isCreatedByMe = String(task.assignedBy) === userIdStr;
        // Include top-level tasks assigned to me AND created by me (self-assigned)
        return isTopLevelTask(task) && isDirectlyAssigned && isCreatedByMe;
      });
      
      // Get nested tasks I created and assigned to myself - filter from current project's tasks
      const myTasksNested = projectTasks.filter(task => {
        const assignedTo = task.assignedTo || [];
        // 🔍 FIX: Use String() comparison to handle type mismatches
        const userIdStr = String(user.id);
        return isNestedTask(task) && // Is a nested task
               Array.isArray(assignedTo) && 
               assignedTo.some(id => String(id) === userIdStr) &&
               String(task.assignedBy) === userIdStr; // Created by me
      });
      
      const myTasksAll = [...myTasksParent, ...myTasksNested];
      
      // Get INBOX tasks (tasks assigned to me by OTHERS only, not self-assigned)
      const inboxParentTasks = projectTasks.filter(task => {
        const assignedTo = task.assignedTo || [];
        // 🔍 FIX: Use String() comparison to handle type mismatches (UUIDs might be different types)
        const userIdStr = String(user.id);
        const isDirectlyAssigned = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
        const isCreatedByMe = String(task.assignedBy) === userIdStr;
        
        // 🔍 DEBUG: Log tasks assigned to other users that are incorrectly being included
        if (!isDirectlyAssigned && Array.isArray(assignedTo) && assignedTo.length > 0) {
          const assignedUserIds = assignedTo.map(id => String(id));
          if (!assignedUserIds.includes(userIdStr)) {
            console.log('🔍 [DEBUG] ⚠️ Task NOT assigned to current user, but in projectTasks:', {
              title: task.title,
              assignedTo: assignedTo,
              assignedUserIds,
              currentUserId: userIdStr,
              projectId: project.id,
              projectName: project.name
            });
          }
        }
        
        // 🔍 DEBUG: Log specific task if it matches the title
        if (task.title?.toLowerCase().includes("testing sub task")) {
          console.log('🔍 [DEBUG] Found task in projectTasks:', {
            title: task.title,
            id: task.id,
            projectId: task.projectId,
            parentTaskId: task.parentTaskId,
            assignedTo: assignedTo,
            assignedToType: typeof assignedTo,
            assignedToIsArray: Array.isArray(assignedTo),
            assignedToLength: Array.isArray(assignedTo) ? assignedTo.length : 'N/A',
            assignedToContents: Array.isArray(assignedTo) ? JSON.stringify(assignedTo) : assignedTo,
            assignedBy: task.assignedBy,
            user_id: user.id,
            user_idType: typeof user.id,
            isTopLevel: isTopLevelTask(task),
            isDirectlyAssigned,
            includesCheck: Array.isArray(assignedTo) ? assignedTo.includes(user.id) : 'N/A',
            isCreatedByMe,
            willBeInInbox: isTopLevelTask(task) && isDirectlyAssigned && !isCreatedByMe
          });
          
          // Also check if Peter's ID is in the array
          const peterId = '66666666-6666-6666-6666-666666666666';
          const hasPeterId = Array.isArray(assignedTo) && assignedTo.includes(peterId);
          console.log('🔍 [DEBUG] Peter ID check:', {
            peterId,
            hasPeterId,
            assignedToHasPeter: Array.isArray(assignedTo) ? assignedTo.some(id => id === peterId || String(id) === peterId) : false,
            assignedToAsStrings: Array.isArray(assignedTo) ? assignedTo.map(id => String(id)) : []
          });
        }
        
        // Include top-level tasks assigned to me but NOT created by me
        return isTopLevelTask(task) && isDirectlyAssigned && !isCreatedByMe;
      });
      
      // Get nested tasks assigned to me but not created by me - filter from current project's tasks
      const inboxNestedTasks = projectTasks.filter(task => {
        const assignedTo = task.assignedTo || [];
        const isNested = isNestedTask(task);
        // 🔍 FIX: Use String() comparison to handle type mismatches
        const userIdStr = String(user.id);
        const isAssigned = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
        const notCreatedByMe = String(task.assignedBy) !== userIdStr;
        
        // 🔍 DEBUG: Log specific task if it matches the title
        if (task.title?.toLowerCase().includes("testing sub task")) {
          console.log('🔍 [DEBUG] Checking nested task:', {
            title: task.title,
            id: task.id,
            isNested,
            isAssigned,
            notCreatedByMe,
            willBeInInbox: isNested && isAssigned && notCreatedByMe
          });
        }
        
        return isNested && isAssigned && notCreatedByMe;
      });
      
      const inboxTasks = [...inboxParentTasks, ...inboxNestedTasks];
      
      // 🔍 DEBUG: Log inbox tasks count
      if (projectTasks.some(t => t.title?.toLowerCase().includes("testing sub task"))) {
        console.log('🔍 [DEBUG] Inbox tasks summary:', {
          inboxParentTasks: inboxParentTasks.length,
          inboxNestedTasks: inboxNestedTasks.length,
          totalInboxTasks: inboxTasks.length,
          taskInInbox: inboxTasks.some(t => t.title?.toLowerCase().includes("testing sub task"))
        });
      }
      
      // Get outbox tasks (tasks assigned by me to OTHERS, not ONLY self-assigned)
      const assignedParentTasks = projectTasks.filter(task => {
        const assignedTo = task.assignedTo || [];
        // 🔍 FIX: Use String() comparison to handle type mismatches
        const userIdStr = String(user.id);
        const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
        const isDirectlyAssignedByMe = String(task.assignedBy) === userIdStr;
        const isSelfAssignedOnly = isDirectlyAssignedByMe && isAssignedToMe && assignedTo.length === 1;
        // Include top-level tasks created by me, NOT self-assigned only, not rejected
        return isTopLevelTask(task) && isDirectlyAssignedByMe && !isSelfAssignedOnly && task.currentStatus !== "rejected";
      });
      
      // Get nested tasks assigned by me but not to me - filter from current project's tasks
      const assignedNestedTasks = projectTasks.filter(task => {
        const assignedTo = task.assignedTo || [];
        // 🔍 FIX: Use String() comparison to handle type mismatches
        const userIdStr = String(user.id);
        return isNestedTask(task) && // Is a nested task
               String(task.assignedBy) === userIdStr && // Created by me
               (!Array.isArray(assignedTo) || !assignedTo.some(id => String(id) === userIdStr)); // Not assigned to me
      });
      
      const outboxTasks = [...assignedParentTasks, ...assignedNestedTasks];
      
      // Return tasks based on section filter
      // SPECIAL CASE: For "reviewing" status, we need ALL project tasks (not section-filtered)
      // because reviewing breaks section definitions:
      // - Inbox Reviewing = tasks I CREATED (not in inbox)
      // - Outbox Reviewing = tasks assigned TO ME (not in outbox)
      if (localStatusFilter === "reviewing") {
        return projectTasks; // Return ALL tasks from project, let filter logic handle it
      }
      
      if (localSectionFilter === "my_tasks") {
        // "my_tasks" shows ALL tasks assigned to me (including self-assigned)
        return myTasksAll;
      } else if (localSectionFilter === "inbox") {
        // "inbox" shows only tasks assigned to me by others
        // 🔍 VERIFY: Double-check that all tasks are actually assigned to current user
        const userIdStr = String(user.id);
        const verifiedInboxTasks = inboxTasks.filter(task => {
          const assignedTo = task.assignedTo || [];
          const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
          if (!isAssignedToMe) {
            console.log('🔍 [DEBUG] ⚠️ Task in inboxTasks but NOT assigned to user:', {
              title: task.title,
              assignedTo: assignedTo,
              user_id: user.id
            });
          }
          return isAssignedToMe;
        });
        return verifiedInboxTasks;
      } else if (localSectionFilter === "outbox") {
        return outboxTasks;
      } else {
        // For "my_work", behavior depends on status filter:
        // - "all" or "done": include My Tasks + Inbox + Outbox (show everything)
        // - other statuses: include My Tasks + Inbox only (not Outbox)
        // Use a Map to ensure unique tasks by ID
        const uniqueTasks = new Map();
        
        // Add all my tasks (including self-assigned)
        myTasksAll.forEach(task => {
          uniqueTasks.set(task.id, task);
        });
        
        // Add inbox tasks (will overwrite if same ID, ensuring uniqueness)
        inboxTasks.forEach(task => {
          uniqueTasks.set(task.id, task);
        });
        
        // For "all" or "done" status, also include outbox tasks
        if (localStatusFilter === "all" || localStatusFilter === "done") {
          outboxTasks.forEach(task => {
            uniqueTasks.set(task.id, task);
          });
        }
        
        return Array.from(uniqueTasks.values());
      }
    });

    // Helper function to check if a task is overdue
    const isOverdue = (task: any) => {
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      return dueDate < now;
    };

    // Apply status filters
    const filteredTasks = allProjectTasks.filter(task => {
      // If no status filter, return all tasks from current section
      if (localStatusFilter === "all") {
        return true;
      }
      
      // Handle "my_work" section with specific status filters (for Priority Summary)
      if (localSectionFilter === "my_work") {
        const assignedTo = task.assignedTo || [];
        // 🔍 FIX: Use String() comparison to handle type mismatches
        const userIdStr = String(user.id);
        const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
        const isCreatedByMe = String(task.assignedBy) === userIdStr;
        const isSelfAssignedOnly = isCreatedByMe && isAssignedToMe && assignedTo.length === 1;
        
        // 🔍 CRITICAL FIX: "my_work" should ONLY show tasks assigned to me
        // If task is not assigned to me, exclude it immediately
        if (!isAssignedToMe) {
          // 🔍 DEBUG: Log tasks that shouldn't be in my_work
          if (task.title?.toLowerCase().includes("photo upload") || task.title?.toLowerCase().includes("test upload")) {
            console.log('🔍 [DEBUG] ❌ Task NOT assigned to current user, excluding from my_work:', {
              title: task.title,
              assignedTo: assignedTo,
              user_id: user.id,
              userIdStr,
              isAssignedToMe
            });
          }
          return false;
        }
        
        // For "my_work" section: combines My Tasks + Inbox (tasks assigned TO me)
        // Exception: "done" status includes Outbox as well (all completed work)
        const isInMyTasks = (isAssignedToMe && isCreatedByMe) || (isCreatedByMe && task.currentStatus === "rejected");
        const isInInbox = isAssignedToMe && !isCreatedByMe;
        const isInMyTasksOrInbox = isInMyTasks || isInInbox;
        
        if (localStatusFilter === "overdue") {
          // OVERDUE: Tasks assigned TO me that are past due
          // Includes: My self-assigned tasks + Tasks from others assigned to me
          // Excludes: Tasks I assigned to others (Outbox)
          return isInMyTasksOrInbox &&
                 task.completionPercentage < 100 &&
                 isOverdue(task) &&
                 task.currentStatus !== "rejected";
        } else if (localStatusFilter === "wip") {
          // WIP: Tasks I'm actively working on (assigned TO me)
          // Includes: Self-assigned tasks + Tasks from others
          // Excludes: Tasks at 100% (complete), Overdue tasks, Review accepted tasks
          if (isInMyTasks) {
            // Self-assigned WIP: Auto-accepted or explicitly accepted
            const isSelfAssigned = isCreatedByMe && isAssignedToMe;
            const isAcceptedOrSelfAssigned = task.accepted || (isSelfAssigned && !task.accepted);
            return isAcceptedOrSelfAssigned &&
                   task.completionPercentage < 100 &&
                   !isOverdue(task) &&
                   task.currentStatus !== "rejected" &&
                   !task.reviewAccepted;
          } else if (isInInbox) {
            // Inbox WIP: Must be accepted, can be at 100% if not yet submitted for review
            return task.accepted &&
                   !isOverdue(task) &&
                   task.currentStatus !== "rejected" &&
                   (task.completionPercentage < 100 ||
                    (task.completionPercentage === 100 && !task.readyForReview)) &&
                   !task.reviewAccepted;
          }
          return false;
        } else if (localStatusFilter === "done") {
          // DONE: All completed and accepted work (My Tasks + Inbox + Outbox)
          // Check outbox FIRST (before myTasks) because outbox is created by me but NOT self-assigned
          const isInOutbox = isCreatedByMe && !isSelfAssignedOnly && task.currentStatus !== "rejected";
          if (isInOutbox) {
            return task.completionPercentage === 100 &&
                   task.reviewAccepted === true;
          } else if (isInMyTasks) {
            return task.completionPercentage === 100 &&
                   task.reviewAccepted === true;
          } else if (isInInbox) {
            return task.completionPercentage === 100 &&
                   task.reviewAccepted === true;
          }
          return false;
        }
        // For other statuses, return false for "my_work" section
        return false;
      }
      
      // Apply exact filter logic for each button combination
      if (localSectionFilter === "my_tasks") {
        // MY TASKS: Self-assigned tasks (I created AND assigned to myself)
        // Also includes rejected tasks I created (reassigned back to me)
        const assignedTo = task.assignedTo || [];
        // 🔍 FIX: Use String() comparison to handle type mismatches
        const userIdStr = String(user.id);
        const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
        const isCreatedByMe = String(task.assignedBy) === userIdStr;
        const isInMyTasks = (isAssignedToMe && isCreatedByMe) || (isCreatedByMe && task.currentStatus === "rejected");
        
        if (!isInMyTasks) return false;
        
        if (localStatusFilter === "rejected") {
          // REJECTED: Tasks that were declined by assignees
          return task.currentStatus === "rejected";
        } else if (localStatusFilter === "wip") {
          // WIP: Self-assigned tasks in progress
          const isSelfAssigned = isCreatedByMe && isAssignedToMe;
          const isAcceptedOrSelfAssigned = task.accepted || (isSelfAssigned && !task.accepted);
          return isAcceptedOrSelfAssigned &&
                 task.completionPercentage < 100 &&
                 !isOverdue(task) &&
                 task.currentStatus !== "rejected" &&
                 !task.reviewAccepted;
        } else if (localStatusFilter === "done") {
          // DONE: Self-assigned tasks completed and auto-accepted
          return task.completionPercentage === 100 &&
                 task.reviewAccepted === true;
        } else if (localStatusFilter === "overdue") {
          // OVERDUE: Self-assigned tasks past due date
          return task.completionPercentage < 100 &&
                 isOverdue(task) &&
                 task.currentStatus !== "rejected";
        }
        return false;
      } else if (localSectionFilter === "inbox") {
        // INBOX: Tasks assigned TO me BY others (not self-assigned)
        const assignedTo = task.assignedTo || [];
        // 🔍 FIX: Use String() comparison to handle type mismatches
        const userIdStr = String(user.id);
        const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
        const isCreatedByMe = String(task.assignedBy) === userIdStr;
        const isInInbox = isAssignedToMe && !isCreatedByMe;
        
        // 🔍 CRITICAL FIX: If task is not assigned to me, immediately exclude it
        if (!isAssignedToMe) {
          // 🔍 DEBUG: Log tasks that shouldn't be in inbox
          if (task.title?.toLowerCase().includes("photo upload") || task.title?.toLowerCase().includes("test upload")) {
            console.log('🔍 [DEBUG] ❌ Task NOT assigned to current user, excluding from inbox:', {
              title: task.title,
              assignedTo: assignedTo,
              user_id: user.id,
              userIdStr,
              isAssignedToMe,
              assignedToUserIds: Array.isArray(assignedTo) ? assignedTo.map(id => ({ id, type: typeof id, string: String(id) })) : []
            });
          }
          return false;
        }
        
        if (localStatusFilter === "reviewing") {
          // REVIEWING: Tasks I CREATED that others submitted for MY review
          // Special case: Breaks inbox definition to show tasks I need to review
          const isCreatedByMeForReview = String(task.assignedBy) === userIdStr;
          return isCreatedByMeForReview &&
                 task.completionPercentage === 100 &&
                 task.readyForReview === true &&
                 task.reviewAccepted !== true;
        }
        
        // Only proceed if task is assigned to me AND not created by me
        if (!isInInbox) return false;
        
        if (localStatusFilter === "received") {
          // RECEIVED: New tasks from others waiting for my acceptance
          // Not yet responded = accepted === false AND no declineReason AND not rejected
          const isPendingAcceptance = task.accepted === false && 
                                      !task.declineReason && 
                                      task.currentStatus !== "rejected";
          
          // 🔍 DEBUG: Log why task is/isn't showing in received
          if (task.title?.toLowerCase().includes("testing sub task")) {
            console.log('🔍 [DEBUG] Checking received filter:', {
              title: task.title,
              id: task.id,
              isInInbox,
              accepted: task.accepted,
              declineReason: task.declineReason,
              isPendingAcceptance,
              currentStatus: task.currentStatus,
              isRejected: task.currentStatus === "rejected",
              willPassFilter: isPendingAcceptance
            });
          }
          
          return isPendingAcceptance;
        } else if (localStatusFilter === "wip") {
          // WIP: Tasks from others I'm actively working on
          // Must be accepted, incomplete or at 100% but not yet submitted for review
          return task.accepted &&
                 !isOverdue(task) &&
                 task.currentStatus !== "rejected" &&
                 (task.completionPercentage < 100 ||
                  (task.completionPercentage === 100 && !task.readyForReview)) &&
                 !task.reviewAccepted;
        } else if (localStatusFilter === "done") {
          // DONE: Tasks from others that I completed and got accepted
          return task.completionPercentage === 100 &&
                 task.reviewAccepted === true;
        } else if (localStatusFilter === "overdue") {
          // OVERDUE: Tasks from others assigned to me that are past due
          return task.completionPercentage < 100 &&
                 isOverdue(task) &&
                 task.currentStatus !== "rejected";
        }
        return false;
      } else if (localSectionFilter === "outbox") {
        // OUTBOX: Tasks I assigned TO others (not self-assigned)
        // Excludes: Self-assigned tasks, Rejected tasks
        const assignedTo = task.assignedTo || [];
        // 🔍 FIX: Use String() comparison to handle type mismatches
        const userIdStr = String(user.id);
        const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
        const isCreatedByMe = String(task.assignedBy) === userIdStr;
        const isSelfAssignedOnly = isCreatedByMe && isAssignedToMe && assignedTo.length === 1;
        const isInOutbox = isCreatedByMe && !isSelfAssignedOnly && task.currentStatus !== "rejected";
        
        if (localStatusFilter === "reviewing") {
          // REVIEWING: Tasks I submitted for review (that OTHERS assigned to ME)
          // Special case: Breaks outbox definition to show my submissions awaiting approval
          return !isCreatedByMe &&
                 isAssignedToMe &&
                 task.completionPercentage === 100 &&
                 task.readyForReview === true &&
                 task.reviewAccepted !== true;
        }
        
        if (!isInOutbox) return false;
        
        if (localStatusFilter === "assigned") {
          // ASSIGNED: Tasks I delegated to others waiting for their acceptance
          // Pending acceptance = accepted === false AND no declineReason AND not rejected
          const isPendingAcceptance = task.accepted === false && 
                                      !task.declineReason && 
                                      task.currentStatus !== "rejected";
          return isPendingAcceptance;
        } else if (localStatusFilter === "wip") {
          // WIP: Tasks I assigned to others that they're working on
          // They've accepted it, working on it, not overdue, not complete/submitted
          return task.accepted &&
                 !isOverdue(task) &&
                 task.currentStatus !== "rejected" &&
                 (task.completionPercentage < 100 ||
                  (task.completionPercentage === 100 && !task.readyForReview)) &&
                 !task.reviewAccepted;
        } else if (localStatusFilter === "done") {
          // DONE: Tasks I assigned to others that were completed and I accepted
          return task.completionPercentage === 100 &&
                 task.reviewAccepted === true;
        } else if (localStatusFilter === "overdue") {
          // OVERDUE: Tasks I assigned to others that are past due
          return task.completionPercentage < 100 &&
                 isOverdue(task) &&
                 task.currentStatus !== "rejected";
        }
        return false;
      }
      
      // Default: no filter match
      return false;
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

  let allTasks = getAllTasks();
  
  // Apply self-assigned filter if enabled
  // BUT: Don't apply to "reviewing" status - those are tasks assigned to others
  if (showSelfAssignedOnly && localStatusFilter !== "reviewing") {
    allTasks = allTasks.filter(task => {
      const assignedTo = task.assignedTo || [];
      // 🔍 FIX: Use String() comparison to handle type mismatches
      const userIdStr = String(user.id);
      const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
      const isCreatedByMe = String(task.assignedBy) === userIdStr;
      // Only show tasks I assigned to myself
      return isAssignedToMe && isCreatedByMe;
    });
  }
  
  // Apply multi-criteria sorting
  if (sortByPriority || sortByDueDate) {
    allTasks = [...allTasks].sort((a, b) => {
      // Primary sort: Priority (if enabled)
      if (sortByPriority) {
        const priorityA = getPriorityOrder(a.priority);
        const priorityB = getPriorityOrder(b.priority);
        if (priorityA !== priorityB) {
          // "desc" = high to low (lower number = higher priority)
          // "asc" = low to high (higher number = lower priority)
          return sortByPriority === "desc" 
            ? priorityA - priorityB  // High priority first
            : priorityB - priorityA; // Low priority first
        }
      }
      
      // Secondary sort: Due Date (if enabled)
      if (sortByDueDate) {
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        // "desc" = earlier dates first, "asc" = later dates first
        return sortByDueDate === "desc"
          ? dateA - dateB  // Earlier dates first
          : dateB - dateA; // Later dates first
      }
      
      return 0;
    });
  } else {
    // Default sort: By creation date (newest first) when no sorting options are active
    allTasks = [...allTasks].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Newest first
    });
  }

  // Group tasks: parent tasks with their subtasks nested
  // ✅ UPDATED: Group tasks using unified table structure
  const groupedTasks = React.useMemo(() => {
    const taskMap = new Map<string, { parent: Task; subtasks: Task[] }>();
    const standaloneSubtasks: Task[] = [];
    
    console.log('🔍 Grouping tasks. Total tasks:', allTasks.length);
    
    allTasks.forEach(task => {
      const isSubTask = !!task.parentTaskId; // Check if has parent
      
      if (isSubTask && task.parentTaskId) {
        console.log(`  📎 Subtask found: "${task.title}" (parentId: ${task.parentTaskId})`);
        
        // Check if parent task is in the list
        const parentTask = allTasks.find(t => t.id === task.parentTaskId);
        const parentExists = !!parentTask;
        
        console.log(`    Parent exists in list: ${parentExists}`);
        
        // Check if subtask has the SAME assignees as parent
        // If different assignees, show as standalone card for the assignee
        const hasSameAssignees = parentTask && 
          JSON.stringify(task.assignedTo.sort()) === JSON.stringify(parentTask.assignedTo.sort());
        
        console.log(`    Same assignees as parent: ${hasSameAssignees}`);
        console.log(`    Subtask assignedTo: ${JSON.stringify(task.assignedTo)}`);
        console.log(`    Parent assignedTo: ${parentTask ? JSON.stringify(parentTask.assignedTo) : 'N/A'}`);
        
        if (parentExists && hasSameAssignees) {
          // Group under parent only if they have the same assignees
          if (!taskMap.has(task.parentTaskId)) {
            taskMap.set(task.parentTaskId, { parent: parentTask!, subtasks: [] });
          }
          taskMap.get(task.parentTaskId)!.subtasks.push(task);
          console.log(`    ✅ Added to parent's subtask list (same assignees)`);
        } else {
          // Show standalone if: parent not in list OR different assignees
          standaloneSubtasks.push(task);
          const reason = !parentExists ? 'parent not in list' : 'different assignees';
          console.log(`    ⚠️ Showing standalone (${reason})`);
        }
      } else {
        // Top-level task (no parent)
        if (!taskMap.has(task.id)) {
          taskMap.set(task.id, { parent: task, subtasks: [] });
        }
      }
    });
    
    console.log(`📊 Grouping complete: ${taskMap.size} parent groups, ${standaloneSubtasks.length} standalone subtasks`);
    taskMap.forEach((group, parentId) => {
      console.log(`  Parent "${group.parent.title}": ${group.subtasks.length} subtasks`);
    });
    
    // Combine: parent tasks with their subtasks, then standalone subtasks
    return {
      grouped: Array.from(taskMap.values()),
      standalone: standaloneSubtasks
    };
  }, [allTasks, showSelfAssignedOnly, sortByPriority, sortByDueDate]);

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
    <SafeAreaView className={cn("flex-1", isDarkMode ? "bg-slate-900" : "bg-gray-50")}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {/* Standard Header */}
      <StandardHeader 
        title={(() => {
          // Use button label if available (already includes section header)
          if (buttonLabel) {
            return buttonLabel;
          }

          // Fallback: derive from status
          const statusLabels: Record<string, string> = {
            rejected: "Rejected",
            wip: "WIP",
            done: "Done",
            overdue: "Overdue",
            received: "Received",
            reviewing: "Reviewing",
            assigned: "Assigned",
            all: "All",
          };

          const statusLabel = statusLabels[localStatusFilter as string] || "All";

          return `Tasks: ${statusLabel}`;
        })()}
        showBackButton={!!onNavigateBack}
        onBackPress={onNavigateBack}
      />

      <View className={cn(
        "border-b px-6 py-4",
        isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
      )}>
        {/* Sorting Options */}
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {/* Self-Assigned Filter */}
              <Pressable
                onPress={() => setShowSelfAssignedOnly(!showSelfAssignedOnly)}
                className={cn(
                  "px-3 py-2 rounded-lg border flex-row items-center",
                  showSelfAssignedOnly 
                    ? "bg-blue-500 border-blue-600" 
                    : isDarkMode ? "bg-slate-700 border-slate-600" : "bg-white border-gray-300"
                )}
              >
                <Ionicons 
                  name={showSelfAssignedOnly ? "checkmark-circle" : "person-outline"} 
                  size={16} 
                  color={showSelfAssignedOnly ? "white" : isDarkMode ? "#94a3b8" : "#6b7280"} 
                />
                <Text className={cn(
                  "ml-1.5 text-sm font-medium",
                  showSelfAssignedOnly ? "text-white" : isDarkMode ? "text-slate-300" : "text-gray-700"
                )}>
                  Self-Assigned
                </Text>
              </Pressable>
              
              {/* Sort by Priority */}
              <Pressable
                onPress={togglePrioritySort}
                className={cn(
                  "px-3 py-2 rounded-lg border flex-row items-center",
                  sortByPriority 
                    ? "bg-orange-500 border-orange-600" 
                    : isDarkMode ? "bg-slate-700 border-slate-600" : "bg-white border-gray-300"
                )}
              >
                <Ionicons 
                  name={
                    sortByPriority === "desc" 
                      ? "arrow-down" 
                      : sortByPriority === "asc"
                      ? "arrow-up"
                      : "flame-outline"
                  } 
                  size={16} 
                  color={sortByPriority ? "white" : isDarkMode ? "#94a3b8" : "#6b7280"} 
                />
                <Text className={cn(
                  "ml-1.5 text-sm font-medium",
                  sortByPriority ? "text-white" : isDarkMode ? "text-slate-300" : "text-gray-700"
                )}>
                  Priority
                </Text>
              </Pressable>
              
              {/* Sort by Due Date */}
              <Pressable
                onPress={toggleDueDateSort}
                className={cn(
                  "px-3 py-2 rounded-lg border flex-row items-center",
                  sortByDueDate 
                    ? "bg-purple-500 border-purple-600" 
                    : isDarkMode ? "bg-slate-700 border-slate-600" : "bg-white border-gray-300"
                )}
              >
                <Ionicons 
                  name={
                    sortByDueDate === "desc" 
                      ? "arrow-down" 
                      : sortByDueDate === "asc"
                      ? "arrow-up"
                      : "calendar-outline"
                  } 
                  size={16} 
                  color={sortByDueDate ? "white" : isDarkMode ? "#94a3b8" : "#6b7280"} 
                />
                <Text className={cn(
                  "ml-1.5 text-sm font-medium",
                  sortByDueDate ? "text-white" : isDarkMode ? "text-slate-300" : "text-gray-700"
                )}>
                  Due Date
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Grouped Tasks List */}
        <View className="px-6 py-4">
        {allTasks.length > 0 ? (
          <>
            <Text className={cn(
              "text-base font-semibold mb-3",
              isDarkMode ? "text-slate-400" : "text-gray-600"
            )}>
              {allTasks.length} task{allTasks.length !== 1 ? "s" : ""}
                  </Text>
            
            {/* Render parent tasks with their subtasks */}
            {(() => {
              let taskNumber = 0;
              return (
                <>
                  {groupedTasks.grouped.map((group) => {
                    taskNumber++;
                    const parentNumber = taskNumber;
                    return (
                      <View key={group.parent.id} className="mb-1">
                        {/* Parent task with number */}
                        <View className="flex-row items-start">
                          <Text className={cn(
                            "text-lg font-bold mr-2 mt-3",
                            isDarkMode ? "text-slate-300" : "text-gray-700"
                          )}>{parentNumber}.</Text>
                          <View className="flex-1">
                            <TaskCard task={group.parent} onNavigateToTaskDetail={onNavigateToTaskDetail} className="" />
                          </View>
                        </View>
                        
                        {/* Subtasks indented below parent */}
                        {group.subtasks.length > 0 && (
                          <View className={cn(
                            "ml-9 mt-1 border-l-2 pl-2",
                            isDarkMode ? "border-purple-700" : "border-purple-300"
                          )}>
                            {group.subtasks.map((subtask) => {
                              taskNumber++;
                              return (
                                <View key={subtask.id} className="mb-1 flex-row items-start">
                                  <Text className={cn(
                                    "text-base font-semibold mr-2 mt-3",
                                    isDarkMode ? "text-slate-400" : "text-gray-600"
                                  )}>{taskNumber}.</Text>
                                  <View className="flex-1">
                                    <TaskCard task={subtask} onNavigateToTaskDetail={onNavigateToTaskDetail} className="" />
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                  
                  {/* Render standalone subtasks (parent not in list) */}
                  {groupedTasks.standalone.map((task) => {
                    taskNumber++;
                    return (
                      <View key={task.id} className="mb-1 flex-row items-start">
                        <Text className={cn(
                          "text-lg font-bold mr-2 mt-3",
                          isDarkMode ? "text-slate-300" : "text-gray-700"
                        )}>{taskNumber}.</Text>
                        <View className="flex-1">
                          <TaskCard task={task} onNavigateToTaskDetail={onNavigateToTaskDetail} className="" />
                        </View>
                      </View>
                    );
                  })}
                </>
              );
            })()}
          </>
        ) : (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="clipboard-outline" size={64} color={isDarkMode ? "#475569" : "#9ca3af"} />
            <Text className={cn(
              "text-xl font-medium mt-4",
              isDarkMode ? "text-slate-400" : "text-gray-500"
            )}>
              {localStatusFilter !== "all" ? "No matching tasks" : "No tasks yet"}
            </Text>
            <Text className={cn(
              "text-center mt-2 px-8",
              isDarkMode ? "text-slate-500" : "text-gray-400"
            )}>
              {localStatusFilter !== "all"
                ? "Try adjusting your filters"
                : "You haven't been assigned any tasks yet"
              }
            </Text>
          </View>
        )}
        </View>
        </ScrollView>

        {/* Expandable Utility FAB */}
      {user.role !== "admin" && (
        <ExpandableUtilityFAB
          onCreateTask={onNavigateToCreateTask}
        />
      )}
    </SafeAreaView>
  );
}
