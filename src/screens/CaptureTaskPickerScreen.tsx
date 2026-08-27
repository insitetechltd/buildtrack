import React, { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import ActivityStyleRowCard from "@/components/cards/ActivityStyleRowCard";
import ModernScreenHeader from "@/components/ModernScreenHeader";
import BrandHeaderTitle from "@/components/BrandHeaderTitle";
import { useAuthStore } from "@/state/authStore";
import { useProjectFilterStore } from "@/state/projectFilterStore";
import { useProjectStoreWithInit } from "@/state/projectStore.supabase";
import { useTaskStore } from "@/state/taskStore.supabase";
import { useUserStore } from "@/state/userStore.supabase";
import { filterTasksForViewer } from "@/ui/contracts/taskVisibilityPermissions";
import { resolveWorkspaceProjectId } from "@/ui/contracts/workspaceProject";
import { getFileUrl, extractBuildtrackStoragePath } from "@/api/fileUploadService";
import type { SelectedPhoto } from "@/navigation/navigationTypes";
import { isCompletedLifecycleStatus } from "@/utils/taskLifecycleStatus";

type CaptureTaskPickerScreenProps = {
  selectedPhotos: SelectedPhoto[];
  onCancel: () => void;
  onSelectTask: (taskId: string) => void;
};

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CaptureTaskPickerScreen({
  selectedPhotos,
  onCancel,
  onSelectTask,
}: CaptureTaskPickerScreenProps) {
  const [query, setQuery] = useState("");
  const user = useAuthStore((s) => s.user);
  const tasks = useTaskStore((s) => s.tasks);
  const selectedProjectId = useProjectFilterStore((s) => s.selectedProjectId);
  const { projects } = useProjectStoreWithInit();
  const getUserById = useUserStore((s) => s.getUserById);

  const availableProjectIds = useMemo(
    () => (projects ?? []).map((project) => project.id),
    [projects],
  );
  const projectId = resolveWorkspaceProjectId(selectedProjectId, availableProjectIds);

  const projectsById = useMemo(() => {
    const map: Record<string, (typeof projects)[number]> = {};
    for (const project of projects ?? []) {
      map[project.id] = project;
    }
    return map;
  }, [projects]);

  const visibleRows = useMemo(() => {
    if (!user || !projectId) {
      return [];
    }

    const openTasks = (tasks ?? []).filter((task) => {
      if (task.projectId !== projectId) {
        return false;
      }
      return !isCompletedLifecycleStatus(task.status);
    });

    const scoped = filterTasksForViewer({
      viewer: user,
      tasks: openTasks,
      projectsById,
      viewerProjectIds: availableProjectIds,
    });

    const needle = query.trim().toLowerCase();
    return scoped
      .filter((task) => {
        if (!needle) {
          return true;
        }
        return (
          task.title.toLowerCase().includes(needle) ||
          (task.description ?? "").toLowerCase().includes(needle)
        );
      })
      .sort(
        (left, right) =>
          new Date(right.updatedAt || right.createdAt || 0).getTime() -
          new Date(left.updatedAt || left.createdAt || 0).getTime(),
      );
  }, [availableProjectIds, projectId, projectsById, query, tasks, user]);

  return (
    <SafeAreaView
      testID="capture-task-picker__root"
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={["left", "right", "bottom"]}
    >
      <StatusBar style="light" />
      <ModernScreenHeader
        title="Select task"
        titleNode={<BrandHeaderTitle label="Select task" subtitle="Update progress" />}
        showBackButton
        onBackPress={onCancel}
      />

      <View className="bg-canvas px-4 pb-3 pt-2 dark:bg-canvas-dark">
        <View className="h-14 flex-row items-center rounded-xl border border-slate-300 bg-white px-4">
          <Ionicons name="search-outline" size={18} color="#64748b" />
          <TextInput
            testID="capture-task-picker__search"
            className="ml-2 flex-1 text-base text-slate-900"
            placeholder="Search tasks"
            placeholderTextColor="#64748b"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            style={{ fontSize: 16 }}
          />
          <Text
            testID="capture-task-picker__count"
            className="rounded-full bg-slate-100 px-3 py-1 font-mono text-sm text-slate-700"
          >
            {visibleRows.length}
          </Text>
        </View>
        <Text className="mt-2 text-sm text-slate-600">
          {selectedPhotos.length} photo{selectedPhotos.length === 1 ? "" : "s"} ready to attach
        </Text>
      </View>

      <ScrollView
        testID="capture-task-picker__list"
        className="flex-1 bg-canvas px-4 dark:bg-canvas-dark"
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 8, gap: 12 }}
      >
        {visibleRows.length === 0 ? (
          <View className="rounded-3xl bg-white px-4 py-5">
            <Text className="text-lg font-semibold text-slate-900">No matching tasks</Text>
            <Text className="mt-1 text-base text-slate-600">
              Try another search, or create a new task instead.
            </Text>
          </View>
        ) : (
          visibleRows.map((task) => {
            const assignee = task.primaryAssigneeId
              ? getUserById?.(task.primaryAssigneeId)
              : undefined;
            const rawAttachment = task.attachments?.[0];
            const attachmentPath =
              typeof rawAttachment === "string"
                ? extractBuildtrackStoragePath(rawAttachment) ?? rawAttachment
                : undefined;
            const imageUri = attachmentPath ? getFileUrl(attachmentPath) : undefined;

            return (
              <ActivityStyleRowCard
                key={task.id}
                testID={`capture-task-picker__row_${task.id}`}
                variant="task"
                title={task.title}
                subtitle={assignee?.name || task.description || "Task"}
                metaLabel={
                  task.dueDate ? `Due: ${String(task.dueDate).slice(0, 10)}` : "No due date"
                }
                badgeLabel={formatStatusLabel(String(task.status))}
                imageUri={imageUri || undefined}
                onPress={() => onSelectTask(task.id)}
              />
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
