import React, { useMemo } from "react";
import { Pressable, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppScreenHeader from "@/components/AppScreenHeader";
import ActivityStyleRowCard from "@/components/cards/ActivityStyleRowCard";
import TasksFiltersBottomSheet from "@/components/tasks/TasksFiltersBottomSheet";
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

function getActiveChipClasses(chipId: "queue" | "status" | "overdueWindow", chipLabel: string) {
  if (chipId === "queue") {
    return {
      container: "border-[#07111E] bg-[#07111E]",
      text: "text-white",
      dismiss: "text-white",
    };
  }

  if (chipId === "status") {
    if (chipLabel.includes("New")) {
      return {
        container: "border-[#BFDBFE] bg-[#EFF6FF]",
        text: "text-[#1D4ED8]",
        dismiss: "text-[#2563EB]",
      };
    }

    if (chipLabel.includes("Doing")) {
      return {
        container: "border-[#FED7AA] bg-[#FFF7ED]",
        text: "text-[#C2410C]",
        dismiss: "text-[#EA580C]",
      };
    }

    if (chipLabel.includes("Review")) {
      return {
        container: "border-[#E9D5FF] bg-[#FAF5FF]",
        text: "text-[#7E22CE]",
        dismiss: "text-[#9333EA]",
      };
    }

    if (chipLabel.includes("Overdue")) {
      return {
        container: "border-[#FECACA] bg-[#FEF2F2]",
        text: "text-[#B91C1C]",
        dismiss: "text-[#DC2626]",
      };
    }
  }

  return {
    container: "border-[#BFE9F0] bg-[#E6F5F8]",
    text: "text-[#08576E]",
    dismiss: "text-[#0D6E87]",
  };
}

export default function TasksScreen(props: TasksScreenProps) {
  const { output, searchInput, setSearchQuery, visibility, actions } = useTasksViewAdapter({
    onNavigateToTaskDetail: props.onNavigateToTaskDetail,
  });

  const searchContract = useMemo(() => {
    const contract = mapTaskInputToTextFieldProps(searchInput);

    return {
      ...contract,
      label: "",
      density: "compact" as const,
    };
  }, [searchInput]);

  const visibleTaskCount = output.scalarMetrics.totalVisibleTaskCount;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["left", "right", "bottom"]}>
      <View className="flex-1">
        <AppScreenHeader
          title="Tasks"
          titleNode={<BrandHeaderTitle subtitle="Tasks" />}
          showBackButton={false}
          onBackPress={undefined}
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
        <View testID="tasks-screen__search_section" className="bg-slate-50 px-4 pt-4">
          <View className="flex-row items-center gap-3">
            <View testID="tasks-screen__search_wrapper" className="flex-1">
              <TextField
                contract={searchContract}
                onChangeText={setSearchQuery}
                rightSlot={
                  <Text
                    testID="tasks-screen__search_count"
                    className="rounded-full bg-slate-100 px-3 py-1 font-mono text-base font-medium text-slate-700"
                  >
                    {visibleTaskCount}
                  </Text>
                }
              />
            </View>

            <Pressable
              testID="tasks-screen__filters_button"
              onPress={actions.openFiltersSheet}
              className={cn(
                "relative flex-row items-center gap-2 rounded-full border px-4 py-3",
                output.filterButton.isActive
                  ? "border-[#0D6E87] bg-[#0D6E87]"
                  : "border-slate-300 bg-white",
              )}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={output.filterButton.isActive ? "#F8FCFF" : "#07111E"}
              />
              <Text
                className={cn(
                  "text-sm font-semibold",
                  output.filterButton.isActive ? "text-white" : "text-[#07111E]",
                )}
              >
                {output.filterButton.label}
              </Text>
              {output.filterButton.activeCount > 0 ? (
                <View
                  testID="tasks-screen__filters_badge"
                  className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-[#07111E] px-1.5 py-0.5"
                >
                  <Text className="text-center text-[11px] font-bold text-white">
                    {output.filterButton.activeCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
          {output.activeFilterChips.length > 0 ? (
            <View testID="tasks-screen__active_filter_chips" className="mt-[10px] flex-row flex-wrap gap-2">
              {output.activeFilterChips.map((chip) => {
                const chipClasses = getActiveChipClasses(chip.id, chip.label);

                return (
                  <Pressable
                    key={chip.id}
                    testID={`tasks-screen__chip_remove_${chip.id}`}
                    onPress={() => actions.removeAppliedFilterChip(chip.id)}
                    className={cn(
                      "flex-row items-center gap-2 rounded-full border px-3 py-1.5",
                      chipClasses.container,
                    )}
                  >
                    <Text className={cn("text-[11.5px] font-semibold", chipClasses.text)}>{chip.label}</Text>
                    <Text className={cn("text-[11px] font-bold", chipClasses.dismiss)}>X</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
        <ScrollView
          testID="tasks-screen__task_list"
          className="flex-1 bg-slate-50 px-4"
          showsVerticalScrollIndicator={false}
        >
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
                  titleClassName="text-base font-semibold text-slate-900"
                  subtitleClassName="mt-1 text-sm text-slate-500"
                  metaClassName="text-sm font-medium text-slate-400"
                  badgeClassName="text-sm font-medium uppercase tracking-wide text-slate-600"
                  badgeVariant="pill"
                  topLeftMarker={
                    row.isOverdue ? (
                      <View
                        testID={`tasks-screen__row_${row.taskId}:overdue-badge`}
                        className="rounded-full bg-red-500 px-2.5 py-1"
                      >
                        <Text className="text-xs font-semibold text-white">Overdue</Text>
                      </View>
                    ) : undefined
                  }
                  onPress={() => props.onNavigateToTaskDetail(row.taskId)}
                />
              </View>
            ))
          ) : (
            <View
              testID="tasks-screen__empty_state"
              className="rounded-3xl bg-white px-4 py-5"
            >
              <Text className="text-xl font-semibold text-slate-900">No matching tasks</Text>
              <Text className="mt-1 text-lg text-slate-500">
                Try a different queue, status, project, or search term.
              </Text>
            </View>
          )}
          <View className="h-24" />
        </ScrollView>
        <TasksFiltersBottomSheet
          visible={output.filterSheet.isOpen}
          stagedQueue={output.filterSheet.stagedQueue}
          stagedStatus={output.filterSheet.stagedStatus}
          stagedOverdueWindow={output.filterSheet.stagedOverdueWindow}
          onClose={actions.closeFiltersSheet}
          onResetAll={actions.resetStagedFilters}
          onApply={actions.applyStagedFilters}
          onStageQueue={actions.stageQueueFilter}
          onStageStatus={actions.stageStatusFilter}
          onStageOverdueWindow={actions.stageOverdueWindowFilter}
        />
      </View>
    </SafeAreaView>
  );
}
