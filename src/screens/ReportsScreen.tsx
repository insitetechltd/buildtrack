import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuthStore } from "../state/authStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { useUserStore } from "../state/userStore.supabase";
import { useProjectStore } from "../state/projectStore";
import { useProjectFilterStore } from "../state/projectFilterStore";
import { useCompanyStore } from "../state/companyStore";
import { useTranslation } from "../utils/useTranslation";
import { useDateFormatter } from "../utils/dateFormatter";
import { SubTask, Task } from "../types/buildtrack";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";

interface ReportsScreenProps {
  onNavigateBack: () => void;
}

export default function ReportsScreen({ onNavigateBack }: ReportsScreenProps) {
  const { user } = useAuthStore();
  const tasks = useTaskStore(state => state.tasks);
  const { getUserById } = useUserStore();
  const { selectedProjectId } = useProjectFilterStore();
  const { getCompanyBanner } = useCompanyStore();
  const t = useTranslation();
  const dateFormatter = useDateFormatter();

  const [reportType, setReportType] = useState<"my_tasks" | "assigned_tasks">("my_tasks");
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

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

  // Include subtasks but exclude parent tasks if user is only assigned to subtasks
  const myParentTasks = projectFilteredTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    const isDirectlyAssigned = Array.isArray(assignedTo) && assignedTo.includes(user.id);
    const hasAssignedSubtasks = collectSubTasksAssignedTo(task.subTasks, user.id).length > 0;
    return isDirectlyAssigned && !hasAssignedSubtasks;
  });
  
  const mySubTasks = projectFilteredTasks.flatMap(task => {
    return collectSubTasksAssignedTo(task.subTasks, user.id);
  });
  
  const myTasks = [...myParentTasks, ...mySubTasks];
  
  // Same logic for assigned tasks - now includes workers
  const assignedParentTasks = projectFilteredTasks.filter(task => {
    const isDirectlyAssignedByMe = task.assignedBy === user.id;
    const hasSubtasksAssignedByMe = collectSubTasksAssignedBy(task.subTasks, user.id).length > 0;
    return isDirectlyAssignedByMe && !hasSubtasksAssignedByMe;
  });
  
  const assignedSubTasksList = projectFilteredTasks.flatMap(task => 
    collectSubTasksAssignedBy(task.subTasks, user.id)
  );
  
  const assignedTasks = [...assignedParentTasks, ...assignedSubTasksList];
  
  const reportTasks = reportType === "my_tasks" ? myTasks : assignedTasks;

  // Filter tasks by date range
  const filteredTasks = reportTasks.filter(task => {
    const taskDate = new Date(task.createdAt);
    return taskDate >= dateRange.from && taskDate <= dateRange.to;
  });

  // Calculate statistics
  const stats = {
    total: filteredTasks.length,
    completed: filteredTasks.filter(t => (t.currentStatus ?? t.status) === "completed").length,
    inProgress: filteredTasks.filter(t => (t.currentStatus ?? t.status) === "in_progress").length,
    notStarted: filteredTasks.filter(t => (t.currentStatus ?? t.status) === "not_started").length,
    rejected: filteredTasks.filter(t => (t.currentStatus ?? t.status) === "rejected").length,
    overdue: filteredTasks.filter(t => 
      new Date(t.dueDate) < new Date() && (t.currentStatus ?? t.status) !== "completed"
    ).length,
    byPriority: {
      critical: filteredTasks.filter(t => t.priority === "critical").length,
      high: filteredTasks.filter(t => t.priority === "high").length,
      medium: filteredTasks.filter(t => t.priority === "medium").length,
      low: filteredTasks.filter(t => t.priority === "low").length,
    },
    averageCompletion: filteredTasks.length > 0 
      ? Math.round(filteredTasks.reduce((sum, task) => sum + task.completionPercentage, 0) / filteredTasks.length)
      : 0,
  };

  const generateReport = () => {
    // In a real app, this would generate and export a PDF or CSV
    // const reportData = { ... }

    // In a real app, this would generate and export a PDF or CSV
    Alert.alert(
      t.reports.reportGenerated,
      `${t.reports.reportContains} ${filteredTasks.length} ${t.reports.tasksFrom} ${dateFormatter.formatDateShort(dateRange.from)} ${t.reports.toDate} ${dateFormatter.formatDateShort(dateRange.to)}.\n\n${t.reports.exportAsPDF}`,
      [
        {
          text: t.reports.viewSummary,
          onPress: () => {
            Alert.alert(
              t.reports.reportSummary,
              `${t.reports.totalTasks}: ${stats.total}\n${t.reports.completed}: ${stats.completed}\n${t.reports.inProgress}: ${stats.inProgress}\n${t.reports.overdue}: ${stats.overdue}\n${t.reports.avgCompletion}: ${stats.averageCompletion}%`
            );
          }
        },
        { text: t.common.ok }
      ]
    );
  };

  const StatCard = ({ 
    label, 
    value, 
    icon, 
    color = "bg-blue-50",
    textColor = "text-blue-600" 
  }: {
    label: string;
    value: number;
    icon: string;
    color?: string;
    textColor?: string;
  }) => (
    <View className={cn("flex-1 p-4 rounded-xl mr-3 mb-3", color)}>
      <View className="flex-row items-center justify-between mb-2">
        <Ionicons name={icon as any} size={20} color="#6b7280" />
        <Text className={cn("text-2xl font-bold", textColor)}>{value}</Text>
      </View>
      <Text className="text-base text-gray-600">{label}</Text>
    </View>
  );

  const TaskRow = ({ task }: { task: Task }) => (
    (() => {
      const taskStatus = task.currentStatus ?? task.status;
      return (
    <View className="bg-white border border-gray-200 rounded-lg p-3 mb-2">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="font-medium text-gray-900 flex-1" numberOfLines={1}>
          {task.title}
        </Text>
        <Text className={cn(
          "text-sm px-2 py-1 rounded capitalize",
          taskStatus === "completed" ? "bg-green-100 text-green-700" :
          taskStatus === "in_progress" ? "bg-blue-100 text-blue-700" :
          taskStatus === "rejected" ? "bg-red-100 text-red-700" :
          "bg-gray-100 text-gray-700"
        )}>
          {taskStatus.replace("_", " ")}
        </Text>
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-gray-500">
          {t.taskDetail.due}: {dateFormatter.formatDateShort(task.dueDate)}
        </Text>
        <Text className="text-sm text-gray-500">
          {task.completionPercentage}% complete
        </Text>
      </View>
    </View>
      );
    })()
  );

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Standard Header */}
      <StandardHeader 
        title={t.nav.reports}
        showBackButton={true}
        onBackPress={onNavigateBack}
        rightElement={
          <Pressable
            onPress={generateReport}
            className="px-4 py-2 bg-blue-600 rounded-lg"
          >
            <Text className="text-white font-medium">{t.common.done}</Text>
          </Pressable>
        }
      />

      <ScrollView className="flex-1 px-6 py-4">

        {/* Report Configuration */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <Text className="text-xl font-semibold text-gray-900 mb-4">
            {t.reports.reportConfiguration}
          </Text>

          {/* Report Type */}
          <View className="mb-4">
            <Text className="text-base font-medium text-gray-700 mb-2">{t.reports.reportType}</Text>
            <View className="flex-row space-x-2">
              <Pressable
                onPress={() => setReportType("my_tasks")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg border",
                  reportType === "my_tasks" 
                    ? "bg-blue-50 border-blue-300" 
                    : "bg-gray-50 border-gray-300"
                )}
              >
                <Text className={cn(
                  "text-center font-medium",
                  reportType === "my_tasks" ? "text-blue-700" : "text-gray-700"
                )}>
                  {t.reports.myTasks}
                </Text>
              </Pressable>
              {assignedTasks.length > 0 && (
                <Pressable
                  onPress={() => setReportType("assigned_tasks")}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg border",
                    reportType === "assigned_tasks" 
                      ? "bg-blue-50 border-blue-300" 
                      : "bg-gray-50 border-gray-300"
                  )}
                >
                  <Text className={cn(
                    "text-center font-medium",
                    reportType === "assigned_tasks" ? "text-blue-700" : "text-gray-700"
                  )}>
                    {t.reports.assignedTasks}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Date Range */}
          <View className="mb-4">
            <Text className="text-base font-medium text-gray-700 mb-2">{t.reports.dateRange}</Text>
            <View className="flex-row space-x-2">
              <Pressable
                onPress={() => setShowFromDatePicker(true)}
                className="flex-1 py-2 px-3 bg-gray-50 border border-gray-300 rounded-lg"
              >
                <Text className="text-gray-900 text-center">
                  {t.reports.from}: {dateFormatter.formatDateShort(dateRange.from)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowToDatePicker(true)}
                className="flex-1 py-2 px-3 bg-gray-50 border border-gray-300 rounded-lg"
              >
                <Text className="text-gray-900 text-center">
                  {t.reports.to}: {dateFormatter.formatDateShort(dateRange.to)}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Statistics Overview */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <Text className="text-xl font-semibold text-gray-900 mb-4">
            {t.reports.statisticsOverview}
          </Text>

          <View className="flex-row flex-wrap -mr-3">
            <StatCard
              label={t.reports.totalTasks}
              value={stats.total}
              icon="list-outline"
              color="bg-blue-50"
              textColor="text-blue-600"
            />
            <StatCard
              label={t.reports.completed}
              value={stats.completed}
              icon="checkmark-circle-outline"
              color="bg-green-50"
              textColor="text-green-600"
            />
            <StatCard
              label={t.reports.inProgress}
              value={stats.inProgress}
              icon="timer-outline"
              color="bg-yellow-50"
              textColor="text-yellow-600"
            />
            <StatCard
              label={t.reports.overdue}
              value={stats.overdue}
              icon="warning-outline"
              color="bg-red-50"
              textColor="text-red-600"
            />
            <View className="flex-1 p-4 rounded-xl mr-3 mb-3 bg-purple-50">
              <View className="flex-row items-center justify-between mb-2">
                <Ionicons name="trending-up-outline" size={20} color="#6b7280" />
                <Text className="text-2xl font-bold text-purple-600">{stats.averageCompletion}%</Text>
              </View>
              <Text className="text-base text-gray-600">{t.reports.avgCompletion}</Text>
            </View>
            <StatCard
              label={t.reports.criticalPriority}
              value={stats.byPriority.critical}
              icon="alert-circle-outline"
              color="bg-red-50"
              textColor="text-red-600"
            />
          </View>
        </View>

        {/* Task List Preview */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-semibold text-gray-900">
              {t.reports.taskPreview}
            </Text>
            <Text className="text-base text-gray-500">
              {filteredTasks.length} {t.tasks.tasksPlural}
            </Text>
          </View>

          {filteredTasks.length > 0 ? (
            <View>
              {filteredTasks.slice(0, 5).map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
              {filteredTasks.length > 5 && (
                <Text className="text-center text-gray-500 text-base mt-2">
                  + {filteredTasks.length - 5} {t.reports.moreTasksInReport}
                </Text>
              )}
            </View>
          ) : (
            <View className="py-8 items-center">
              <Ionicons name="document-outline" size={48} color="#d1d5db" />
              <Text className="text-gray-500 mt-2">{t.reports.noTasksFound}</Text>
              <Text className="text-gray-400 text-base text-center mt-1">
                {t.reports.adjustDateRange}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {showFromDatePicker && (
        <DateTimePicker
          value={dateRange.from}
          mode="date"
          display="default"
          maximumDate={dateRange.to}
          onChange={(_event, selectedDate) => {
            setShowFromDatePicker(false);
            if (selectedDate) {
              setDateRange(prev => ({ ...prev, from: selectedDate }));
            }
          }}
        />
      )}

      {showToDatePicker && (
        <DateTimePicker
          value={dateRange.to}
          mode="date"
          display="default"
          minimumDate={dateRange.from}
          maximumDate={new Date()}
          onChange={(_event, selectedDate) => {
            setShowToDatePicker(false);
            if (selectedDate) {
              setDateRange(prev => ({ ...prev, to: selectedDate }));
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}
