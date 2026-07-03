import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ModernUiMarker from "@/components/migration/ModernUiMarker";
import { useDashboardViewAdapter } from "@/ui/viewAdapters/useDashboardViewAdapter";

interface DashboardScreenProps {
  onNavigateToTasks: () => void;
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
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="flex-1 px-4 pt-3">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-slate-900">Recent Activity</Text>
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
              {visibility.showProfileShortcut ? (
                <Pressable
                  testID="dashboard-screen__header_profile"
                  onPress={props.onNavigateToProfile}
                  className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-white"
                >
                  <Ionicons name="person-circle-outline" size={22} color="#0f172a" />
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
          </View>

          <View className="mb-4 rounded-3xl bg-white p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Project
            </Text>
            <Text className="mt-2 text-2xl font-semibold text-slate-900">
              {output.activeProject?.title || "No Active Project"}
            </Text>
            {output.activeProject?.subtitle ? (
              <Text className="mt-1 text-sm text-slate-500">{output.activeProject.subtitle}</Text>
            ) : null}
          </View>

          <View className="mb-4 flex-row gap-2">
            {output.summaryPills.map((pill) => (
              <View
                key={pill.id}
                className="flex-1 rounded-2xl bg-white px-3 py-4"
                testID={`dashboard-screen__summary_pill_${pill.id}`}
              >
                <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {pill.label}
                </Text>
                <Text className="mt-2 text-xl font-semibold text-slate-900">{pill.value}</Text>
              </View>
            ))}
          </View>

          {output.taskShortcut ? (
            <Pressable
              testID="dashboard-screen__shortcut_all_tasks"
              onPress={props.onNavigateToTasks}
              className="mb-4 rounded-3xl bg-slate-900 px-4 py-4"
            >
              <Text className="text-base font-semibold text-white">
                {output.taskShortcut.title}
              </Text>
              <Text className="mt-1 text-sm text-slate-300">
                {output.taskShortcut.subtitle}
              </Text>
              <Text className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                {output.taskShortcut.countLabel}
              </Text>
            </Pressable>
          ) : (
            <View className="mb-4 rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-4">
              <Text className="text-sm font-medium text-slate-600">
                Select a project to see task shortcuts and recent activity.
              </Text>
            </View>
          )}

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
                    className="rounded-2xl bg-white p-4"
                  >
                    <Text className="text-base font-semibold text-slate-900">{item.title}</Text>
                    <Text className="mt-1 text-sm text-slate-500">{item.subtitle}</Text>
                  </Pressable>
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
                    className="rounded-2xl bg-white p-4"
                  >
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
