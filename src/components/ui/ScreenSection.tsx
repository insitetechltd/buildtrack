import React from "react";
import { Text, View } from "react-native";

import { cn } from "@/utils/cn";

export interface ScreenSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export default function ScreenSection({
  title,
  subtitle,
  children,
  className,
}: ScreenSectionProps) {
  return (
    <View className={cn("mb-5", className)}>
      <View className="mb-3 px-4">
        <Text className="text-lg font-semibold text-gray-900">{title}</Text>
        {subtitle ? <Text className="mt-1 text-sm text-gray-500">{subtitle}</Text> : null}
      </View>
      <View className="px-4">{children}</View>
    </View>
  );
}
