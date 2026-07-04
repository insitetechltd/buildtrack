import React, { useMemo } from "react";
import { Pressable, Text, View, SectionList, ScrollView } from "react-native";
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

  const searchContract = useMemo(() => {
    return mapTaskInputToTextFieldProps(searchInput);
  }, [searchInput]);

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
        {output.isSearchMode ? (
          <SectionList
            testID="tasks-screen__search_results"
            className="flex-1 px-4"
            sections={[
              {
                title: "All Task Results",
                data: output.searchResults,
              },
            ]}
            keyExtractor={(item) => item.taskId}
            renderSectionHeader={({ section }) => (
              <View className="mb-3 rounded-3xl bg-white px-4 py-4">
                <Text className="text-base font-semibold text-slate-900">{section.title}</Text>
                <Text className="mt-1 text-sm text-slate-500">
                  {output.searchResults.length} {output.searchResults.length === 1 ? "result" : "results"}
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View className="mb-3">
                <ContainerCard contract={mapTaskRowToContainerCardProps(item)} />
              </View>
            )}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={
              <View
                testID="tasks-screen__empty_state"
                className="rounded-3xl bg-white px-4 py-5"
              >
                <Text className="text-base font-semibold text-slate-900">No matching tasks</Text>
                <Text className="mt-1 text-sm text-slate-500">
                  Try a different title, project, or task keyword.
                </Text>
              </View>
            }
            ListFooterComponent={<View className="h-24" />}
          />
        ) : output.queuePanels.some((panel) => panel.buckets.some((bucket) => bucket.rows.length > 0)) ? (
          <ScrollView testID="tasks-screen__queues" className="flex-1 px-4" showsVerticalScrollIndicator={false}>
            {output.queuePanels.map((panel) => {
              const openBucket = panel.buckets.find((bucket) => bucket.isOpen) ?? panel.buckets[0];
              const shouldRenderRows = panel.isExpanded && openBucket?.rows.length > 0;

              return (
                <View
                  key={panel.id}
                  testID={`tasks-screen__queue_panel_${panel.queue}`}
                  className={cn(
                    "mb-4 rounded-3xl px-4 py-4",
                    panel.presentation === "primary" || panel.isExpanded
                      ? "bg-white"
                      : "border border-slate-200 bg-slate-100",
                  )}
                >
                  <Pressable
                    testID={`tasks-screen__queue_toggle_${panel.queue}`}
                    onPress={() => actions.toggleQueue(panel.queue)}
                    className="flex-row items-center justify-between"
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-lg font-semibold text-slate-900">{panel.title}</Text>
                      <Text className="mt-1 text-sm text-slate-500">{panel.totalCountLabel}</Text>
                    </View>
                    <Ionicons
                      name={panel.isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#475569"
                    />
                  </Pressable>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mt-4"
                  >
                    {panel.buckets.map((bucket) => (
                      <Pressable
                        key={bucket.id}
                        testID={`tasks-screen__queue_bucket_${panel.queue}_${bucket.bucket}`}
                        onPress={() => actions.openBucket(panel.queue, bucket.bucket)}
                        className={cn(
                          "mr-2 rounded-full border px-4 py-2",
                          bucket.isOpen && panel.isExpanded
                            ? "border-slate-900 bg-slate-900"
                            : "border-slate-200 bg-slate-50",
                        )}
                      >
                        <Text
                          className={cn(
                            "text-sm font-medium",
                            bucket.isOpen && panel.isExpanded ? "text-white" : "text-slate-700",
                          )}
                        >
                          {bucket.title} · {bucket.taskCountLabel}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  {panel.presentation === "preview" && !panel.isExpanded ? (
                    <Text className="mt-3 text-sm text-slate-500">
                      Open Team Queue to review its active bucket list.
                    </Text>
                  ) : null}

                  {shouldRenderRows ? (
                    <View
                      testID={`tasks-screen__queue_bucket_list_${panel.queue}_${openBucket.bucket}`}
                      className="mt-4"
                    >
                      {openBucket.rows.map((row) => (
                        <View key={row.taskId} className="mb-3">
                          <ContainerCard contract={mapTaskRowToContainerCardProps(row)} />
                        </View>
                      ))}
                    </View>
                  ) : panel.isExpanded ? (
                    <View
                      testID={`tasks-screen__queue_bucket_list_${panel.queue}_${openBucket.bucket}`}
                      className="mt-4 rounded-2xl bg-slate-50 px-4 py-4"
                    >
                      <Text className="text-sm font-medium text-slate-700">
                        No tasks in {panel.title} {openBucket.title.toLowerCase()}.
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
            <View className="h-24" />
          </ScrollView>
        ) : (
          <View className="flex-1 px-4">
            <View
              testID="tasks-screen__empty_state"
              className="rounded-3xl bg-white px-4 py-5"
            >
              <Text className="text-base font-semibold text-slate-900">No Tasks</Text>
              <Text className="mt-1 text-sm text-slate-500">
                There are no active tasks in the current workspace yet.
              </Text>
            </View>
          </View>
        )}
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
