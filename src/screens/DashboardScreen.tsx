import React, { useCallback, useContext, useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { NavigationContext } from "@react-navigation/native";
import AppScreenHeader from "@/components/AppScreenHeader";
import ActivityStyleRowCard from "@/components/cards/ActivityStyleRowCard";
import BrandHeaderTitle from "@/components/BrandHeaderTitle";
import type { CreateTaskParams, TasksListParams } from "@/navigation/navigationTypes";
import { useDashboardViewAdapter } from "@/ui/viewAdapters/useDashboardViewAdapter";
import { usePullToRefresh } from "@/utils/usePullToRefresh";
import { useTabletCardGridLayout } from "@/utils/useTabletCardGridLayout";
import { useTranslation } from "@/utils/useTranslation";
import { TABLET_RAIL_CARD_HEIGHT } from "@/components/cards/ActivityStyleRowCard";

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
  const t = useTranslation();
  const { isGrid, itemWidth, gap: gridGap } = useTabletCardGridLayout();
  const { output, visibility, actions } = useDashboardViewAdapter();
  const { isPullRefreshing, handlePullRefresh } = usePullToRefresh();
  const [isDraftsExpanded, setIsDraftsExpanded] = useState(false);
  const [swipeBlockedDraftIds, setSwipeBlockedDraftIds] = useState<
    Record<string, "active" | "dismissed">
  >({});

  const cardGridStyle = isGrid
    ? {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        gap: gridGap,
        alignItems: "stretch" as const,
      }
    : undefined;
  const railCellStyle = itemWidth
    ? { width: itemWidth, ...(isGrid ? { height: TABLET_RAIL_CARD_HEIGHT } : null) }
    : undefined;
  const postCellStyle = itemWidth ? { width: itemWidth } : undefined;

  const navigation =
    NavigationContext && typeof NavigationContext === "object"
      ? (useContext(NavigationContext) as { addListener?: (event: string, cb: () => void) => () => void } | undefined)
      : undefined;

  useEffect(() => {
    actions?.markActivityFeedSeen?.();

    if (navigation && typeof navigation.addListener === "function") {
      const unsubscribe = navigation.addListener("focus", () => {
        actions?.markActivityFeedSeen?.();
      });
      return unsubscribe;
    }
  }, [actions?.markActivityFeedSeen, navigation]);

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
    (localDraftId: string) => {
      const swipeBlockState = swipeBlockedDraftIds[localDraftId];
      if (swipeBlockState === "active") {
        return;
      }
      if (swipeBlockState === "dismissed") {
        setDraftSwipeBlockState(localDraftId, undefined);
        return;
      }

      props.onNavigateToCreateTask({
        localDraftId,
        sourceScreen: "dashboard",
        clearForm: false,
        _timestamp: Date.now(),
      });
    },
    [props, setDraftSwipeBlockState, swipeBlockedDraftIds],
  );

  const handleDraftDeletePress = useCallback(
    (localDraftId: string) => {
      Alert.alert(t?.activity?.deleteDraftTitle || "Delete draft?", t?.activity?.deleteDraftMessage || "This saved draft will be removed from this device.", [
        { text: t?.common?.cancel || "Cancel", style: "cancel" },
        {
          text: t?.common?.delete || "Delete",
          style: "destructive",
          onPress: () => {
            void actions.deleteDraftTask(localDraftId).catch((error) => {
              Alert.alert(
                t?.activity?.unableToDeleteDraft || "Unable to delete draft",
                error instanceof Error ? error.message : t?.activity?.tryAgain || "Please try again.",
              );
            });
          },
        },
      ]);
    },
    [actions, t],
  );

  return (
    <SafeAreaView
      testID="dashboard-screen__root"
      edges={["left", "right"]}
      className="flex-1 bg-canvas dark:bg-canvas-dark"
    >
        <AppScreenHeader
          title="Taskr"
          titleNode={<BrandHeaderTitle subtitle={t?.activity?.siteActivity || "Site activity"} />}
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
                {t?.activity?.criticalThisWeek || "This Week's Critical Tasks"}
              </Text>
              {output.projectSummaryCard.criticalDates.length > 0 ? (
                <View
                  testID="dashboard-screen__critical_tasks_grid"
                  className={isGrid ? undefined : "gap-3"}
                  style={cardGridStyle}
                >
                  {output.projectSummaryCard.criticalDates.map((item) => (
                    <View
                      key={item.id}
                      testID={`dashboard-screen__critical_task_wrapper_${item.id}`}
                      style={railCellStyle}
                    >
                      <ActivityStyleRowCard
                        testID={`dashboard-screen__critical_task_${item.id}`}
                        variant="critical"
                        fillHeight={isGrid}
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
                    </View>
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

          <View className="mb-4">
            <Text className="mb-2 text-lg font-semibold uppercase tracking-wider text-[#497080]">
              {t?.activity?.recentActivity || "Recent Activity"}
            </Text>
            <View
              testID="dashboard-screen__recent_activity_grid"
              className={isGrid ? undefined : "gap-3"}
              style={cardGridStyle}
            >
              {output.activityItems.length > 0 ? (
                output.activityItems.map((item) => {
                  const photoUris =
                    item.previewPhotoUris?.length
                      ? item.previewPhotoUris
                      : item.previewPhotoUri
                        ? [item.previewPhotoUri]
                        : [];
                  return (
                    <View
                      key={item.id}
                      testID={`dashboard-screen__activity_wrapper_${item.id}`}
                      style={postCellStyle}
                    >
                      <ActivityStyleRowCard
                        testID={`dashboard-screen__activity_${item.id}`}
                        variant="activity"
                        layout="post"
                        fillHeight={isGrid}
                        title={item.title}
                        subtitle={item.subtitle}
                        actorLabel={item.actorLabel}
                        actorUserId={item.actorUserId}
                        metaLabel={item.timestampLabel}
                        imageUri={photoUris[0]}
                        imageUris={photoUris.length > 0 ? photoUris : undefined}
                        disabled={item.taskId?.startsWith("project:") ?? false}
                        onPress={() => {
                          actions.markActivityFeedSeen();
                          if (item.taskId) {
                            props.onNavigateToTaskDetail?.(item.taskId);
                          }
                        }}
                      />
                    </View>
                  );
                })
              ) : (
                <View className="rounded-2xl border border-[#C8E6EF] bg-white p-4" style={isGrid ? { width: "100%" } : undefined}>
                  <Text className="text-lg leading-6 text-[#577783]">
                    {output.activeProject
                      ? t?.activity?.noRecentActivity || "No recent activity for the current project yet."
                      : t?.activity?.selectProjectForActivity || "Select a project to view recent activity."}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {output.draftItems.length > 0 ? (
            <View className="mb-4">
              <Pressable
                testID="dashboard-screen__drafts_toggle"
                accessibilityRole="button"
                accessibilityLabel={t?.activity?.savedDrafts || "Saved drafts"}
                onPress={() => setIsDraftsExpanded((current) => !current)}
                className="mb-2 flex-row items-center justify-between"
                hitSlop={12}
              >
                <Text className="text-base font-semibold uppercase tracking-wider text-slate-500">
                  {t?.activity?.savedDrafts || "Saved drafts"}
                </Text>
                <Text
                  testID="dashboard-screen__drafts_show_hide"
                  className="text-base font-semibold text-slate-500"
                >
                  {isDraftsExpanded ? t?.activity?.hide || "Hide" : t?.activity?.show || "Show"}
                </Text>
              </Pressable>
              {isDraftsExpanded ? (
                <View className="gap-3" testID="dashboard-screen__drafts_list">
                  {output.draftItems.map((item) => {
                    const draftId = item.localDraftId ?? item.id.replace(/^draft:/, "");
                    return (
                    <Swipeable
                      key={item.id}
                      testID={`dashboard-screen__draft_item_${draftId}:swipeable`}
                      overshootLeft={false}
                      overshootRight={false}
                      activeOffsetX={[-20, 20]}
                      failOffsetY={[-12, 12]}
                      onSwipeableOpenStartDrag={() => setDraftSwipeBlockState(draftId, "active")}
                      onSwipeableCloseStartDrag={() => setDraftSwipeBlockState(draftId, "active")}
                      onSwipeableWillOpen={() => setDraftSwipeBlockState(draftId, "active")}
                      onSwipeableClose={() => setDraftSwipeBlockState(draftId, "dismissed")}
                      renderRightActions={() => (
                        <DraftDeleteAction
                          testID={`dashboard-screen__draft_item_${draftId}:delete-action`}
                          onPress={() => handleDraftDeletePress(draftId)}
                        />
                      )}
                    >
                      <Pressable
                        testID={`dashboard-screen__draft_item_${draftId}`}
                        onPress={() => handleDraftPress(draftId)}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <View className="flex-row items-center gap-2">
                          <Text className="text-lg font-semibold text-slate-900 flex-1">{item.title}</Text>
                          <View className="rounded-full bg-amber-100 px-2 py-0.5">
                            <Text className="text-xs font-semibold uppercase text-amber-800">Draft</Text>
                          </View>
                        </View>
                        <Text className="mt-1 text-base text-slate-500">{item.subtitle}</Text>
                        <Text className="mt-1 text-sm text-slate-400">{item.timestampLabel}</Text>
                      </Pressable>
                    </Swipeable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}
          <View className="h-24" />
        </ScrollView>
    </SafeAreaView>
  );
}
