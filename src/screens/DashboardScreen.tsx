import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppScreenHeader from "@/components/AppScreenHeader";
import ActivityStyleRowCard from "@/components/cards/ActivityStyleRowCard";
import BrandHeaderTitle from "@/components/BrandHeaderTitle";
import type { TasksListParams } from "@/navigation/navigationTypes";
import { useDashboardViewAdapter } from "@/ui/viewAdapters/useDashboardViewAdapter";

interface DashboardScreenProps {
  onNavigateToTasks: (params?: TasksListParams) => void;
  onNavigateToCreateTask: () => void;
  onNavigateToProfile: () => void;
  onNavigateToDeveloperSettings?: () => void;
  onNavigateToTaskDetail?: (taskId: string, subTaskId?: string) => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

export default function DashboardScreen(props: DashboardScreenProps) {
  const { output, visibility } = useDashboardViewAdapter();
  const [isDraftsExpanded, setIsDraftsExpanded] = useState(false);

  return (
    <SafeAreaView
      testID="dashboard-screen__root"
      edges={["left", "right", "bottom"]}
      className="flex-1 bg-slate-50"
    >
      <View className="flex-1 bg-[#E7F4F8]">
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
        <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 15 }} className="flex-1 px-4">

          {output.projectSummaryCard ? (
            <View className="mb-5" testID="dashboard-screen__project_summary_section">
              <Text className="text-[34px] leading-9 font-semibold text-[#0D2630]">
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
            <View className="mb-4 rounded-3xl border border-dashed border-[#A8D3E0] bg-white px-4 py-4">
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
                    <Pressable
                      key={item.id}
                      testID={`dashboard-screen__critical_task_${item.id}`}
                      onPress={() => props.onNavigateToTaskDetail?.(item.taskId)}
                      className="flex-row items-start justify-between rounded-2xl border border-[#B9D9E4] bg-[#F8FCFF] px-4 py-4"
                    >
                      <View className="mr-3 flex-1">
                        <Text className="text-lg font-semibold text-[#0D2630]">{item.title}</Text>
                        <Text className="mt-1 text-base leading-5 text-[#577783]">{item.subtitle}</Text>
                      </View>
                      <Text className="text-base font-semibold uppercase tracking-wide text-[#0A728F]">
                        {item.dateLabel}
                      </Text>
                    </Pressable>
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
              Recent Activity
            </Text>
            <View className="gap-3">
              {output.activityItems.length > 0 ? (
                output.activityItems.map((item) => (
                  <ActivityStyleRowCard
                    key={item.id}
                    testID={`dashboard-screen__activity_${item.id}`}
                    title={item.title}
                    subtitle={item.subtitle}
                    metaLabel={item.timestampLabel}
                    badgeLabel={item.statusLabel}
                    imageUri={item.previewPhotoUri}
                    onPress={() => props.onNavigateToTaskDetail?.(item.taskId)}
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
                    <Pressable
                      key={item.id}
                      testID={`dashboard-screen__draft_item_${item.taskId}`}
                      onPress={() => props.onNavigateToTaskDetail?.(item.taskId)}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <Text className="text-lg font-semibold text-slate-900">{item.title}</Text>
                      <Text className="mt-1 text-base text-slate-500">{item.subtitle}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
