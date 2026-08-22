import React from "react";
import { Text, View } from "react-native";

type CreateTaskInputFieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
};

export default function CreateTaskInputField({
  label,
  required = true,
  error,
  children,
}: CreateTaskInputFieldProps) {
  return (
    <View testID="create-task__input-field">
      <Text className="mb-2 text-lg font-semibold text-slate-900">
        {label} {required && <Text className="text-red-600">*</Text>}
      </Text>
      {children}
      {error && <Text className="mt-1 text-base text-red-500">{error}</Text>}
    </View>
  );
}
