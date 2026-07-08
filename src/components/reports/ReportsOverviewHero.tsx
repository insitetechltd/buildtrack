import React from "react";
import { Text, View } from "react-native";

interface ReportsOverviewHeroProps {
  title: string;
  summaryLabel: string;
  dateRangeLabel: string;
}

export default function ReportsOverviewHero({
  title,
  summaryLabel,
  dateRangeLabel,
}: ReportsOverviewHeroProps) {
  return (
    <View
      testID="reports-overview-hero"
      className="mx-4 mb-6 rounded-3xl bg-emerald-700 px-5 py-5"
    >
      <Text className="text-sm font-medium uppercase tracking-[1.8px] text-emerald-100">
        Insights
      </Text>
      <Text className="mt-2 text-2xl font-semibold text-white">{title}</Text>
      <Text className="mt-2 text-sm text-emerald-100">{summaryLabel}</Text>
      <Text className="mt-3 text-sm text-emerald-50">{dateRangeLabel}</Text>
    </View>
  );
}
