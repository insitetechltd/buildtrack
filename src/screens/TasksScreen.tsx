import React, { useState, useCallback, useEffect } from "react";
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
import { useTaskStore } from "../state/taskStore.supabase";
import { useUserStoreWithInit } from "../state/userStore.supabase";
import { useProjectStoreWithInit, useProjectStore } from "../state/projectStore.supabase";
import { useProjectFilterStore } from "../state/projectFilterStore";
import { useCompanyStore } from "../state/companyStore";
import { useThemeStore } from "../state/themeStore";
import { Task, Priority, TaskStatus, SubTask, Project, ProjectStatus } from "../types/buildtrack";
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

// Type for task list items (can be Task or SubTask)
type TaskListItem = Task | (SubTask & { isSubTask: true });

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

  const [searchQuery, setSearchQuery] = useState("");
  const [localSectionFilter, setLocalSectionFilter] = useState<"my_tasks" | "inbox" | "outbox" | "my_work">("my_work");
  const [localStatusFilter, setLocalStatusFilter] = useState<"not_started" | "in_progress" | "completed" | "rejected" | "pending" | "overdue" | "wip" | "done" | "received" | "reviewing" | "assigned" | "all">("all");
  const [refreshing, setRefreshing] = useState(false);
  
  // Sorting options (can apply multiple)
  const [showSelfAssignedOnly, setShowSelfAssignedOnly] = useState(false);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [sortByDueDate, setSortByDueDate] = useState(false);

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

      // Get MY_TASKS (Tasks I assigned to MYSELF - self-assigned only)
      const myTasksParent = projectTasks.filter(task => {
        const assignedTo = task.assignedTo || [];
        const isDirectlyAssigned = Array.isArray(assignedTo) && assignedTo.includes(user.id);
        const isCreatedByMe = task.assignedBy === user.id;
        // Include if assigned to me AND created by me (self-assigned)
        return isDirectlyAssigned && isCreatedByMe;
      });
      
      const myTasksSubTasks = projectTasks.flatMap(task => {
        // Only include subtasks I created and assigned to myself
        return collectSubTasksAssignedTo(task.subTasks, user.id)
          .filter(subTask => subTask.assignedBy === user.id)
          .map(subTask => ({ ...subTask, isSubTask: true as const }));
      });
      
      const myTasksAll = [...myTasksParent, ...myTasksSubTasks];
      
      // Get INBOX tasks (tasks assigned to me by OTHERS only, not self-assigned)
      const inboxParentTasks = projectTasks.filter(task => {
        const assignedTo = task.assignedTo || [];
        const isDirectlyAssigned = Array.isArray(assignedTo) && assignedTo.includes(user.id);
        const isCreatedByMe = task.assignedBy === user.id;
        // Include if assigned to me but NOT created by me
        return isDirectlyAssigned && !isCreatedByMe;
      });
      
      const inboxSubTasks = projectTasks.flatMap(task => {
        // Only include subtasks assigned to me but NOT created by me
        return collectSubTasksAssignedTo(task.subTasks, user.id)
          .filter(subTask => subTask.assignedBy !== user.id)
          .map(subTask => ({ ...subTask, isSubTask: true as const }));
      });
      
      const inboxTasks = [...inboxParentTasks, ...inboxSubTasks];
      
      // Get outbox tasks (tasks assigned by me to OTHERS, not ONLY self-assigned)
      const assignedParentTasks = projectTasks.filter(task => {
        const assignedTo = task.assignedTo || [];
        const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
        const isDirectlyAssignedByMe = task.assignedBy === user.id;
        const isSelfAssignedOnly = isDirectlyAssignedByMe && isAssignedToMe && assignedTo.length === 1;
        // Include if created by me, NOT self-assigned only, not rejected
        return isDirectlyAssignedByMe && !isSelfAssignedOnly && task.currentStatus !== "rejected";
      });
      
      const assignedSubTasks = projectTasks.flatMap(task => 
        collectSubTasksAssignedBy(task.subTasks, user.id)
          .filter(subTask => {
            const assignedTo = subTask.assignedTo || [];
            // Only include subtasks NOT assigned to me
            return !Array.isArray(assignedTo) || !assignedTo.includes(user.id);
          })
          .map(subTask => ({ ...subTask, isSubTask: true as const }))
      );
      
      const outboxTasks = [...assignedParentTasks, ...assignedSubTasks];
      
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
        return inboxTasks;
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

    // Apply search and status filters
    const filteredTasks = allProjectTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // If no status filter, return all tasks from current section
      if (localStatusFilter === "all") {
        return true;
      }
      
      // Handle "my_work" section with specific status filters (for Priority Summary)
      if (localSectionFilter === "my_work") {
        const assignedTo = task.assignedTo || [];
        const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
        const isCreatedByMe = task.assignedBy === user.id;
        const isSelfAssignedOnly = isCreatedByMe && isAssignedToMe && assignedTo.length === 1;
        
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
        const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
        const isCreatedByMe = task.assignedBy === user.id;
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
        const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
        const isCreatedByMe = task.assignedBy === user.id;
        const isInInbox = isAssignedToMe && !isCreatedByMe;
        
        if (localStatusFilter === "reviewing") {
          // REVIEWING: Tasks I CREATED that others submitted for MY review
          // Special case: Breaks inbox definition to show tasks I need to review
          const isCreatedByMeForReview = task.assignedBy === user.id;
          return isCreatedByMeForReview &&
                 task.completionPercentage === 100 &&
                 task.readyForReview === true &&
                 task.reviewAccepted !== true;
        }
        
        if (!isInInbox) return false;
        
        if (localStatusFilter === "received") {
          // RECEIVED: New tasks from others waiting for my acceptance
          return !task.accepted &&
                 task.currentStatus !== "rejected";
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
        const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
        const isCreatedByMe = task.assignedBy === user.id;
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
          return !task.accepted &&
                 task.currentStatus !== "rejected";
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
  if (showSelfAssignedOnly) {
    allTasks = allTasks.filter(task => {
      const assignedTo = task.assignedTo || [];
      const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
      const isCreatedByMe = task.assignedBy === user.id;
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
          return priorityA - priorityB;
        }
      }
      
      // Secondary sort: Due Date (if enabled)
      if (sortByDueDate) {
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        return dateA - dateB;
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
  const groupedTasks = React.useMemo(() => {
    const taskMap = new Map<string, { parent: TaskListItem; subtasks: TaskListItem[] }>();
    const standaloneSubtasks: TaskListItem[] = [];
    
    console.log('🔍 Grouping tasks. Total tasks:', allTasks.length);
    
    allTasks.forEach(task => {
      const isSubTask = 'isSubTask' in task && task.isSubTask;
      
      if (isSubTask) {
        const parentId = task.parentTaskId;
        console.log(`  📎 Subtask found: "${task.title}" (parentId: ${parentId})`);
        
        // Check if parent task is in the list
        const parentExists = allTasks.some(t => {
          const isParent = !('isSubTask' in t) || !t.isSubTask;
          return isParent && t.id === parentId;
        });
        
        console.log(`    Parent exists in list: ${parentExists}`);
        
        if (parentExists) {
          // Add to parent's subtask list
          if (!taskMap.has(parentId)) {
            const parentTask = allTasks.find(t => {
              const isParent = !('isSubTask' in t) || !t.isSubTask;
              return isParent && t.id === parentId;
            })!;
            taskMap.set(parentId, { parent: parentTask, subtasks: [] });
          }
          taskMap.get(parentId)!.subtasks.push(task);
          console.log(`    ✅ Added to parent's subtask list`);
        } else {
          // Parent not in list, show subtask standalone
          standaloneSubtasks.push(task);
          console.log(`    ⚠️ Parent not in list, showing standalone`);
        }
      } else {
        // Parent task
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
        {/* Search Bar */}
        <View className={cn(
          "flex-row items-center rounded-lg px-3 py-2 mb-3",
          isDarkMode ? "bg-slate-700" : "bg-gray-100"
        )}>
          <Ionicons name="search-outline" size={18} color={isDarkMode ? "#94a3b8" : "#6b7280"} />
          <TextInput
            className={cn(
              "flex-1 ml-2 text-base",
              isDarkMode ? "text-white" : "text-gray-900"
            )}
            placeholder="Search tasks..."
            placeholderTextColor={isDarkMode ? "#64748b" : "#9ca3af"}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
        </View>
        
        {/* Sorting Options */}
        <View>
          <Text className={cn(
            "text-sm font-semibold mb-2",
            isDarkMode ? "text-slate-300" : "text-gray-700"
          )}>Sort & Filter:</Text>
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
                onPress={() => setSortByPriority(!sortByPriority)}
                className={cn(
                  "px-3 py-2 rounded-lg border flex-row items-center",
                  sortByPriority 
                    ? "bg-orange-500 border-orange-600" 
                    : isDarkMode ? "bg-slate-700 border-slate-600" : "bg-white border-gray-300"
                )}
              >
                <Ionicons 
                  name={sortByPriority ? "checkmark-circle" : "flame-outline"} 
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
                onPress={() => setSortByDueDate(!sortByDueDate)}
                className={cn(
                  "px-3 py-2 rounded-lg border flex-row items-center",
                  sortByDueDate 
                    ? "bg-purple-500 border-purple-600" 
                    : isDarkMode ? "bg-slate-700 border-slate-600" : "bg-white border-gray-300"
                )}
              >
                <Ionicons 
                  name={sortByDueDate ? "checkmark-circle" : "calendar-outline"} 
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
              {searchQuery || localStatusFilter !== "all" ? "No matching tasks" : "No tasks yet"}
            </Text>
            <Text className={cn(
              "text-center mt-2 px-8",
              isDarkMode ? "text-slate-500" : "text-gray-400"
            )}>
              {searchQuery || localStatusFilter !== "all"
                ? "Try adjusting your search or filters"
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
