import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AdminOverviewHeroProps {
  title: string;
  companyName?: string;
  summaryLabel: string;
  onPress?: () => void;
}

export default function AdminOverviewHero({
  title,
  companyName,
  summaryLabel,
  onPress,
}: AdminOverviewHeroProps) {
  const body = (
    <View className="flex-row items-start">
      <View className="flex-1">
        <Text className="text-2xl font-semibold text-[#F8FCFF]">{title}</Text>
        {companyName ? (
          <Text className="mt-2 text-base font-medium text-[#F8FCFF]">{companyName}</Text>
        ) : null}
        <Text className="mt-2 text-sm text-[#B9D9E4]">{summaryLabel}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={20} color="#B9D9E4" /> : null}
    </View>
  );

  const className = "mx-4 mb-6 rounded-3xl bg-[#08576E] px-5 py-5";

  if (onPress) {
    return (
      <Pressable
        testID="admin-overview-hero"
        onPress={onPress}
        accessibilityRole="button"
        className={className}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View testID="admin-overview-hero" className={className}>
      {body}
    </View>
  );
}
