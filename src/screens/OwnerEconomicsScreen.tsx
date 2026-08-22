import React from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import BrandHeaderTitle from "../components/BrandHeaderTitle";
import ModernScreenHeader from "../components/ModernScreenHeader";
import {
  OwnerConsoleInfoBanner,
  OwnerConsoleRowCard,
  OwnerConsoleSectionLabel,
  OwnerConsoleStubMetrics,
} from "./owner/ownerConsoleUi";

export type OwnerEconomicsScreenProps = {
  onNavigateBack: () => void;
};

/**
 * M-OPS-01 v1 — Economics stub. Revenue SoT = Stripe Dashboard until webhooks.
 */
export default function OwnerEconomicsScreen({
  onNavigateBack,
}: OwnerEconomicsScreenProps) {
  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      className="flex-1 bg-[#E7F4F8]"
      testID="owner-economics-screen__root"
    >
      <StatusBar style="light" />
      <ModernScreenHeader
        title="Economics"
        titleNode={<BrandHeaderTitle label="ECONOMICS" subtitle="Preview v1" />}
        showBackButton
        onBack={onNavigateBack}
      />
      <ScrollView
        testID="owner-economics-screen__scroll"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <OwnerConsoleInfoBanner>
          Platform P&L view. v1 uses external dashboards — do not show dollar
          amounts in-app until Stripe webhook sync (v2/v3). Usage counts are not
          revenue.
        </OwnerConsoleInfoBanner>

        <OwnerConsoleSectionLabel label="Revenue" />
        <OwnerConsoleStubMetrics
          testID="owner-economics__revenue_stub"
          title="Revenue — Stripe Dashboard (SoT)"
          items={[
            "MRR / trials / add-ons: Stripe Dashboard until webhook sync",
            "Paper SKUs: src/billing/orgPlans.ts (R6)",
          ]}
        />

        <OwnerConsoleSectionLabel label="Platform costs" />
        <OwnerConsoleStubMetrics
          testID="owner-economics__costs_stub"
          title="Incremental costs — manual / provider (v2+)"
          items={[
            "Supabase · Vercel (when web ships) · AI (M-AI-01+)",
            "v2: audited manual cost lines; v3: provider API feeds",
          ]}
        />

        <OwnerConsoleSectionLabel label="Unit economics" />
        <OwnerConsoleRowCard
          row={{
            id: "margin",
            title: "Margin estimate",
            subtitle:
              "Hidden until both revenue and cost sides have a sourced period.",
            icon: "calculator-outline",
            status: "planned",
            testID: "owner-economics__module_margin",
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
