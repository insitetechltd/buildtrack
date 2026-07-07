import React from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppScreenHeader from "@/components/AppScreenHeader";
import ModernUiMarker from "@/components/migration/ModernUiMarker";
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

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1">
        <AppScreenHeader
          title="Recent Activity"
          showProfileTrigger={visibility.showProfileShortcut}
          onProfilePress={props.onNavigateToProfile}
          className="border-b-0 bg-slate-50 pb-1"
          rightSlot={
            <View className="flex-row items-center">
              <ModernUiMarker />
              {visibility.showProjectPickerShortcut && props.onNavigateToProjectPicker ? (
                <Pressable
                  testID="dashboard-screen__header_project_picker"
                  onPress={() => props.onNavigateToProjectPicker?.(true)}
                  className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-white"
                >
                  <Ionicons name="business-outline" size={20} color="#0f172a" />
                </Pressable>
              ) : null}
              {visibility.showDeveloperSettingsShortcut && props.onNavigateToDeveloperSettings ? (
                <Pressable
                  testID="dashboard-screen__header_developer_settings"
                  onPress={props.onNavigateToDeveloperSettings}
                  className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-white"
                >
                  <Ionicons name="settings-outline" size={20} color="#0f172a" />
                </Pressable>
              ) : null}
            </View>
          }
        />
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="flex-1 px-4">

          {output.projectSummaryCard ? (
            <View className="mb-5" testID="dashboard-screen__project_summary_section">
              <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Project
              </Text>
              <Text className="mt-2 text-3xl font-semibold text-slate-900">
                {output.projectSummaryCard.title}
              </Text>
              <Text className="mt-1 text-sm text-slate-500">
                {[
                  output.projectSummaryCard.todayLabel,
                  output.projectSummaryCard.elapsedDayLabel,
                  `${output.projectSummaryCard.weatherIconLabel} ${output.projectSummaryCard.weatherTemperatureLabel}`,
                ].join(" · ")}
              </Text>

              <View className="mt-4 rounded-3xl bg-white p-4">
                <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  This Week&apos;s Critical Dates
                </Text>
                {output.projectSummaryCard.criticalDates.length > 0 ? (
                  <View className="mt-3 gap-3">
                    {output.projectSummaryCard.criticalDates.map((item) => (
                      <View
                        key={item.id}
                        className="flex-row items-start justify-between rounded-2xl bg-slate-50 px-3 py-3"
                      >
                        <View className="mr-3 flex-1">
                          <Text className="text-sm font-semibold text-slate-900">{item.title}</Text>
                          <Text className="mt-1 text-xs text-slate-500">{item.subtitle}</Text>
                        </View>
                        <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {item.dateLabel}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="mt-3 rounded-2xl bg-slate-50 px-3 py-3">
                    <Text className="text-sm text-slate-500">
                      No critical dates flagged for this week yet.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View className="mb-4 rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-4">
              <Text className="text-sm font-medium text-slate-600">
                Select a project to view the active project summary and queue overview.
              </Text>
            </View>
          )}

          {output.projectSummaryCard && output.queueDashboard ? (
            <View className="mb-5" testID="dashboard-screen__queue_dashboard">
              <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Queue Overview
              </Text>
              <View className="gap-4">
                {output.queueDashboard.groups.map((group) => (
                  <View key={group.id}>
                    <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                          className="flex-1 rounded-2xl bg-white px-3 py-4"
                        >
                          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {cell.title}
                          </Text>
                          <Text className="mt-2 text-2xl font-semibold text-slate-900">
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
            <Text className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Recent Activity
            </Text>
            <View className="gap-3">
              {output.activityItems.length > 0 ? (
                output.activityItems.map((item) => (
                  <Pressable
                    key={item.id}
                    testID={`dashboard-screen__activity_${item.id}`}
                    onPress={() => props.onNavigateToTaskDetail?.(item.taskId)}
                    className="overflow-hidden rounded-2xl bg-white"
                  >
                    {item.previewPhotoUri ? (
                      <View className="flex-row">
                        <View
                          testID={`dashboard-screen__activity_${item.id}:thumbnail`}
                          className="w-24 bg-slate-100"
                        >
                          <Image
                            source={{ uri: item.previewPhotoUri }}
                            className="h-full w-full"
                            resizeMode="cover"
                          />
                        </View>
                        <View className="min-w-0 flex-1 p-4">
                          <View className="flex-row items-start justify-between">
                            <View className="mr-4 flex-1">
                              <Text className="text-base font-semibold text-slate-900">{item.title}</Text>
                              <Text className="mt-1 text-sm text-slate-500">{item.subtitle}</Text>
                            </View>
                            <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">
                              {item.statusLabel}
                            </Text>
                          </View>
                          <Text className="mt-3 text-xs font-medium text-slate-400">
                            {item.timestampLabel}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View className="p-4">
                        <View className="flex-row items-start justify-between">
                          <View className="mr-4 flex-1">
                            <Text className="text-base font-semibold text-slate-900">{item.title}</Text>
                            <Text className="mt-1 text-sm text-slate-500">{item.subtitle}</Text>
                          </View>
                          <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            {item.statusLabel}
                          </Text>
                        </View>
                        <Text className="mt-3 text-xs font-medium text-slate-400">
                          {item.timestampLabel}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))
              ) : (
                <View className="rounded-2xl bg-white p-4">
                  <Text className="text-sm text-slate-500">
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
              <Text className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Drafts In Progress
              </Text>
              <View className="gap-3">
                {output.draftItems.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => props.onNavigateToTaskDetail?.(item.taskId)}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <Text className="text-base font-semibold text-slate-900">{item.title}</Text>
                    <Text className="mt-1 text-sm text-slate-500">{item.subtitle}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
        {visibility.showCreateTaskFab ? (
          <Pressable
            testID="dashboard-screen__fab_open_camera"
            onPress={props.onNavigateToCreateTask}
            className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-slate-900 shadow-lg"
          >
            <Ionicons name="camera-outline" size={24} color="#ffffff" />
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
