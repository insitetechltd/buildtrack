import React from "react";
import { Pressable, Text, View } from "react-native";

import type { TaskDetailQuickActionRowModel } from "@/ui/contracts/viewAdapters";
import { cn } from "@/utils/cn";

interface TaskDetailQuickActionsProps {
  model: TaskDetailQuickActionRowModel;
  onPress: (actionId: string) => void;
  containerClassName?: string;
}

export default function TaskDetailQuickActions({
  model,
  onPress,
  containerClassName,
}: TaskDetailQuickActionsProps) {
  return (
    <View
      testID="task-detail__quick-actions"
      className={cn("mx-4 mt-4", containerClassName)}
    >
      <View testID="task-detail__quick-actions-row" className="flex-row gap-3">
        {model.actions.map((action) => (
          <Pressable
            key={action.id}
            testID={`task-detail__quick-action-${action.actionId}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: action.isDisabled }}
            disabled={action.isDisabled}
            onPress={() => onPress(action.actionId)}
            className={cn(
              "min-w-0 flex-1 rounded-2xl bg-slate-900 px-4 py-4",
              action.isDisabled && "opacity-50",
            )}
          >
            <Text className="text-center text-base font-semibold text-white">
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
