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
} from "./owner/ownerConsoleUi";

export type OwnerTenantOpsScreenProps = {
  onNavigateBack: () => void;
};

/**
 * M-OPS-01 v1 — Tenant operations stub. Writes = v2 Human Gate + web/Edge later.
 */
export default function OwnerTenantOpsScreen({
  onNavigateBack,
}: OwnerTenantOpsScreenProps) {
  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      className="flex-1 bg-[#E7F4F8]"
      testID="owner-tenant-ops-screen__root"
    >
      <StatusBar style="light" />
      <ModernScreenHeader
        title="Tenant operations"
        titleNode={
          <BrandHeaderTitle label="TENANT OPS" subtitle="Actions v2+" />
        }
        showBackButton
        onBack={onNavigateBack}
      />
      <ScrollView
        testID="owner-tenant-ops-screen__scroll"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <OwnerConsoleInfoBanner>
          Company provisioning and entitlements. No live writes in v1. Bind
          company_id at create only — no company switch. Distinct from Henry
          Admin and M-WEB-01.
        </OwnerConsoleInfoBanner>

        <OwnerConsoleSectionLabel label="Commercial" />
        <OwnerConsoleRowCard
          row={{
            id: "entitlements",
            title: "Plans & entitlements",
            subtitle:
              "Tier catalog, Stripe sync, seat/project/storage gates. Human Gate before live apply.",
            icon: "card-outline",
            status: "planned",
            testID: "owner-tenant-ops__module_entitlements",
          }}
        />

        <OwnerConsoleSectionLabel label="Provisioning" />
        <OwnerConsoleRowCard
          row={{
            id: "users",
            title: "Users & companies",
            subtitle:
              "Owner create/deactivate; bind company at create only. Edge/service-role — never mobile key.",
            icon: "people-outline",
            status: "planned",
            testID: "owner-tenant-ops__module_users",
          }}
        />

        <OwnerConsoleSectionLabel label="Usage" />
        <OwnerConsoleRowCard
          row={{
            id: "usage",
            title: "Usage vs caps",
            subtitle:
              "Per-company rollup vs entitlements. Platform KPI totals live under Monitoring.",
            icon: "stats-chart-outline",
            status: "planned",
            testID: "owner-tenant-ops__module_usage",
          }}
        />

        <OwnerConsoleSectionLabel label="Audit" />
        <OwnerConsoleRowCard
          row={{
            id: "audit",
            title: "Owner audit log",
            subtitle:
              "Immutable record of owner mutations. Required before any v2 write UI.",
            icon: "document-text-outline",
            status: "planned",
            testID: "owner-tenant-ops__module_audit",
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
