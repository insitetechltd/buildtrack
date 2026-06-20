import React, { useMemo } from "react";
import { FlatList, Pressable, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ContainerCard from "@/components/primitives/container/ContainerCard";
import ModernUiMarker from "@/components/migration/ModernUiMarker";
import TextField from "@/components/primitives/input/TextField";
import { mapTaskInputToTextFieldProps, mapTaskRowToContainerCardProps } from "@/ui/mappers/tasksMappers";
import { useTasksViewAdapter } from "@/ui/viewAdapters/useTasksViewAdapter";
import { useProjectFilterStore, type SectionFilter } from "@/state/projectFilterStore";
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
  const projectFilterStore = useProjectFilterStore();

  const containerCards = useMemo(() => {
    return output.taskRowItems.map(mapTaskRowToContainerCardProps);
  }, [output.taskRowItems]);

  const searchContract = useMemo(() => {
    return mapTaskInputToTextFieldProps(searchInput);
  }, [searchInput]);

  const filterOptions: { label: string; value: SectionFilter }[] = [
    { label: "All Tasks", value: "all" },
    { label: "Inbox", value: "inbox" },
    { label: "Outbox", value: "outbox" },
    { label: "My Work", value: "my_work" },
  ];

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
          <View className="mb-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {filterOptions.map((option) => {
                const isActive = projectFilterStore.sectionFilter === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => projectFilterStore.setSectionFilter(option.value)}
                    className={cn(
                      "mr-2 rounded-full px-4 py-2 border",
                      isActive
                        ? "bg-slate-900 border-slate-900"
                        : "bg-white border-slate-200"
                    )}
                  >
                    <Text
                      className={cn(
                        "font-medium",
                        isActive ? "text-white" : "text-slate-600"
                      )}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
        <View className="flex-1 px-4">
          <FlatList
            testID="tasks-screen__list"
            data={containerCards}
            keyExtractor={(item) => item.primitiveId}
            renderItem={({ item }) => (
              <View className="mb-3">
                <ContainerCard contract={item} />
              </View>
            )}
            ListFooterComponent={<View className="h-24" />}
          />
        </View>
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
