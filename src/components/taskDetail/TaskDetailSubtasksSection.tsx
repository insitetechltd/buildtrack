import React from "react";
import { Text, View } from "react-native";

import ContainerCard from "@/components/primitives/container/ContainerCard";
import type { TaskDetailSubtaskSummaryModel, TasksScreenRowItem } from "@/ui/contracts/viewAdapters";
import { mapTaskRowToContainerCardProps } from "@/ui/mappers/tasksMappers";

interface TaskDetailSubtasksSectionProps {
  model: TaskDetailSubtaskSummaryModel;
  childTasks: TasksScreenRowItem[];
  onNavigateToTaskDetail?: (taskId: string, subTaskId?: string) => void;
}

export default function TaskDetailSubtasksSection({
  model,
  childTasks,
  onNavigateToTaskDetail,
}: TaskDetailSubtasksSectionProps) {
  return (
    <View
      testID="task-detail__subtasks"
      className="mx-4 mt-4 mb-4 rounded-3xl border border-slate-200 bg-white p-4"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-slate-900">{model.title}</Text>
        <View className="rounded-full bg-slate-100 px-3 py-1.5">
          <Text className="text-sm font-semibold text-slate-700">{model.totalCount}</Text>
        </View>
      </View>

      {childTasks.length > 0 ? (
        <View className="mt-4 gap-3">
          {childTasks.map((childTask) => (
            <ContainerCard
              key={childTask.id}
              contract={mapTaskRowToContainerCardProps({
                ...childTask,
                onPress: onNavigateToTaskDetail
                  ? () => onNavigateToTaskDetail(childTask.taskId)
                  : undefined,
              })}
            />
          ))}
        </View>
      ) : (
        <Text className="mt-4 text-sm text-slate-500">No subtasks yet.</Text>
      )}
    </View>
  );
}
