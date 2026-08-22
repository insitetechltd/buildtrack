import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { getDeferredFallbackFireCounts } from "../api/deferredSchemaObservability";
import BrandHeaderTitle from "../components/BrandHeaderTitle";
import ModernScreenHeader from "../components/ModernScreenHeader";
import {
  OwnerConsoleInfoBanner,
  OwnerConsoleRowCard,
  OwnerConsoleSectionLabel,
  OwnerConsoleStubMetrics,
} from "./owner/ownerConsoleUi";

export type OwnerMonitoringScreenProps = {
  onNavigateBack: () => void;
  onOpenWorkflowGaps: () => void;
};

/**
 * M-OPS-01 v1 — System monitoring (read-only).
 * KPI/reliability = honest stubs until v2 owner_kpi_snapshot RPC.
 */
export default function OwnerMonitoringScreen({
  onNavigateBack,
  onOpenWorkflowGaps,
}: OwnerMonitoringScreenProps) {
  const f003 = useMemo(() => getDeferredFallbackFireCounts(), []);

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      className="flex-1 bg-[#E7F4F8]"
      testID="owner-monitoring-screen__root"
    >
      <StatusBar style="light" />
      <ModernScreenHeader
        title="System monitoring"
        titleNode={
          <BrandHeaderTitle label="MONITORING" subtitle="Owner Snapshot v1" />
        }
        showBackButton
        onBack={onNavigateBack}
      />
      <ScrollView
        testID="owner-monitoring-screen__scroll"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <OwnerConsoleInfoBanner>
          Platform health at a glance. v1 uses loaded-store diagnostics and
          stubs — platform KPIs connect in v2 via server snapshot RPCs. Infra
          drill-down: Supabase Dashboard.
        </OwnerConsoleInfoBanner>

        <OwnerConsoleSectionLabel label="KPI dashboard" />
        <OwnerConsoleStubMetrics
          testID="owner-monitoring__kpi_stub"
          title="Platform KPIs — not connected (v2)"
          items={[
            "Logins / DAU · New users · Tasks · Photos",
            "Source: owner_kpi_snapshot RPC + platform_owners (Human Gate)",
            "Do not trust numbers from the loaded client store.",
          ]}
        />

        <OwnerConsoleSectionLabel label="Reliability" />
        <OwnerConsoleStubMetrics
          testID="owner-monitoring__reliability_stub"
          title="Reliability — external + v2 exceptions"
          items={[
            "API / DB health: Supabase Dashboard → Logs",
            "Upload / task failures: owner_exception_events (v2)",
            "Incidents: manual notes (v3)",
          ]}
        />

        <OwnerConsoleSectionLabel label="Data integrity" />
        <OwnerConsoleRowCard
          row={{
            id: "workflow-gaps",
            title: "Workflow Gaps (loaded store)",
            subtitle:
              "Illegal task states in this session's loaded store. Inspect only — not a full-table audit.",
            icon: "warning-outline",
            status: "ready",
            onPress: onOpenWorkflowGaps,
            testID: "owner-monitoring__module_workflow-gaps",
          }}
        />
        <View
          testID="owner-monitoring__f003_session"
          className="mb-3 rounded-2xl border border-[#C8E6EF] bg-white px-4 py-4"
        >
          <Text className="text-base font-semibold text-[#0D2630]">
            F-003 deferred-schema strips (session)
          </Text>
          <Text className="mt-1 text-sm leading-5 text-[#577783]">
            In-process counter only — resets when the app restarts. Not a
            platform KPI until v2 durable exception events.
          </Text>
          <Text className="mt-3 text-2xl font-semibold text-[#0A556B]">
            {f003.total}
          </Text>
          <Text className="mt-1 text-xs text-[#8AA3AD]">
            create {f003.byOp.createTask} · update {f003.byOp.updateTask}
          </Text>
        </View>
        <OwnerConsoleRowCard
          row={{
            id: "database-gaps",
            title: "Database gap audit (SQL twin)",
            subtitle:
              "Cross-tenant classifier via owner_workflow_gaps RPC. Human Gate v2.",
            icon: "server-outline",
            status: "planned",
            testID: "owner-monitoring__module_database-gaps",
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
