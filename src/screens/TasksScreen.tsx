import React, { useMemo, useState } from "react";
import { Pressable, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ContainerCard from "@/components/primitives/container/ContainerCard";
import ModernUiMarker from "@/components/migration/ModernUiMarker";
import TextField from "@/components/primitives/input/TextField";
import { mapTaskInputToTextFieldProps, mapTaskRowToContainerCardProps } from "@/ui/mappers/tasksMappers";
import { useTasksViewAdapter } from "@/ui/viewAdapters/useTasksViewAdapter";
import { cn } from "@/utils/cn";

interface TasksScreenProps {
  onNavigateToTaskDetail: (taskId: string, subTaskId?: string) => void;
  onNavigateToCreateTask: () => void;
  onNavigateBack?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
  onNavigateToDeveloperSettings?: () => void;
}

export default function TasksScreen(props: TasksScreenProps) {
  const { output, searchInput, setSearchQuery, visibility, actions } = useTasksViewAdapter({
    onNavigateToTaskDetail: props.onNavigateToTaskDetail,
  });
  const [openFilterMenu, setOpenFilterMenu] = useState<"queue" | "bucket" | null>(null);

  const searchContract = useMemo(() => {
    return mapTaskInputToTextFieldProps(searchInput);
  }, [searchInput]);

  const selectedQueueLabel =
    output.filterControls?.queue.options.find((option) => option.isSelected)?.label ?? "All 0";
  const selectedBucketLabel =
    output.filterControls?.bucket.options.find((option) => option.isSelected)?.label ?? "All 0";

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1">
        <View className="px-4 pt-3">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              {props.onNavigateBack ? (
                <Pressable
                  testID="tasks-screen__header_back"
                  onPress={props.onNavigateBack}
                  className="h-10 w-10 items-center justify-center rounded-full bg-white"
                >
                  <Ionicons name="chevron-back" size={20} color="#0f172a" />
                </Pressable>
              ) : null}
              <Text className="ml-2 text-xl font-semibold text-slate-900">Tasks</Text>
            </View>
            <View className="flex-row items-center">
              <ModernUiMarker />
              {visibility.showResetFiltersShortcut ? (
                <Pressable
                  testID="tasks-screen__header_reset_filters"
                  onPress={actions.resetFilters}
                  className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-white"
                >
                  <Ionicons name="refresh-outline" size={20} color="#0f172a" />
                </Pressable>
              ) : null}
              {visibility.showProjectPickerShortcut && props.onNavigateToProjectPicker ? (
                <Pressable
                  testID="tasks-screen__header_project_picker"
                  onPress={() => props.onNavigateToProjectPicker?.(true)}
                  className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-white"
                >
                  <Ionicons name="business-outline" size={20} color="#0f172a" />
                </Pressable>
              ) : null}
              {visibility.showProfileShortcut && props.onNavigateToProfile ? (
                <Pressable
                  testID="tasks-screen__header_profile"
                  onPress={props.onNavigateToProfile}
                  className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-white"
                >
                  <Ionicons name="person-circle-outline" size={22} color="#0f172a" />
                </Pressable>
              ) : null}
              {visibility.showDeveloperSettingsShortcut && props.onNavigateToDeveloperSettings ? (
                <Pressable
                  testID="tasks-screen__header_developer_settings"
                  onPress={props.onNavigateToDeveloperSettings}
                  className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-white"
                >
                  <Ionicons name="settings-outline" size={20} color="#0f172a" />
                </Pressable>
              ) : null}
            </View>
          </View>
          <View className="mb-3">
            <TextField contract={searchContract} onChangeText={setSearchQuery} />
          </View>
          <View className="mb-3 flex-row gap-2">
            <Pressable
              testID="tasks-screen__filter_queue"
              onPress={() =>
                setOpenFilterMenu((current) => (current === "queue" ? null : "queue"))
              }
              className="flex-1 rounded-2xl bg-white px-4 py-3"
            >
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Queue</Text>
              <Text className="mt-1 text-sm font-medium text-slate-900">{selectedQueueLabel}</Text>
            </Pressable>
            <Pressable
              testID="tasks-screen__filter_bucket"
              onPress={() =>
                setOpenFilterMenu((current) => (current === "bucket" ? null : "bucket"))
              }
              className="flex-1 rounded-2xl bg-white px-4 py-3"
            >
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bucket</Text>
              <Text className="mt-1 text-sm font-medium text-slate-900">{selectedBucketLabel}</Text>
            </Pressable>
          </View>
          {openFilterMenu === "queue" && output.filterControls ? (
            <View className="mb-3 rounded-2xl bg-white p-2">
              {output.filterControls.queue.options.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    actions.selectQueue(option.value as "all" | "my_queue" | "team_queue");
                    setOpenFilterMenu(null);
                  }}
                  className={cn(
                    "rounded-xl px-3 py-3",
                    option.isSelected ? "bg-slate-100" : "bg-white",
                  )}
                >
                  <Text className="text-sm text-slate-900">{option.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {openFilterMenu === "bucket" && output.filterControls ? (
            <View className="mb-3 rounded-2xl bg-white p-2">
              {output.filterControls.bucket.options.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    actions.selectBucket(option.value as "all" | "new" | "wip" | "review");
                    setOpenFilterMenu(null);
                  }}
                  className={cn(
                    "rounded-xl px-3 py-3",
                    option.isSelected ? "bg-slate-100" : "bg-white",
                  )}
                >
                  <Text className="text-sm text-slate-900">{option.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View className="mb-3 flex-row items-center justify-between rounded-2xl bg-white px-4 py-3">
            <View>
              <Text className="text-xs uppercase tracking-wide text-slate-500">
                {output.filterSummary.sectionFilterLabel}
              </Text>
              <Text className="mt-1 text-sm text-slate-600">
                {output.filterSummary.statusFilterLabel} · {output.filterSummary.sortLabel}
              </Text>
            </View>
            <View className="rounded-full bg-slate-100 px-3 py-1">
              <Text className="text-xs font-medium text-slate-700">
                {output.scalarMetrics.totalVisibleTaskCount} visible
              </Text>
            </View>
          </View>
        </View>
        <ScrollView testID="tasks-screen__task_list" className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {output.taskRowItems.length > 0 ? (
            output.taskRowItems.map((row) => (
              <View key={row.taskId} className="mb-3">
                <ContainerCard contract={mapTaskRowToContainerCardProps(row)} />
              </View>
            ))
          ) : (
            <View
              testID="tasks-screen__empty_state"
              className="rounded-3xl bg-white px-4 py-5"
            >
              <Text className="text-base font-semibold text-slate-900">No matching tasks</Text>
              <Text className="mt-1 text-sm text-slate-500">
                Try a different queue, bucket, project, or search term.
              </Text>
            </View>
          )}
          <View className="h-24" />
        </ScrollView>
        {visibility.showCreateTaskFab ? (
          <Pressable
            testID="tasks-screen__fab_create_task"
            onPress={props.onNavigateToCreateTask}
            className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-orange-500 shadow-lg"
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
