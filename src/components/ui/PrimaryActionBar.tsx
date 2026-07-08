import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { cn } from "@/utils/cn";

interface PrimaryActionBarProps {
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  isPrimaryDisabled?: boolean;
}

export default function PrimaryActionBar({
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  isPrimaryDisabled = false,
}: PrimaryActionBarProps) {
  const showSecondaryAction = Boolean(secondaryLabel && onSecondaryPress);

  return (
    <View className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 pt-3">
      <SafeAreaView edges={["bottom"]}>
        <View className="flex-row gap-3 pb-3">
          {showSecondaryAction ? (
            <Pressable
              accessibilityRole="button"
              onPress={onSecondaryPress}
              className="flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white py-3"
            >
              <Text className="text-base font-semibold text-gray-700">{secondaryLabel}</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onPrimaryPress}
            disabled={isPrimaryDisabled}
            className={cn(
              "items-center justify-center rounded-xl bg-blue-600 py-3",
              showSecondaryAction ? "flex-1" : "w-full",
              isPrimaryDisabled && "opacity-50",
            )}
          >
            <Text className="text-base font-semibold text-white">{primaryLabel}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
