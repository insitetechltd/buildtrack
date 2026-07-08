import React, { useMemo } from "react";
import { Pressable, Text, View, SectionList, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppScreenHeader from "@/components/AppScreenHeader";
import ContainerCard from "@/components/primitives/container/ContainerCard";
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
  const hasQueueContent = output.queuePanels.some((panel) => panel.buckets.some((bucket) => bucket.rows.length > 0));
  const shouldRenderDraftsSection = !output.isSearchMode && Boolean(output.draftsSection);
  const shouldRenderMainScroll = hasQueueContent || shouldRenderDraftsSection;

  const searchContract = useMemo(() => {
    return mapTaskInputToTextFieldProps(searchInput);
  }, [searchInput]);

  return (
    <SafeAreaView className="flex-1 bg-[#E7F4F8]">
      <View className="flex-1 bg-[#E7F4F8]">
        <AppScreenHeader
          title="Tasks"
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
          <View className="mb-3">
            <TextField contract={searchContract} onChangeText={setSearchQuery} />
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
              <View className="mb-3 rounded-3xl border border-[#C8E6EF] bg-white px-4 py-4">
                <Text className="text-lg font-semibold text-[#0D2630]">{section.title}</Text>
                <Text className="mt-1 text-base leading-6 text-[#577783]">
                  {output.searchResults.length} {output.searchResults.length === 1 ? "result" : "results"}
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View className="mb-3">
                <ContainerCard contract={mapTaskRowToContainerCardProps({ ...item, density: "standard" })} />
              </View>
            )}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={
              <View
                testID="tasks-screen__empty_state"
                className="rounded-3xl border border-[#C8E6EF] bg-white px-4 py-5"
              >
                <Text className="text-lg font-semibold text-[#0D2630]">No matching tasks</Text>
                <Text className="mt-1 text-base leading-6 text-[#577783]">
                  Try a different title, project, or task keyword.
                </Text>
              </View>
            }
            ListFooterComponent={<View className="h-24" />}
          />
        ) : shouldRenderMainScroll ? (
          <ScrollView testID="tasks-screen__queues" className="flex-1 px-4" showsVerticalScrollIndicator={false}>
            {hasQueueContent
              ? output.queuePanels.map((panel) => {
              const openBucket = panel.buckets.find((bucket) => bucket.isOpen) ?? panel.buckets[0];
              const shouldRenderRows = panel.isExpanded && openBucket?.rows.length > 0;

              return (
                <View
                  key={panel.id}
                  testID={`tasks-screen__queue_panel_${panel.queue}`}
                  className={cn(
                    "mb-4 rounded-3xl border px-4 py-4",
                    panel.presentation === "primary" || panel.isExpanded
                      ? "border-[#C8E6EF] bg-white"
                      : "border border-slate-200 bg-slate-100",
                  )}
                >
                  <Pressable
                    testID={`tasks-screen__queue_toggle_${panel.queue}`}
                    onPress={() => actions.toggleQueue(panel.queue)}
                    className="flex-row items-center justify-between"
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-xl font-semibold text-[#0D2630]">{panel.title}</Text>
                      <Text className="mt-1 text-base leading-6 text-[#577783]">{panel.totalCountLabel}</Text>
                    </View>
                    <Ionicons
                      name={panel.isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#497080"
                    />
                  </Pressable>

                  <View
                    testID={`tasks-screen__queue_bucket_row_${panel.queue}`}
                    className="mt-4 flex-row gap-2"
                  >
                    {panel.buckets.map((bucket) => (
                      <Pressable
                        key={bucket.id}
                        testID={`tasks-screen__queue_bucket_${panel.queue}_${bucket.bucket}`}
                        onPress={() => actions.openBucket(panel.queue, bucket.bucket)}
                        className={cn(
                          "min-w-0 flex-1 rounded-2xl border px-2 py-3",
                          bucket.bucket === "overdue" && bucket.isOpen && panel.isExpanded
                            ? "border-rose-200 bg-rose-600"
                            : bucket.bucket === "overdue"
                              ? "border-rose-200 bg-rose-50"
                              : bucket.isOpen && panel.isExpanded
                                ? "border-[#0A728F] bg-[#0A728F]"
                                : "border-[#C8E6EF] bg-[#F8FCFF]",
                        )}
                      >
                        <Text
                          className={cn(
                            "text-base font-medium",
                            bucket.bucket === "overdue" && bucket.isOpen && panel.isExpanded
                              ? "text-white"
                              : bucket.bucket === "overdue"
                                ? "text-rose-700"
                                : bucket.isOpen && panel.isExpanded
                                  ? "text-white"
                                  : "text-[#355968]",
                          )}
                        >
                          {bucket.title} · {bucket.taskCountLabel}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {panel.presentation === "preview" && !panel.isExpanded ? (
                    <Text className="mt-3 text-base leading-6 text-[#577783]">
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
                          <ContainerCard contract={mapTaskRowToContainerCardProps({ ...row, density: "standard" })} />
                        </View>
                      ))}
                    </View>
                  ) : panel.isExpanded ? (
                    <View
                      testID={`tasks-screen__queue_bucket_list_${panel.queue}_${openBucket.bucket}`}
                      className="mt-4 rounded-2xl bg-[#F8FCFF] px-4 py-4"
                    >
                      <Text className="text-base font-medium text-[#355968]">
                        No tasks in {panel.title} {openBucket.title.toLowerCase()}.
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
              })
              : null}
            {output.draftsSection ? (
              <View
                testID="tasks-screen__drafts_section"
                className="mb-6 rounded-3xl border border-[#C8E6EF] bg-white px-4 py-4"
              >
                <Pressable
                  testID="tasks-screen__drafts_toggle"
                  onPress={actions.toggleDraftsSection}
                  className="flex-row items-center justify-between"
                >
                  <Text className="text-lg font-semibold text-[#0D2630]">
                    {output.draftsSection.title} · {output.draftsSection.countLabel}
                  </Text>
                  <Ionicons
                    name={output.draftsSection.isExpanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#497080"
                  />
                </Pressable>

                {output.draftsSection.isExpanded ? (
                  <View className="mt-4">
                    {output.draftsSection.rows.map((row) => (
                      <View key={row.taskId} className="mb-3">
                        <ContainerCard contract={mapTaskRowToContainerCardProps({ ...row, density: "standard" })} />
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
            <View className="h-24" />
          </ScrollView>
        ) : (
          <View className="flex-1 px-4">
            <View
              testID="tasks-screen__empty_state"
              className="rounded-3xl border border-[#C8E6EF] bg-white px-4 py-5"
            >
              <Text className="text-lg font-semibold text-[#0D2630]">No Tasks</Text>
              <Text className="mt-1 text-base leading-6 text-[#577783]">
                There are no active tasks in the current workspace yet.
              </Text>
            </View>
          </View>
        )}
        {visibility.showCreateTaskFab ? (
          <Pressable
            testID="tasks-screen__fab_create_task"
            onPress={props.onNavigateToCreateTask}
            className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-[#0A728F] shadow-lg"
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
