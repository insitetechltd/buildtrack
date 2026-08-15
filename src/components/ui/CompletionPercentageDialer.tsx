import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { cn } from "@/utils/cn";

const STEP = 5;

interface CompletionPercentageDialerProps {
  value: number;
  onChange: (value: number) => void;
  previousPercentage?: number;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export default function CompletionPercentageDialer({
  value,
  onChange,
  previousPercentage,
}: CompletionPercentageDialerProps) {
  const rounded = clampPercent(Math.round(value));

  return (
    <View testID="update-progress__completion-dialer">
      {typeof previousPercentage === "number" ? (
        <Text className="mb-3 text-base text-gray-600">
          Current: {previousPercentage}%
        </Text>
      ) : null}
      <View className="flex-row items-center justify-between">
        <Pressable
          testID="update-progress__completion-minus"
          accessibilityRole="button"
          accessibilityLabel="Decrease completion"
          onPress={() => onChange(clampPercent(rounded - STEP))}
          className="h-16 w-16 items-center justify-center rounded-full border border-gray-300 bg-white"
        >
          <Ionicons name="remove" size={28} color="#0f172a" />
        </Pressable>
        <Text
          testID="update-progress__completion-value"
          className="text-5xl font-bold text-blue-600"
        >
          {rounded}%
        </Text>
        <Pressable
          testID="update-progress__completion-plus"
          accessibilityRole="button"
          accessibilityLabel="Increase completion"
          onPress={() => onChange(clampPercent(rounded + STEP))}
          className="h-16 w-16 items-center justify-center rounded-full bg-blue-600"
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </Pressable>
      </View>
      <View className="mt-4 flex-row gap-2">
        {[0, 25, 50, 75, 100].map((preset) => {
          const isActive = rounded === preset;
          return (
            <Pressable
              key={preset}
              testID={`update-progress__completion-preset-${preset}`}
              accessibilityRole="button"
              onPress={() => onChange(preset)}
              className={cn(
                "min-h-[44px] flex-1 items-center justify-center rounded-full border px-2 py-2",
                isActive ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white",
              )}
            >
              <Text
                className={cn(
                  "text-base font-semibold",
                  isActive ? "text-blue-700" : "text-gray-700",
                )}
              >
                {preset}%
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
