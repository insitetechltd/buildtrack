import React from "react";
import { Text, View } from "react-native";

import {
  CREATE_TASK_LABEL_CLASS,
  CREATE_TASK_REQUIRED_MARKER_CLASS,
} from "./createTaskFormChrome";

type CreateTaskInputFieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
};

/** Label + control stack — tight, consistent rhythm for Create Task. */
export default function CreateTaskInputField({
  label,
  required = true,
  error,
  children,
}: CreateTaskInputFieldProps) {
  return (
    <View testID="create-task__input-field" className="gap-2">
      <View className="flex-row items-center gap-1">
        <Text className={CREATE_TASK_LABEL_CLASS}>{label}</Text>
        {required ? (
          <Text className={CREATE_TASK_REQUIRED_MARKER_CLASS}>*</Text>
        ) : null}
      </View>
      {children}
      {error ? <Text className="text-sm leading-5 text-red-500">{error}</Text> : null}
    </View>
  );
}
