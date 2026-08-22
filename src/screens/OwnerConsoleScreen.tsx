import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import BrandHeaderTitle from "../components/BrandHeaderTitle";
import ModernScreenHeader from "../components/ModernScreenHeader";
import { OwnerConsoleInfoBanner } from "./owner/ownerConsoleUi";

export type OwnerConsoleSectionId = "monitoring" | "economics" | "tenant-ops";

export type OwnerConsoleScreenProps = {
  onNavigateBack: () => void;
  onOpenMonitoring: () => void;
  onOpenEconomics: () => void;
  onOpenTenantOps: () => void;
};

type SectionCard = {
  id: OwnerConsoleSectionId;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID: string;
};

function SectionRow({ section }: { section: SectionCard }) {
  return (
    <Pressable
      testID={section.testID}
      onPress={section.onPress}
      className="mb-3 rounded-2xl border border-[#C8E6EF] bg-white px-4 py-4 active:bg-[#F0F9FC]"
    >
      <View className="flex-row items-start">
        <View className="mr-3 mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-[#E7F4F8]">
          <Ionicons name={section.icon} size={22} color="#0A556B" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-[#0D2630]">
            {section.title}
          </Text>
          <Text className="mt-1 text-sm leading-5 text-[#577783]">
            {section.subtitle}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#8AA3AD" />
      </View>
    </Pressable>
  );
}

/**
 * M-OPS-01 v1 — three-section Owner Console shell.
 * Monitoring / Economics / Tenant ops. See owner-monitoring-architecture plan.
 */
export default function OwnerConsoleScreen({
  onNavigateBack,
  onOpenMonitoring,
  onOpenEconomics,
  onOpenTenantOps,
}: OwnerConsoleScreenProps) {
  const sections: SectionCard[] = [
    {
      id: "monitoring",
      title: "System monitoring",
      subtitle:
        "KPIs, reliability, data integrity (Workflow Gaps live). Owner Snapshot v1.",
      icon: "pulse-outline",
      onPress: onOpenMonitoring,
      testID: "owner-console__section_monitoring",
    },
    {
      id: "economics",
      title: "Economics",
      subtitle:
        "Revenue and platform costs — external dashboards in v1; in-app after Stripe sync.",
      icon: "cash-outline",
      onPress: onOpenEconomics,
      testID: "owner-console__section_economics",
    },
    {
      id: "tenant-ops",
      title: "Tenant operations",
      subtitle:
        "Plans, users, usage vs caps, audit log — writes deferred to v2 Human Gate.",
      icon: "business-outline",
      onPress: onOpenTenantOps,
      testID: "owner-console__section_tenant-ops",
    },
  ];

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      className="flex-1 bg-[#E7F4F8]"
      testID="owner-console-screen__root"
    >
      <StatusBar style="light" />
      <ModernScreenHeader
        title="Owner Console"
        titleNode={<BrandHeaderTitle label="OWNER CONSOLE" subtitle="OPS-01" />}
        showBackButton
        onBack={onNavigateBack}
      />
      <ScrollView
        testID="owner-console-screen__scroll"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <OwnerConsoleInfoBanner>
          Platform owner only. Watch on mobile; tenant writes and P&L detail on
          web/Edge in v2+. Workflow Gaps under Monitoring → Data integrity.
        </OwnerConsoleInfoBanner>
        {sections.map((section) => (
          <SectionRow key={section.id} section={section} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
