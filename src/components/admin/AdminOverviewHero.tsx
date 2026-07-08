import React from "react";
import { Text, View } from "react-native";

interface AdminOverviewHeroProps {
  title: string;
  companyName?: string;
  summaryLabel: string;
}

export default function AdminOverviewHero({
  title,
  companyName,
  summaryLabel,
}: AdminOverviewHeroProps) {
  return (
    <View
      testID="admin-overview-hero"
      className="mx-4 mb-6 rounded-3xl bg-slate-900 px-5 py-5"
    >
      <Text className="text-sm font-medium uppercase tracking-[1.8px] text-slate-300">
        Administration
      </Text>
      <Text className="mt-2 text-2xl font-semibold text-white">{title}</Text>
      {companyName ? (
        <Text className="mt-2 text-base font-medium text-slate-100">{companyName}</Text>
      ) : null}
      <Text className="mt-2 text-sm text-slate-300">{summaryLabel}</Text>
    </View>
  );
}
