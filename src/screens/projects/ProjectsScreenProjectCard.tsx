import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { ProjectsScreenProjectItem } from "@/ui/contracts/viewAdapters";
import { cn } from "@/utils/cn";

function getStatusColorClassName(
  statusTone: ProjectsScreenProjectItem["statusTone"],
): string {
  switch (statusTone) {
    case "success":
      return "text-green-600 bg-green-50";
    case "info":
      return "text-blue-600 bg-blue-50";
    case "warning":
      return "text-yellow-600 bg-yellow-50";
    case "danger":
      return "text-red-600 bg-red-50";
    case "neutral":
    default:
      return "text-gray-600 bg-gray-50";
  }
}

export interface ProjectsScreenProjectCardProps {
  project: ProjectsScreenProjectItem;
  leadPmLabel: string;
  createdByLabelPrefix: string;
  onPress: (projectId: string) => void;
  onEdit: (projectId: string) => void;
}

export function ProjectsScreenProjectCard({
  project,
  leadPmLabel,
  createdByLabelPrefix,
  onPress,
  onEdit,
}: ProjectsScreenProjectCardProps) {
  return (
    <View className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
      <View className="flex-row items-start justify-between mb-3">
        <Pressable
          testID={`projects-card-${project.projectId}`}
          className="flex-1"
          onPress={() => onPress(project.projectId)}
        >
          <Text className="font-bold text-xl text-gray-900 mb-1" numberOfLines={2}>
            {project.title}
          </Text>
          <Text className="text-base text-gray-600" numberOfLines={2}>
            {project.description}
          </Text>
        </Pressable>
        <View className="flex-row items-center ml-3">
          <View
            className={cn(
              "px-3 py-1 rounded-full mr-2",
              getStatusColorClassName(project.statusTone),
            )}
          >
            <Text className="text-sm font-medium capitalize">{project.statusLabel}</Text>
          </View>
          {project.canEdit ? (
            <Pressable
              testID={`projects-edit-${project.projectId}`}
              onPress={() => onEdit(project.projectId)}
              className="w-8 h-8 items-center justify-center bg-blue-50 rounded-lg"
            >
              <Ionicons name="pencil" size={16} color="#3b82f6" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {project.leadPmName ? (
        <View className="bg-purple-50 border border-purple-200 rounded-lg px-2 py-1 mb-3 flex-row items-center">
          <Ionicons name="star" size={12} color="#7c3aed" />
          <Text className="text-sm text-purple-700 font-medium ml-1">
            {leadPmLabel}: {project.leadPmName}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1 mr-2">
          <Ionicons name="location-outline" size={14} color="#6b7280" />
          <Text
            className="text-sm text-gray-500 ml-1 flex-1"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {project.locationLabel}
          </Text>
        </View>

        <View className="flex-row items-center">
          <Ionicons name="people-outline" size={14} color="#6b7280" />
          <Text className="text-sm text-gray-500 ml-1">{project.memberCountLabel}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Ionicons name="business-outline" size={14} color="#6b7280" />
          <Text className="text-sm text-gray-500 ml-1">{project.clientName}</Text>
        </View>

        <View className="flex-row items-center">
          <Ionicons name="calendar-outline" size={14} color="#6b7280" />
          <Text className="text-sm text-gray-500 ml-1">{project.startDateLabel}</Text>
        </View>
      </View>

      {project.budgetLabel ? (
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="cash-outline" size={14} color="#6b7280" />
            <Text className="text-sm text-gray-500 ml-1">{project.budgetLabel}</Text>
          </View>

          <View className="flex-row items-center">
            <Text className="text-sm text-gray-500">
              {createdByLabelPrefix} {project.createdByLabel}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
