import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import StandardHeader from "../components/StandardHeader";
import LogoutFAB from "../components/LogoutFAB"; // Keep for screens without create task
import { EditProjectModal } from "./projects/EditProjectModal";
import { ProjectsScreenEmptyState } from "./projects/ProjectsScreenEmptyState";
import { ProjectsScreenFilterChips } from "./projects/ProjectsScreenFilterChips";
import { ProjectsScreenProjectCard } from "./projects/ProjectsScreenProjectCard";
import { useTranslation } from "../utils/useTranslation";
import { useProjectsViewAdapter } from "../ui/viewAdapters/useProjectsViewAdapter";

interface ProjectsScreenProps {
  onNavigateToProjectDetail: (projectId: string) => void;
  onNavigateToCreateProject: () => void;
  onNavigateToUserManagement?: () => void;
  onNavigateBack?: () => void;
  newProjectId?: string;
}

export default function ProjectsScreen({
  onNavigateToProjectDetail,
  onNavigateToCreateProject,
  onNavigateToUserManagement,
  onNavigateBack,
  newProjectId,
}: ProjectsScreenProps) {
  const t = useTranslation();
  const { output, actions } = useProjectsViewAdapter({ newProjectId });
  const showHeaderActions =
    output.headerActions.showCreateAction ||
    (output.headerActions.showUserManagementAction && !!onNavigateToUserManagement);

  if (!output.readiness.hasUsableData && !output.continuity.isInitialLoading) {
    return null;
  }

  return (
    <>
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />

        <StandardHeader
          title={t.projects.projects}
          showBackButton={!!onNavigateBack}
          onBackPress={onNavigateBack}
          rightElement={
            showHeaderActions ? (
              <View className="flex-row space-x-2">
                {output.headerActions.showUserManagementAction && onNavigateToUserManagement ? (
                  <Pressable
                    testID="projects-user-management-action"
                    onPress={onNavigateToUserManagement}
                    className="w-10 h-10 bg-purple-600 rounded-full items-center justify-center"
                  >
                    <Ionicons name="people" size={20} color="white" />
                  </Pressable>
                ) : null}
                {output.headerActions.showCreateAction ? (
                  <Pressable
                    testID="projects-create-action"
                    onPress={onNavigateToCreateProject}
                    className="w-10 h-10 bg-blue-600 rounded-full items-center justify-center"
                  >
                    <Ionicons name="add" size={24} color="white" />
                  </Pressable>
                ) : null}
              </View>
            ) : undefined
          }
        />

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={output.isRefreshing}
              onRefresh={() => void actions.handleRefresh()}
            />
          }
        >
          <View className="px-6 pt-4">
            <View className="mb-4 flex-row items-center rounded-lg bg-gray-100 px-3 py-2">
              <Ionicons name="search-outline" size={20} color="#6b7280" />
              <TextInput
                className="ml-2 flex-1 text-gray-900"
                placeholder={t.projects.searchProjects}
                value={output.searchQuery}
                onChangeText={actions.setSearchQuery}
              />
            </View>

            <Text className="mb-4 text-base text-gray-600">{output.projectCountLabel}</Text>
          </View>

          <ProjectsScreenFilterChips
            options={output.filterOptions}
            onSelect={actions.selectStatusFilter}
          />

          <View className="px-6 py-4">
            {output.continuity.isInitialLoading ? (
              <View className="flex-1 items-center justify-center py-16">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="mt-4 text-lg font-medium text-gray-500">
                  {t.projects.loadingProjects}
                </Text>
              </View>
            ) : output.projectItems.length > 0 ? (
              output.projectItems.map((project) => (
                <ProjectsScreenProjectCard
                  key={project.id}
                  project={project}
                  leadPmLabel={t.projects.leadPM}
                  createdByLabelPrefix={t.projects.createdBy}
                  onPress={onNavigateToProjectDetail}
                  onEdit={actions.openEditProject}
                />
              ))
            ) : (
              <ProjectsScreenEmptyState
                emptyState={output.emptyState}
                createActionLabel={t.projects.createProject}
                onCreateProject={onNavigateToCreateProject}
              />
            )}
          </View>
        </ScrollView>

        <EditProjectModal
          visible={output.isEditModalVisible}
          project={output.editingProject}
          onClose={actions.closeEditProject}
          onSave={actions.saveEditedProject}
          onSaveSuccess={actions.completeEditedProjectSave}
        />

        <LogoutFAB />
      </SafeAreaView>
    </>
  );
}
