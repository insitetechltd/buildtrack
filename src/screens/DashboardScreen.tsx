import React, { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import AppScreenHeader from "@/components/AppScreenHeader";
import ActivityStyleRowCard from "@/components/cards/ActivityStyleRowCard";
import BrandHeaderTitle from "@/components/BrandHeaderTitle";
import type { CreateTaskParams, TasksListParams } from "@/navigation/navigationTypes";
import { useDashboardViewAdapter } from "@/ui/viewAdapters/useDashboardViewAdapter";
import { usePullToRefresh } from "@/utils/usePullToRefresh";

interface DashboardScreenProps {
  onNavigateToTasks: (params?: TasksListParams) => void;
  onNavigateToCreateTask: (params?: CreateTaskParams) => void;
  onNavigateToProfile: () => void;
  onNavigateToDeveloperSettings?: () => void;
  onNavigateToTaskDetail?: (taskId: string, subTaskId?: string) => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

function DraftDeleteAction({
  testID,
  onPress,
}: {
  testID: string;
  onPress: () => void;
}) {
  return (
    <View testID={`${testID}-wrapper`} className="w-[60px] items-end justify-center">
      <Pressable
        testID={testID}
        onPress={onPress}
        className="h-24 w-[72px] items-center justify-center rounded-2xl bg-[#B42318]"
      >
        <View testID={`${testID}-icon-offset`} style={{ transform: [{ translateX: 5 }] }}>
          <Ionicons testID={`${testID}-icon`} name="trash-outline" size={33} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
}

export default function DashboardScreen(props: DashboardScreenProps) {
  const { output, visibility, actions } = useDashboardViewAdapter();
  const { isPullRefreshing, handlePullRefresh } = usePullToRefresh();
  const [isDraftsExpanded, setIsDraftsExpanded] = useState(false);
  const [swipeBlockedDraftIds, setSwipeBlockedDraftIds] = useState<
    Record<string, "active" | "dismissed">
  >({});

  const setDraftSwipeBlockState = useCallback(
    (taskId: string, nextState?: "active" | "dismissed") => {
      setSwipeBlockedDraftIds((current) => {
        if (current[taskId] === nextState) {
          return current;
        }
        if (nextState) {
          return { ...current, [taskId]: nextState };
        }
        const next = { ...current };
        delete next[taskId];
        return next;
      });
    },
    [],
  );

  const handleDraftPress = useCallback(
    (taskId: string) => {
      const swipeBlockState = swipeBlockedDraftIds[taskId];
      if (swipeBlockState === "active") {
        return;
      }
      if (swipeBlockState === "dismissed") {
        setDraftSwipeBlockState(taskId, undefined);
        return;
      }

      props.onNavigateToCreateTask({
        editTaskId: taskId,
        resumeAsCreate: true,
        sourceScreen: "dashboard",
        clearForm: false,
        _timestamp: Date.now(),
      });
    },
    [props, setDraftSwipeBlockState, swipeBlockedDraftIds],
  );

  const handleDraftDeletePress = useCallback(
    (taskId: string) => {
      Alert.alert("Delete draft?", "This unfinished task will be removed.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void actions.deleteDraftTask(taskId).catch((error) => {
              Alert.alert(
                "Unable to delete draft",
                error instanceof Error ? error.message : "Please try again.",
              );
            });
          },
        },
      ]);
    },
    [actions],
  );

  return (
    <SafeAreaView
      testID="dashboard-screen__root"
      edges={["left", "right", "bottom"]}
      className="flex-1 bg-[#E7F4F8]"
    >
        <AppScreenHeader
          title="Taskr"
          titleNode={<BrandHeaderTitle subtitle="Site activity" />}
          showProfileTrigger={visibility.showProfileShortcut}
          onNavigateToProfile={props.onNavigateToProfile}
          onNavigateToProjectPicker={visibility.showProjectPickerShortcut ? props.onNavigateToProjectPicker : undefined}
          onNavigateToDeveloperSettings={
            visibility.showDeveloperSettingsShortcut ? props.onNavigateToDeveloperSettings : undefined
          }
          className="border-b-0 bg-[#08576E] pb-2"
        />
        <ScrollView
          contentContainerStyle={{ paddingTop: 15 }}
          className="flex-1 px-4"
          alwaysBounceVertical
          refreshControl={
            <RefreshControl
              testID="dashboard-screen__refresh_control"
              refreshing={isPullRefreshing}
              onRefresh={() => void handlePullRefresh()}
              tintColor="#0D6E87"
            />
          }
        >
          {output.projectSummaryCard ? (
            <View className="mb-5" testID="dashboard-screen__project_summary_section">
              <Text
                className="text-[24px] leading-8 font-semibold text-[#0D2630]"
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {output.projectSummaryCard.title}
              </Text>
              <Text className="mt-2 text-lg leading-6 text-[#577783]">
                {[
                  output.projectSummaryCard.todayLabel,
                  output.projectSummaryCard.elapsedDayLabel,
                  `${output.projectSummaryCard.weatherIconLabel} ${output.projectSummaryCard.weatherTemperatureLabel}`,
                ].join(" · ")}
              </Text>
            </View>
          ) : (
            <View testID="dashboard-empty-state__no_project_selected" className="mb-4 rounded-3xl border border-dashed border-[#A8D3E0] bg-white px-4 py-4">
              <Text className="text-lg leading-6 font-medium text-[#577783]">
                Select a project to view the active project summary and queue overview.
              </Text>
            </View>
          )}

          {output.projectSummaryCard ? (
            <View className="mb-5">
              <Text className="mb-3 text-lg font-semibold uppercase tracking-wider text-[#497080]">
                This Week&apos;s Critical Tasks
              </Text>
              {output.projectSummaryCard.criticalDates.length > 0 ? (
                <View className="gap-3">
                  {output.projectSummaryCard.criticalDates.map((item) => (
                    <ActivityStyleRowCard
                      key={item.id}
                      testID={`dashboard-screen__critical_task_${item.id}`}
                      variant="critical"
                      title={item.title}
                      subtitle={item.subtitle}
                      metaLabel="Due this week"
                      badgeLabel={item.dateLabel}
                      imageUri={item.imageUri}
                      topLeftMarker={
                        <View
                          testID={`dashboard-screen__critical_task_${item.id}:this-week`}
                          className="rounded-full bg-amber-500 px-2.5 py-1"
                        >
                          <Text className="text-xs font-semibold text-white">This week</Text>
                        </View>
                      }
                      onPress={() => props.onNavigateToTaskDetail?.(item.taskId)}
                    />
                  ))}
                </View>
              ) : (
                <View className="rounded-2xl border border-[#B9D9E4] bg-[#F8FCFF] px-4 py-4">
                  <Text className="text-lg leading-6 text-[#577783]">
                    No critical tasks flagged for this week yet.
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {output.projectSummaryCard && output.queueDashboard ? (
            <View className="mb-5" testID="dashboard-screen__queue_dashboard">
              <Text className="mb-3 text-lg font-semibold uppercase tracking-wider text-[#497080]">
                Queue Overview
              </Text>
              <View className="gap-4">
                {output.queueDashboard.groups.map((group) => (
                  <View key={group.id}>
                    <Text className="mb-2 text-base font-semibold uppercase tracking-wider text-[#497080]">
                      {group.title}
                    </Text>
                    <View className="flex-row gap-2">
                      {group.cells.map((cell) => (
                        <Pressable
                          key={cell.id}
                          testID={`dashboard-screen__queue_cell_${cell.queue}_${cell.bucket}`}
                          onPress={() =>
                            props.onNavigateToTasks({
                              launchQueue: cell.queue,
                              launchBucket: cell.bucket,
                              launchSource: "activity_dashboard",
                            })
                          }
                          className="min-w-0 flex-1 rounded-2xl border border-[#C8E6EF] bg-white px-3 py-4"
                        >
                          <Text className="text-base font-semibold uppercase tracking-wide text-[#497080]">
                            {cell.title}
                          </Text>
                          <Text className="mt-2 text-[30px] leading-8 font-semibold text-[#0D2630]">
                            {cell.countLabel}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {output.draftItems.length > 0 ? (
            <View className="mb-4">
              <Pressable
                testID="dashboard-screen__drafts_toggle"
                onPress={() => setIsDraftsExpanded((current) => !current)}
                className="mb-2 flex-row items-center justify-between"
              >
                <Text className="text-base font-semibold uppercase tracking-wider text-slate-500">
                  Drafts In Progress
                </Text>
                <Text className="text-base font-semibold text-slate-500">
                  {isDraftsExpanded ? "Hide" : "Show"}
                </Text>
              </Pressable>
              {isDraftsExpanded ? (
                <View className="gap-3" testID="dashboard-screen__drafts_list">
                  {output.draftItems.map((item) => (
                    <Swipeable
                      key={item.id}
                      testID={`dashboard-screen__draft_item_${item.taskId}:swipeable`}
                      overshootLeft={false}
                      overshootRight={false}
                      activeOffsetX={[-20, 20]}
                      failOffsetY={[-12, 12]}
                      onSwipeableOpenStartDrag={() => setDraftSwipeBlockState(item.taskId, "active")}
                      onSwipeableCloseStartDrag={() => setDraftSwipeBlockState(item.taskId, "active")}
                      onSwipeableWillOpen={() => setDraftSwipeBlockState(item.taskId, "active")}
                      onSwipeableClose={() => setDraftSwipeBlockState(item.taskId, "dismissed")}
                      renderRightActions={() => (
                        <DraftDeleteAction
                          testID={`dashboard-screen__draft_item_${item.taskId}:delete-action`}
                          onPress={() => handleDraftDeletePress(item.taskId)}
                        />
                      )}
                    >
                      <Pressable
                        testID={`dashboard-screen__draft_item_${item.taskId}`}
                        onPress={() => handleDraftPress(item.taskId)}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <Text className="text-lg font-semibold text-slate-900">{item.title}</Text>
                        <Text className="mt-1 text-base text-slate-500">{item.subtitle}</Text>
                      </Pressable>
                    </Swipeable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          <View className="mb-4">
            <Text className="mb-2 text-lg font-semibold uppercase tracking-wider text-[#497080]">
              Recent Activity
            </Text>
            <View className="gap-3">
              {output.activityItems.length > 0 ? (
                output.activityItems.map((item) => (
                  <ActivityStyleRowCard
                    key={item.id}
                    testID={`dashboard-screen__activity_${item.id}`}
                    variant="activity"
                    title={item.title}
                    subtitle={item.subtitle}
                    metaLabel={item.timestampLabel}
                    badgeLabel={item.statusLabel}
                    imageUri={item.previewPhotoUri}
                    disabled={item.taskId.startsWith("project:")}
                    onPress={() => {
                      props.onNavigateToTaskDetail?.(item.taskId);
                    }}
                  />
                ))
              ) : (
                <View className="rounded-2xl border border-[#C8E6EF] bg-white p-4">
                  <Text className="text-lg leading-6 text-[#577783]">
                    {output.activeProject
                      ? "No recent activity for the current project yet."
                      : "Select a project to view recent activity."}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View className="h-24" />
        </ScrollView>
    </SafeAreaView>
  );
}
