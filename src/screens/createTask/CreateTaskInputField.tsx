import React from "react";
import { Text, View } from "react-native";

type CreateTaskInputFieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
};

/** Label + control stack aligned to TextField expanded density. */
export default function CreateTaskInputField({
  label,
  required = true,
  error,
  children,
}: CreateTaskInputFieldProps) {
  return (
    <View testID="create-task__input-field" className="gap-2.5">
      <View className="flex-row items-center gap-1">
        <Text className="text-lg leading-7 font-semibold text-slate-900">{label}</Text>
        {required ? (
          <Text className="text-lg leading-7 font-semibold text-red-600">*</Text>
        ) : null}
      </View>
      {children}
      {error ? <Text className="text-base leading-6 text-red-500">{error}</Text> : null}
    </View>
  );
}
