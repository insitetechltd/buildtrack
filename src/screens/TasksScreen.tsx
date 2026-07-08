import React, { useMemo, useState } from "react";
import { Pressable, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppScreenHeader from "@/components/AppScreenHeader";
import ActivityStyleRowCard from "@/components/cards/ActivityStyleRowCard";
import BrandHeaderTitle from "@/components/BrandHeaderTitle";
import TextField from "@/components/primitives/input/TextField";
import { mapTaskInputToTextFieldProps } from "@/ui/mappers/tasksMappers";
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
  const visibleTaskCount = output.scalarMetrics.totalVisibleTaskCount;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["left", "right", "bottom"]}>
      <View className="flex-1">
        <AppScreenHeader
          title="Tasks"
          titleNode={<BrandHeaderTitle subtitle="Tasks" />}
          showBackButton={Boolean(props.onNavigateBack)}
          onBackPress={props.onNavigateBack}
          showProfileTrigger={visibility.showProfileShortcut}
          onNavigateToProfile={props.onNavigateToProfile}
          onNavigateToProjectPicker={visibility.showProjectPickerShortcut ? props.onNavigateToProjectPicker : undefined}
          onNavigateToDeveloperSettings={
            visibility.showDeveloperSettingsShortcut ? props.onNavigateToDeveloperSettings : undefined
          }
          className="border-b-0 bg-[#08576E] pb-2"
          rightSlot={
            visibility.showResetFiltersShortcut ? (
              <Pressable
                testID="tasks-screen__header_reset_filters"
                onPress={actions.resetFilters}
                className="h-10 w-10 items-center justify-center rounded-full bg-[#0D6E87]"
              >
                <Ionicons name="refresh-outline" size={20} color="#F8FCFF" />
              </Pressable>
            ) : null
          }
        />
        <View className="px-4 pt-3">
          <View testID="tasks-screen__search_wrapper" className="mb-1">
            <TextField
              contract={searchContract}
              onChangeText={setSearchQuery}
              rightSlot={
                <View
                  testID="tasks-screen__search_count"
                  className="rounded-full bg-slate-100 px-3 py-1"
                >
                  <Text className="text-sm font-medium text-slate-700">{visibleTaskCount}</Text>
                </View>
              }
            />
          </View>
          <View className="mb-2 flex-row gap-2">
            <Pressable
              testID="tasks-screen__filter_queue"
              onPress={() =>
                setOpenFilterMenu((current) => (current === "queue" ? null : "queue"))
              }
              className="flex-1 rounded-2xl bg-white px-4 py-3"
            >
              <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">Queue</Text>
              <Text className="mt-1 text-base font-medium text-slate-900">{selectedQueueLabel}</Text>
            </Pressable>
            <Pressable
              testID="tasks-screen__filter_bucket"
              onPress={() =>
                setOpenFilterMenu((current) => (current === "bucket" ? null : "bucket"))
              }
              className="flex-1 rounded-2xl bg-white px-4 py-3"
            >
              <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">Bucket</Text>
              <Text className="mt-1 text-base font-medium text-slate-900">{selectedBucketLabel}</Text>
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
                  <Text className="text-base text-slate-900">{option.label}</Text>
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
                  <Text className="text-base text-slate-900">{option.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
        <ScrollView testID="tasks-screen__task_list" className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {output.taskRowItems.length > 0 ? (
            output.taskRowItems.map((row) => (
              <View
                key={row.taskId}
                testID={`tasks-screen__row_wrapper_${row.taskId}`}
                className={cn(
                  "mb-3",
                  row.indentationLevel === 1 ? "ml-6" : row.indentationLevel === 2 ? "ml-10" : "",
                )}
              >
                <ActivityStyleRowCard
                  testID={`tasks-screen__row_${row.taskId}`}
                  title={row.title}
                  subtitle={row.contextLine ?? row.projectName}
                  metaLabel={row.latestUpdateLabel ?? "Task activity"}
                  badgeLabel={row.statusLabel}
                  imageUri={row.primaryPhotoUri}
                  onPress={() => props.onNavigateToTaskDetail(row.taskId)}
                />
              </View>
            ))
          ) : (
            <View
              testID="tasks-screen__empty_state"
              className="rounded-3xl bg-white px-4 py-5"
            >
              <Text className="text-lg font-semibold text-slate-900">No matching tasks</Text>
              <Text className="mt-1 text-base text-slate-500">
                Try a different queue, bucket, project, or search term.
              </Text>
            </View>
          )}
          <View className="h-24" />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
