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
import { Task, Priority, TaskStatus, SubTask, Project, ProjectStatus } from "../types/buildtrack";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import CompanyBanner from "../components/CompanyBanner";
import ExpandableUtilityFAB from "../components/ExpandableUtilityFAB";

interface ProjectsTasksScreenProps {
  onNavigateToTaskDetail: (taskId: string, subTaskId?: string) => void;
  onNavigateToCreateTask: () => void;
  onNavigateBack?: () => void;
}

// Type for task list items (can be Task or SubTask)
type TaskListItem = Task | (SubTask & { isSubTask: true });

export default function ProjectsTasksScreen({ 
  onNavigateToTaskDetail, 
  onNavigateToCreateTask,
  onNavigateBack 
}: ProjectsTasksScreenProps) {
  const { user } = useAuthStore();
  const taskStore = useTaskStore();
  const tasks = taskStore.tasks;
  const userStore = useUserStoreWithInit();
  const { getUserById } = userStore;
  const projectStore = useProjectStoreWithInit();
  const { getProjectById, getProjectsByUser } = projectStore;
  const { selectedProjectId, sectionFilter, statusFilter, clearSectionFilter, clearStatusFilter } = useProjectFilterStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [localSectionFilter, setLocalSectionFilter] = useState<"my_tasks" | "inbox" | "outbox" | "all">("all");
  const [localStatusFilter, setLocalStatusFilter] = useState<TaskStatus | "all">("all");
  const [refreshing, setRefreshing] = useState(false);

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
        const hasAssignedSubtasks = collectSubTasksAssignedTo(task.subTasks, user.id).length > 0;
        // Include if assigned to me AND created by me (self-assigned)
        return isDirectlyAssigned && isCreatedByMe && !hasAssignedSubtasks;
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
        const hasAssignedSubtasks = collectSubTasksAssignedTo(task.subTasks, user.id).length > 0;
        // Include if assigned to me but NOT created by me
        return isDirectlyAssigned && !isCreatedByMe && !hasAssignedSubtasks;
      });
      
      const inboxSubTasks = projectTasks.flatMap(task => {
        // Only include subtasks assigned to me but NOT created by me
        return collectSubTasksAssignedTo(task.subTasks, user.id)
          .filter(subTask => subTask.assignedBy !== user.id)
          .map(subTask => ({ ...subTask, isSubTask: true as const }));
      });
      
      const inboxTasks = [...inboxParentTasks, ...inboxSubTasks];
      
      // Get outbox tasks (tasks assigned by me to OTHERS, not to myself)
      const assignedParentTasks = projectTasks.filter(task => {
        const assignedTo = task.assignedTo || [];
        const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
        const isDirectlyAssignedByMe = task.assignedBy === user.id;
        const hasSubtasksAssignedByMe = collectSubTasksAssignedBy(task.subTasks, user.id).length > 0;
        // Include if created by me, not assigned to me, and has no subtasks assigned by me
        return isDirectlyAssignedByMe && !isAssignedToMe && !hasSubtasksAssignedByMe;
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
      if (localSectionFilter === "my_tasks") {
        // "my_tasks" shows ALL tasks assigned to me (including self-assigned)
        return myTasksAll;
      } else if (localSectionFilter === "inbox") {
        // "inbox" shows only tasks assigned to me by others
        return inboxTasks;
      } else if (localSectionFilter === "outbox") {
        return outboxTasks;
      } else {
        // For "all", return all my tasks (including self-assigned) and outbox tasks
        // Use a Map to ensure unique tasks by ID
        const uniqueTasks = new Map();
        
        // Add all my tasks (including self-assigned)
        myTasksAll.forEach(task => {
          uniqueTasks.set(task.id, task);
        });
        
        // Add outbox tasks (will overwrite if same ID, ensuring uniqueness)
        outboxTasks.forEach(task => {
          uniqueTasks.set(task.id, task);
        });
        
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
      
      // Handle "all" section with specific status filters (for Priority Summary)
      if (localSectionFilter === "all") {
        const assignedTo = task.assignedTo || [];
        const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
        const isCreatedByMe = task.assignedBy === user.id;
        const isSelfAssignedOnly = isCreatedByMe && isAssignedToMe && assignedTo.length === 1;
        
        // For "all" section, combine My Tasks + Inbox logic (not Outbox for most filters)
        const isInMyTasks = (isAssignedToMe && isCreatedByMe) || (isCreatedByMe && task.currentStatus === "rejected");
        const isInInbox = isAssignedToMe && !isCreatedByMe;
        const isInMyTasksOrInbox = isInMyTasks || isInInbox;
        
        if (localStatusFilter === "overdue") {
          // Overdue: My Tasks + Inbox only (not outbox)
          return isInMyTasksOrInbox &&
                 task.completionPercentage < 100 &&
                 isOverdue(task) &&
                 task.currentStatus !== "rejected";
        } else if (localStatusFilter === "wip") {
          // WIP: My Tasks + Inbox only
          if (isInMyTasks) {
            const isSelfAssigned = isCreatedByMe && isAssignedToMe;
            const isAcceptedOrSelfAssigned = task.accepted || (isSelfAssigned && !task.accepted);
            return isAcceptedOrSelfAssigned &&
                   task.completionPercentage < 100 &&
                   !isOverdue(task) &&
                   task.currentStatus !== "rejected";
          } else if (isInInbox) {
            return task.accepted &&
                   !isOverdue(task) &&
                   task.currentStatus !== "rejected" &&
                   (task.completionPercentage < 100 ||
                    (task.completionPercentage === 100 && !task.readyForReview));
          }
          return false;
        } else if (localStatusFilter === "done") {
          // Done: My Tasks + Inbox + Outbox
          const isInOutbox = isCreatedByMe && !isSelfAssignedOnly && task.currentStatus !== "rejected";
          if (isInMyTasks) {
            return task.completionPercentage === 100 &&
                   task.currentStatus !== "rejected";
          } else if (isInInbox) {
            return task.completionPercentage === 100 &&
                   task.reviewAccepted === true;
          } else if (isInOutbox) {
            return task.completionPercentage === 100 &&
                   task.reviewAccepted === true;
          }
          return false;
        }
        // For other statuses, return false for "all" section
        return false;
      }
      
      // Apply exact filter logic for each button combination
      if (localSectionFilter === "my_tasks") {
        // My Tasks: Rejected, WIP, Done, Overdue
        const assignedTo = task.assignedTo || [];
        const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
        const isCreatedByMe = task.assignedBy === user.id;
        const isInMyTasks = (isAssignedToMe && isCreatedByMe) || (isCreatedByMe && task.currentStatus === "rejected");
        
        if (!isInMyTasks) return false;
        
        if (localStatusFilter === "rejected") {
          return task.currentStatus === "rejected";
        } else if (localStatusFilter === "wip") {
          const isSelfAssigned = isCreatedByMe && isAssignedToMe;
          const isAcceptedOrSelfAssigned = task.accepted || (isSelfAssigned && !task.accepted);
          return isAcceptedOrSelfAssigned &&
                 task.completionPercentage < 100 &&
                 !isOverdue(task) &&
                 task.currentStatus !== "rejected";
        } else if (localStatusFilter === "done") {
          return task.completionPercentage === 100 &&
                 task.currentStatus !== "rejected";
        } else if (localStatusFilter === "overdue") {
          return task.completionPercentage < 100 &&
                 isOverdue(task) &&
                 task.currentStatus !== "rejected";
        }
        return false;
      } else if (localSectionFilter === "inbox") {
        // Inbox: Received, WIP, Reviewing, Done, Overdue
        const assignedTo = task.assignedTo || [];
        const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
        const isCreatedByMe = task.assignedBy === user.id;
        const isInInbox = isAssignedToMe && !isCreatedByMe;
        
        if (localStatusFilter === "reviewing") {
          // Special: Filter from ALL tasks (breaks inbox definition)
          const isCreatedByMeForReview = task.assignedBy === user.id;
          return isCreatedByMeForReview &&
                 task.completionPercentage === 100 &&
                 task.readyForReview === true &&
                 task.reviewAccepted !== true;
        }
        
        if (!isInInbox) return false;
        
        if (localStatusFilter === "received") {
          return !task.accepted &&
                 task.currentStatus !== "rejected";
        } else if (localStatusFilter === "wip") {
          return task.accepted &&
                 !isOverdue(task) &&
                 task.currentStatus !== "rejected" &&
                 (task.completionPercentage < 100 ||
                  (task.completionPercentage === 100 && !task.readyForReview));
        } else if (localStatusFilter === "done") {
          return task.completionPercentage === 100 &&
                 task.reviewAccepted === true;
        } else if (localStatusFilter === "overdue") {
          return task.completionPercentage < 100 &&
                 isOverdue(task) &&
                 task.currentStatus !== "rejected";
        }
        return false;
      } else if (localSectionFilter === "outbox") {
        // Outbox: Assigned, WIP, Reviewing, Done, Overdue
        const assignedTo = task.assignedTo || [];
        const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
        const isCreatedByMe = task.assignedBy === user.id;
        const isSelfAssignedOnly = isCreatedByMe && isAssignedToMe && assignedTo.length === 1;
        const isInOutbox = isCreatedByMe && !isSelfAssignedOnly && task.currentStatus !== "rejected";
        
        if (localStatusFilter === "reviewing") {
          // Special: Filter from ALL tasks (breaks outbox definition)
          return !isCreatedByMe &&
                 isAssignedToMe &&
                 task.completionPercentage === 100 &&
                 task.readyForReview === true &&
                 task.reviewAccepted !== true;
        }
        
        if (!isInOutbox) return false;
        
        if (localStatusFilter === "assigned") {
          return !task.accepted &&
                 task.currentStatus !== "rejected";
        } else if (localStatusFilter === "wip") {
          return task.accepted &&
                 !isOverdue(task) &&
                 task.currentStatus !== "rejected" &&
                 (task.completionPercentage < 100 ||
                  (task.completionPercentage === 100 && !task.readyForReview));
        } else if (localStatusFilter === "done") {
          return task.completionPercentage === 100 &&
                 task.reviewAccepted === true;
        } else if (localStatusFilter === "overdue") {
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
      case "rejected": return "text-red-600 bg-red-50";
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



  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Standard Header */}
      <StandardHeader 
        title={(() => {
          const sectionLabels: Record<string, string> = {
            my_tasks: "My Tasks",
            inbox: "Inbox",
            outbox: "Outbox",
            all: "All",
          };

          const statusLabels: Record<string, string> = {
            rejected: "Rejected",
            wip: "WIP",
            done: "Done",
            overdue: "Overdue",
            received: "Received",
            reviewing: "Reviewing",
            assigned: "Assigned",
          };

          const sectionLabel = sectionLabels[localSectionFilter] || "All";
          const statusLabel = statusLabels[localStatusFilter as string] || "";

          // If both section and status are specified
          if (statusLabel && localStatusFilter !== "all") {
            return `Tasks - ${sectionLabel} ${statusLabel}`;
          }

          // If only section is specified (status is "all")
          if (localStatusFilter === "all") {
            return `Tasks - ${sectionLabel}`;
          }

          // Default fallback
          return "Tasks";
        })()}
        showBackButton={!!onNavigateBack}
        onBackPress={onNavigateBack}
      />

      <View className="bg-white border-b border-gray-200 px-6 py-4">
        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
          <Ionicons name="search-outline" size={18} color="#6b7280" />
          <TextInput
            className="flex-1 ml-2 text-gray-900 text-sm"
            placeholder="Search tasks..."
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Flat Tasks List */}
        <View className="px-6 py-4">
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
