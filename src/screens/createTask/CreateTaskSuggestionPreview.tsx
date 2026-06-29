import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { cn } from "../../utils/cn";
import { useTranslation } from "../../utils/useTranslation";
import { useDateFormatter } from "../../utils/dateFormatter";
import type { CreateTaskFormModel } from "../../ui/contracts/viewAdapters";
import type { TaskSuggestion } from "../../api/task-llm-service";

interface CreateTaskSuggestionPreviewProps {
  suggestion: TaskSuggestion;
  acceptedFields: Set<string>;
  onToggleField: (field: keyof CreateTaskFormModel, value: CreateTaskFormModel[keyof CreateTaskFormModel]) => void;
  onDismiss: () => void;
}

interface SuggestionFieldConfig {
  key: keyof CreateTaskFormModel;
  label: string;
  value: string | Date;
  renderValue?: (value: string | Date) => string;
}

export default function CreateTaskSuggestionPreview({
  suggestion,
  acceptedFields,
  onToggleField,
  onDismiss,
}: CreateTaskSuggestionPreviewProps) {
  const t = useTranslation();
  const dateFormatter = useDateFormatter();

  const suggestionFields: SuggestionFieldConfig[] = [
    suggestion.title ? { key: "title", label: t.tasks.title, value: suggestion.title } : null,
    suggestion.description
      ? { key: "description", label: t.tasks.description, value: suggestion.description }
      : null,
    suggestion.category ? { key: "category", label: t.tasks.category, value: suggestion.category } : null,
    suggestion.priority ? { key: "priority", label: t.tasks.priority, value: suggestion.priority } : null,
    suggestion.dueDate
      ? {
          key: "dueDate",
          label: t.tasks.dueDate,
          value: new Date(suggestion.dueDate),
          renderValue: (value: string | Date) => dateFormatter.formatDate(value as Date),
        }
      : null,
    suggestion.billingStatus
      ? {
          key: "billingStatus",
          label: t.createTask.billingStatus,
          value: suggestion.billingStatus,
        }
      : null,
    suggestion.taskReference
      ? {
          key: "taskReference",
          label: t.createTask.taskReference,
          value: suggestion.taskReference,
        }
      : null,
  ].filter(Boolean) as SuggestionFieldConfig[];

  return (
    <View className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-semibold text-gray-900">
          {t.createTask.aiSuggestions}
        </Text>
        <Pressable onPress={onDismiss}>
          <Ionicons name="close" size={20} color="#1e40af" />
        </Pressable>
      </View>

      {suggestionFields.map((field) => {
        const isAccepted = acceptedFields.has(field.key);

        return (
          <View key={field.key} className="mb-3">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-sm font-medium text-gray-700">{field.label}</Text>
              <Pressable
                onPress={() => onToggleField(field.key, field.value)}
                className={cn(
                  "px-2 py-1 rounded",
                  isAccepted ? "bg-green-200" : "bg-gray-200"
                )}
              >
                <Text className="text-xs">
                  {isAccepted ? t.createTask.acceptField : t.createTask.rejectField}
                </Text>
              </Pressable>
            </View>
            <Text className="text-sm text-gray-600">
              {field.renderValue ? field.renderValue(field.value) : String(field.value)}
            </Text>
          </View>
        );
      })}

      <Pressable
        onPress={onDismiss}
        className="mt-2 px-4 py-2 bg-blue-500 rounded-lg"
      >
        <Text className="text-white text-center font-semibold">
          {t.createTask.clearSuggestions}
        </Text>
      </Pressable>
    </View>
  );
}
