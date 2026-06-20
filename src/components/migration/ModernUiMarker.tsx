import React from "react";
import { Text, View } from "react-native";

export default function ModernUiMarker() {
  return (
    <View className="h-8 items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-3">
      <Text className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        Modern UI
      </Text>
    </View>
  );
}
