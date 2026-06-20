import React, { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ContainerCard from "@/components/primitives/container/ContainerCard";
import { mapDashboardProjectToContainerCardProps } from "@/ui/mappers/dashboardMappers";
import { useDashboardViewAdapter } from "@/ui/viewAdapters/useDashboardViewAdapter";
import { useProjectFilterStore } from "@/state/projectFilterStore";

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
  const projectFilterStore = useProjectFilterStore();
  const {
    inboxNewCount,
    inboxNewOverdueCount,
    inboxWipCount,
    inboxWipOverdueCount,
    inboxReviewingCount,
    inboxReviewingOverdueCount,
    outboxNewCount,
    outboxNewOverdueCount,
    outboxWipCount,
    outboxWipOverdueCount,
    outboxReviewingCount,
    outboxReviewingOverdueCount,
  } = output.scalarMetrics;

  const containerCards = useMemo(() => {
    return output.projectSummaryItems.map(mapDashboardProjectToContainerCardProps);
  }, [output.projectSummaryItems]);

  const handleQuickGridPress = (section: "inbox" | "outbox" | "my_work", status: any, label: string) => {
    projectFilterStore.setSectionFilter(section);
    if (status) projectFilterStore.setStatusFilter(status);
    projectFilterStore.setButtonLabel(label);
    props.onNavigateToTasks();
  };

  const tasksForMeItems = [
    {
      testID: "dashboard-screen__metric_inbox_new",
      title: "New Requests",
      value: inboxNewCount,
      containerClassName: "border-orange-200 bg-orange-50",
      titleClassName: "text-orange-700",
      valueClassName: "text-orange-900",
      overdueCount: inboxNewOverdueCount,
      overdueTestID: "dashboard-screen__metric_inbox_new_overdue",
      overdueVariant: "badge" as const,
      onPress: () => handleQuickGridPress("inbox", "new", "New Requests"),
    },
    {
      testID: "dashboard-screen__metric_inbox_wip",
      title: "Current Tasks",
      value: inboxWipCount,
      containerClassName: "border-blue-200 bg-blue-50",
      titleClassName: "text-blue-700",
      valueClassName: "text-blue-900",
      overdueCount: inboxWipOverdueCount,
      overdueTestID: "dashboard-screen__metric_inbox_wip_overdue",
      overdueVariant: "text" as const,
      onPress: () => handleQuickGridPress("inbox", "wip", "Current Tasks"),
    },
    {
      testID: "dashboard-screen__metric_inbox_reviewing",
      title: "Pending My Review",
      value: inboxReviewingCount,
      containerClassName: "border-purple-200 bg-purple-50",
      titleClassName: "text-purple-700",
      valueClassName: "text-purple-900",
      overdueCount: inboxReviewingOverdueCount,
      overdueTestID: "dashboard-screen__metric_inbox_reviewing_overdue",
      overdueVariant: "badge" as const,
      onPress: () => handleQuickGridPress("inbox", "reviewing", "Pending My Review"),
    },
  ];

  const tasksFromMeItems = [
    {
      testID: "dashboard-screen__metric_outbox_new",
      title: "Pending Acceptance",
      value: outboxNewCount,
      containerClassName: "border-orange-200 bg-orange-50",
      titleClassName: "text-orange-700",
      valueClassName: "text-orange-900",
      overdueCount: outboxNewOverdueCount,
      overdueTestID: "dashboard-screen__metric_outbox_new_overdue",
      overdueVariant: "badge" as const,
      onPress: () => handleQuickGridPress("outbox", "new", "Pending Acceptance"),
    },
    {
      testID: "dashboard-screen__metric_outbox_wip",
      title: "Team Proceeding",
      value: outboxWipCount,
      containerClassName: "border-blue-200 bg-blue-50",
      titleClassName: "text-blue-700",
      valueClassName: "text-blue-900",
      overdueCount: outboxWipOverdueCount,
      overdueTestID: "dashboard-screen__metric_outbox_wip_overdue",
      overdueVariant: "text" as const,
      onPress: () => handleQuickGridPress("outbox", "wip", "Team Proceeding"),
    },
    {
      testID: "dashboard-screen__metric_outbox_reviewing",
      title: "Pending Approval",
      value: outboxReviewingCount,
      containerClassName: "border-cyan-200 bg-cyan-50",
      titleClassName: "text-cyan-700",
      valueClassName: "text-cyan-900",
      overdueCount: outboxReviewingOverdueCount,
      overdueTestID: "dashboard-screen__metric_outbox_reviewing_overdue",
      overdueVariant: "badge" as const,
      onPress: () => handleQuickGridPress("outbox", "reviewing", "Pending Approval"),
    },
  ];

  const renderGridCard = (item: any) => (
    <Pressable
      key={item.testID}
      testID={item.testID}
      onPress={item.onPress}
      className={`flex-1 rounded-2xl border p-3 justify-between ${item.containerClassName}`}
    >
      <Text className={`text-[11px] font-semibold uppercase tracking-wide ${item.titleClassName}`}>
        {item.title}
      </Text>
      <View className="mt-2">
        <Text className={`text-2xl font-bold ${item.valueClassName}`}>{item.value}</Text>
        {item.overdueCount > 0 ? (
          item.overdueVariant === "badge" ? (
            <View
              testID={item.overdueTestID}
              className="mt-2 self-start rounded-full bg-red-600 px-2 py-1"
            >
              <Text className="text-[11px] font-semibold text-white">
                {item.overdueCount} Overdue
              </Text>
            </View>
          ) : (
            <Text
              testID={item.overdueTestID}
              className="mt-2 text-[11px] font-medium text-amber-700"
            >
              {item.overdueCount} overdue
            </Text>
          )
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1">
        <View className="px-4 pt-3">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-slate-900">Dashboard</Text>
            <View className="flex-row items-center">
              {visibility.showProjectPickerShortcut && props.onNavigateToProjectPicker ? (
                <Pressable
                  testID="dashboard-screen__header_project_picker"
                  onPress={() => props.onNavigateToProjectPicker?.(true)}
                  className="h-10 w-10 items-center justify-center rounded-full bg-white"
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
          <View className="mb-4">
            <Text className="mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">Project Summary</Text>
            <View className="h-48">
              <FlatList
                testID="dashboard-screen__list"
                data={containerCards}
                keyExtractor={(item) => item.primitiveId}
                renderItem={({ item }) => (
                  <View className="mb-3">
                    <ContainerCard contract={item} />
                  </View>
                )}
              />
            </View>
          </View>
        </View>
        <View className="flex-1 px-4">
          <View className="mb-4">
            <Text className="mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">Tasks For Me</Text>
            <View testID="dashboard-screen__metric_grid_inbox" className="flex-row gap-2">
              {tasksForMeItems.map(renderGridCard)}
            </View>
          </View>
          <View className="mb-4">
            <Text className="mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">Tasks From Me</Text>
            <View testID="dashboard-screen__metric_grid_outbox" className="flex-row gap-2">
              {tasksFromMeItems.map(renderGridCard)}
            </View>
          </View>
        </View>
        {visibility.showCreateTaskFab ? (
          <Pressable
            testID="dashboard-screen__fab_create_task"
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
