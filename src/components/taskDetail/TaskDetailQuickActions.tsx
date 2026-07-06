import React from "react";
import { Pressable, Text, View } from "react-native";

import type { TaskDetailQuickActionRowModel } from "@/ui/contracts/viewAdapters";
import { cn } from "@/utils/cn";

interface TaskDetailQuickActionsProps {
  model: TaskDetailQuickActionRowModel;
  onPress: (actionId: string) => void;
}

export default function TaskDetailQuickActions({
  model,
  onPress,
}: TaskDetailQuickActionsProps) {
  return (
    <View
      testID="task-detail__quick-actions"
      className="mx-4 mt-4 rounded-2xl border border-gray-200 bg-white p-3"
    >
      <Text className="mb-3 text-base font-semibold uppercase tracking-wide text-gray-500">
        Quick Actions
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {model.actions.map((action) => (
          <Pressable
            key={action.id}
            testID={`task-detail__quick-action-${action.actionId}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: action.isDisabled }}
            disabled={action.isDisabled}
            onPress={() => onPress(action.actionId)}
            className={cn(
              "rounded-full border border-gray-300 bg-white px-4 py-3",
              action.isDisabled && "opacity-50",
            )}
          >
            <Text className="text-lg font-medium text-gray-700">{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
