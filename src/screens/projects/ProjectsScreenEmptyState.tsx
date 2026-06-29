import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { ProjectsScreenEmptyStateModel } from "@/ui/contracts/viewAdapters";

export interface ProjectsScreenEmptyStateProps {
  emptyState: ProjectsScreenEmptyStateModel;
  createActionLabel: string;
  onCreateProject: () => void;
}

export function ProjectsScreenEmptyState({
  emptyState,
  createActionLabel,
  onCreateProject,
}: ProjectsScreenEmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <Ionicons name="folder-open-outline" size={64} color="#9ca3af" />
      <Text className="text-gray-500 text-xl font-medium mt-4">{emptyState.title}</Text>
      <Text className="text-gray-400 text-center mt-2 px-8">{emptyState.message}</Text>
      {emptyState.showCreateAction ? (
        <Pressable
          onPress={onCreateProject}
          className="mt-6 px-6 py-3 bg-blue-600 rounded-lg"
        >
          <Text className="text-white font-semibold">{createActionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
