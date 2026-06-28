import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { useAuthStore } from "@/state/authStore";
import { useProjectFilterStore } from "@/state/projectFilterStore";
import { useTaskStore } from "@/state/taskStore.supabase";
import type {
  ReportsScreenReportType,
  ReportsScreenViewAdapterOutput,
} from "@/ui/contracts/viewAdapters";
import type { Task } from "@/types/buildtrack";
import { useDateFormatter } from "@/utils/dateFormatter";
import { useTranslation } from "@/utils/useTranslation";

export interface ReportsViewAdapterHookResult {
  output: ReportsScreenViewAdapterOutput;
  actions: {
    selectReportType: (value: ReportsScreenReportType) => void;
    openFromDatePicker: () => void;
    openToDatePicker: () => void;
    dismissFromDatePicker: () => void;
    dismissToDatePicker: () => void;
    setFromDate: (date?: Date) => void;
    setToDate: (date?: Date) => void;
    generateReportSummary: () => void;
  };
}

function collectSubTasksAssignedBy(subTasks: Task[] | undefined, userId: string): Task[] {
  if (!subTasks?.length) {
    return [];
  }

  const collected: Task[] = [];

  for (const subTask of subTasks) {
    if (subTask.assignedBy === userId) {
      collected.push(subTask);
    }

    if (subTask.subTasks?.length) {
      collected.push(...collectSubTasksAssignedBy(subTask.subTasks, userId));
    }
  }

  return collected;
}

function collectSubTasksAssignedTo(subTasks: Task[] | undefined, userId: string): Task[] {
  if (!subTasks?.length) {
    return [];
  }

  const collected: Task[] = [];

  for (const subTask of subTasks) {
    if (Array.isArray(subTask.assignedTo) && subTask.assignedTo.includes(userId)) {
      collected.push(subTask);
    }

    if (subTask.subTasks?.length) {
      collected.push(...collectSubTasksAssignedTo(subTask.subTasks, userId));
    }
  }

  return collected;
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function getStatusTone(status: string): "neutral" | "info" | "success" | "danger" {
  if (status === "completed" || status === "approved" || status === "done") {
    return "success";
  }

  if (status === "in_progress" || status === "reviewing" || status === "wip") {
    return "info";
  }

  if (status === "rejected" || status === "declined" || status === "cancelled") {
    return "danger";
  }

  return "neutral";
}

export function useReportsViewAdapter(): ReportsViewAdapterHookResult {
  const user = useAuthStore((state) => state.user);
  const tasks = useTaskStore((state) => state.tasks);
  const selectedProjectId = useProjectFilterStore((state) => state.selectedProjectId);
  const t = useTranslation();
  const dateFormatter = useDateFormatter();
  const [reportType, setReportType] = useState<ReportsScreenReportType>("my_tasks");
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [isShowingFromPicker, setIsShowingFromPicker] = useState(false);
  const [isShowingToPicker, setIsShowingToPicker] = useState(false);

  const projectFilteredTasks = useMemo(
    () =>
      selectedProjectId
        ? tasks.filter((task) => task.projectId === selectedProjectId)
        : tasks,
    [selectedProjectId, tasks],
  );

  const myTasks = useMemo(() => {
    if (!user) {
      return [];
    }

    const directParentTasks = projectFilteredTasks.filter((task) => {
      const isDirectlyAssigned =
        Array.isArray(task.assignedTo) && task.assignedTo.includes(user.id);
      const hasAssignedSubTasks = collectSubTasksAssignedTo(task.subTasks, user.id).length > 0;

      return isDirectlyAssigned && !hasAssignedSubTasks;
    });

    const nestedAssignedTasks = projectFilteredTasks.flatMap((task) =>
      collectSubTasksAssignedTo(task.subTasks, user.id),
    );

    return [...directParentTasks, ...nestedAssignedTasks];
  }, [projectFilteredTasks, user]);

  const assignedTasks = useMemo(() => {
    if (!user) {
      return [];
    }

    const directParentTasks = projectFilteredTasks.filter((task) => {
      const isDirectlyAssignedByMe = task.assignedBy === user.id;
      const hasAssignedSubTasks = collectSubTasksAssignedBy(task.subTasks, user.id).length > 0;

      return isDirectlyAssignedByMe && !hasAssignedSubTasks;
    });

    const nestedAssignedTasks = projectFilteredTasks.flatMap((task) =>
      collectSubTasksAssignedBy(task.subTasks, user.id),
    );

    return [...directParentTasks, ...nestedAssignedTasks];
  }, [projectFilteredTasks, user]);

  useEffect(() => {
    if (reportType === "assigned_tasks" && assignedTasks.length === 0) {
      setReportType("my_tasks");
    }
  }, [assignedTasks.length, reportType]);

  const reportTasks = useMemo(
    () => (reportType === "my_tasks" ? myTasks : assignedTasks),
    [assignedTasks, myTasks, reportType],
  );

  const filteredTasks = useMemo(
    () =>
      reportTasks.filter((task) => {
        const createdAt = new Date(task.createdAt);
        return createdAt >= dateRange.from && createdAt <= dateRange.to;
      }),
    [dateRange.from, dateRange.to, reportTasks],
  );

  const stats = useMemo(() => {
    const completed = filteredTasks.filter(
      (task) => (task.currentStatus ?? task.status) === "completed",
    ).length;
    const inProgress = filteredTasks.filter(
      (task) => (task.currentStatus ?? task.status) === "in_progress",
    ).length;
    const overdue = filteredTasks.filter((task) => {
      const taskStatus = task.currentStatus ?? task.status;
      return new Date(task.dueDate) < new Date() && taskStatus !== "completed";
    }).length;
    const critical = filteredTasks.filter((task) => task.priority === "critical").length;
    const averageCompletion =
      filteredTasks.length > 0
        ? Math.round(
            filteredTasks.reduce((total, task) => total + task.completionPercentage, 0) /
              filteredTasks.length,
          )
        : 0;

    return {
      total: filteredTasks.length,
      completed,
      inProgress,
      overdue,
      critical,
      averageCompletion,
    };
  }, [filteredTasks]);

  const statisticsCards = useMemo(
    () => [
      {
        id: "reports-stat:total",
        label: t.reports.totalTasks,
        value: stats.total,
        icon: "list-outline",
        color: "bg-blue-50",
        textColor: "text-blue-600",
        density: "standard" as const,
        structuralState: "stale" as const,
      },
      {
        id: "reports-stat:completed",
        label: t.reports.completed,
        value: stats.completed,
        icon: "checkmark-circle-outline",
        color: "bg-green-50",
        textColor: "text-green-600",
        density: "standard" as const,
        structuralState: "stale" as const,
      },
      {
        id: "reports-stat:in_progress",
        label: t.reports.inProgress,
        value: stats.inProgress,
        icon: "timer-outline",
        color: "bg-yellow-50",
        textColor: "text-yellow-600",
        density: "standard" as const,
        structuralState: "stale" as const,
      },
      {
        id: "reports-stat:overdue",
        label: t.reports.overdue,
        value: stats.overdue,
        icon: "warning-outline",
        color: "bg-red-50",
        textColor: "text-red-600",
        density: "standard" as const,
        structuralState: "stale" as const,
      },
      {
        id: "reports-stat:avg_completion",
        label: t.reports.avgCompletion,
        value: `${stats.averageCompletion}%`,
        icon: "trending-up-outline",
        color: "bg-purple-50",
        textColor: "text-purple-600",
        density: "standard" as const,
        structuralState: "stale" as const,
      },
      {
        id: "reports-stat:critical",
        label: t.reports.criticalPriority,
        value: stats.critical,
        icon: "alert-circle-outline",
        color: "bg-red-50",
        textColor: "text-red-600",
        density: "standard" as const,
        structuralState: "stale" as const,
      },
    ],
    [
      stats.averageCompletion,
      stats.completed,
      stats.critical,
      stats.inProgress,
      stats.overdue,
      stats.total,
      t.reports.avgCompletion,
      t.reports.completed,
      t.reports.criticalPriority,
      t.reports.inProgress,
      t.reports.overdue,
      t.reports.totalTasks,
    ],
  );

  const visibleTaskRows = useMemo(
    () =>
      filteredTasks.slice(0, 5).map((task) => {
        const status = task.currentStatus ?? task.status;

        return {
          id: `reports-row:${task.id}`,
          taskId: task.id,
          title: task.title,
          statusLabel: formatStatusLabel(status),
          dueDateLabel: `${t.taskDetail.due}: ${dateFormatter.formatDateShort(task.dueDate)}`,
          completionLabel: `${task.completionPercentage}% complete`,
          statusTone: getStatusTone(status),
          density: "standard" as const,
          structuralState: "stale" as const,
        };
      }),
    [dateFormatter, filteredTasks, t.taskDetail.due],
  );

  const generateReportSummary = useCallback(() => {
    Alert.alert(
      t.reports.reportGenerated,
      `${t.reports.reportContains} ${filteredTasks.length} ${t.reports.tasksFrom} ${dateFormatter.formatDateShort(dateRange.from)} ${t.reports.toDate} ${dateFormatter.formatDateShort(dateRange.to)}.\n\n${t.reports.exportAsPDF}`,
      [
        {
          text: t.reports.viewSummary,
          onPress: () => {
            Alert.alert(
              t.reports.reportSummary,
              `${t.reports.totalTasks}: ${stats.total}\n${t.reports.completed}: ${stats.completed}\n${t.reports.inProgress}: ${stats.inProgress}\n${t.reports.overdue}: ${stats.overdue}\n${t.reports.avgCompletion}: ${stats.averageCompletion}%`,
            );
          },
        },
        { text: t.common.ok },
      ],
    );
  }, [
    dateFormatter,
    dateRange.from,
    dateRange.to,
    filteredTasks.length,
    stats.averageCompletion,
    stats.completed,
    stats.inProgress,
    stats.overdue,
    stats.total,
    t.common.ok,
    t.reports.avgCompletion,
    t.reports.completed,
    t.reports.exportAsPDF,
    t.reports.inProgress,
    t.reports.overdue,
    t.reports.reportContains,
    t.reports.reportGenerated,
    t.reports.reportSummary,
    t.reports.tasksFrom,
    t.reports.toDate,
    t.reports.totalTasks,
    t.reports.viewSummary,
  ]);

  const output = useMemo<ReportsScreenViewAdapterOutput>(
    () => ({
      screenId: "ReportsScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: Boolean(user),
        isBackgroundRefreshing: false,
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading: false,
        isBackgroundRefreshing: false,
        hasCachedFrame: Boolean(user),
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: false,
        freshnessLabel: "Ready",
      },
      currentReportType: reportType,
      reportTypeOptions: [
        {
          id: "reports-type:my_tasks",
          value: "my_tasks",
          label: t.reports.myTasks,
          isSelected: reportType === "my_tasks",
          isVisible: true,
        },
        {
          id: "reports-type:assigned_tasks",
          value: "assigned_tasks",
          label: t.reports.assignedTasks,
          isSelected: reportType === "assigned_tasks",
          isVisible: assignedTasks.length > 0,
        },
      ],
      dateRange: {
        from: dateRange.from,
        to: dateRange.to,
        fromLabel: `${t.reports.from}: ${dateFormatter.formatDateShort(dateRange.from)}`,
        toLabel: `${t.reports.to}: ${dateFormatter.formatDateShort(dateRange.to)}`,
        isShowingFromPicker,
        isShowingToPicker,
      },
      statisticsCards,
      visibleTaskRows,
      totalVisibleTaskCount: filteredTasks.length,
      hiddenTaskCount: Math.max(filteredTasks.length - visibleTaskRows.length, 0),
    }),
    [
      assignedTasks.length,
      dateFormatter,
      dateRange.from,
      dateRange.to,
      filteredTasks.length,
      isShowingFromPicker,
      isShowingToPicker,
      reportType,
      statisticsCards,
      t.reports.assignedTasks,
      t.reports.from,
      t.reports.myTasks,
      t.reports.to,
      user,
      visibleTaskRows,
    ],
  );

  return {
    output,
    actions: {
      selectReportType: setReportType,
      openFromDatePicker: () => setIsShowingFromPicker(true),
      openToDatePicker: () => setIsShowingToPicker(true),
      dismissFromDatePicker: () => setIsShowingFromPicker(false),
      dismissToDatePicker: () => setIsShowingToPicker(false),
      setFromDate: (date?: Date) => {
        setIsShowingFromPicker(false);
        if (!date) {
          return;
        }

        setDateRange((current) => ({
          from: date,
          to: current.to < date ? date : current.to,
        }));
      },
      setToDate: (date?: Date) => {
        setIsShowingToPicker(false);
        if (!date) {
          return;
        }

        setDateRange((current) => ({
          from: current.from > date ? date : current.from,
          to: date,
        }));
      },
      generateReportSummary,
    },
  };
}
