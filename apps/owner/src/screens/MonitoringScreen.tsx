import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import KpiHistogram from "../components/KpiHistogram";
import {
  fetchOwnerKpiSnapshot,
  OwnerKpiError,
  type KpiWindow,
  type OwnerKpiSnapshot,
} from "../lib/fetchOwnerKpiSnapshot";
import {
  fetchMonitoringOpsSnapshot,
  OwnerOpsError,
  type OwnerMonitoringOpsSnapshot,
} from "../lib/fetchOwnerOpsRead";
import { supabase } from "../lib/supabase";

type Props = {
  onBack: () => void;
};

const WINDOWS: { id: KpiWindow; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
];

const METRIC_ROWS: { key: keyof OwnerKpiSnapshot["metrics"]; label: string }[] = [
  { key: "companies", label: "Companies created" },
  { key: "projects", label: "Projects created" },
  { key: "tasks", label: "Tasks created" },
  { key: "users", label: "Users created" },
];

export default function MonitoringScreen({ onBack }: Props) {
  const [window, setWindow] = useState<KpiWindow>("7d");
  const [snapshot, setSnapshot] = useState<OwnerKpiSnapshot | null>(null);
  const [ops, setOps] = useState<OwnerMonitoringOpsSnapshot | null>(null);
  const [opsError, setOpsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      setError(null);
      setOpsError(null);
      try {
        const [next, nextOps] = await Promise.all([
          fetchOwnerKpiSnapshot(supabase, window),
          fetchMonitoringOpsSnapshot(supabase).catch((err) => {
            setOps(null);
            setOpsError(
              err instanceof OwnerOpsError ? err.message : "Ops panel unavailable",
            );
            return null;
          }),
        ]);
        setSnapshot(next);
        if (nextOps) setOps(nextOps);
      } catch (err) {
        setSnapshot(null);
        setOps(null);
        if (err instanceof OwnerKpiError) {
          setError(err.message);
        } else {
          setError("Could not load KPIs");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [window],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="owner-monitoring__root">
      <View style={styles.header}>
        <Pressable testID="owner-monitoring__back" onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Monitoring</Text>
        <View style={styles.backSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load({ soft: true });
            }}
            tintColor="#0A556B"
          />
        }
      >
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Platform counts on DEV (UTC created_at). Empty DEV may show zeros — that is not an
            outage. Auth via platform_owners (Phase 1b).
          </Text>
        </View>

        {opsError ? (
          <View style={styles.errorBox} testID="owner-monitoring__ops_error">
            <Text style={styles.errorText}>{opsError}</Text>
          </View>
        ) : null}
        {ops ? (
          <View style={styles.opsBlock} testID="owner-monitoring__ops">
            <Text style={styles.opsTitle}>Platform health</Text>
            <Text style={styles.opsNote}>{ops.note}</Text>
            {ops.providers.map((p) => (
              <View key={p.name} style={styles.opsRow}>
                <Text style={styles.opsLabel}>{p.name}</Text>
                <Text style={styles.opsValue}>
                  {p.state} · {p.detail}
                </Text>
              </View>
            ))}
            <Text style={styles.opsSubtitle}>Secrets present (booleans)</Text>
            {Object.entries(ops.secretsPresent).map(([k, v]) => (
              <View key={k} style={styles.opsRow}>
                <Text style={styles.opsLabel}>{k}</Text>
                <Text style={styles.opsValue}>{v ? "yes" : "no"}</Text>
              </View>
            ))}
            <Text style={styles.opsSubtitle}>GitHub repo</Text>
            <Text style={styles.opsMeta}>
              {ops.githubRepo.configured
                ? `${ops.githubRepo.detail}${
                    ops.githubRepo.openIssues != null
                      ? ` · open issues ${ops.githubRepo.openIssues}`
                      : ""
                  }`
                : ops.githubRepo.detail}
            </Text>
            <Text style={styles.opsSubtitle}>Backup / Edge logs</Text>
            <Text style={styles.opsMeta}>{ops.supabaseBackup.detail}</Text>
            <Text style={styles.opsMeta}>{ops.edgeLogs.detail}</Text>
            <Text style={styles.opsSubtitle}>Auth signals (sample ≤200)</Text>
            {ops.authSignals.state === "unavailable" ? (
              <Text style={styles.opsMeta} testID="owner-monitoring__auth_unavailable">
                Unavailable — {ops.authSignals.detail ?? "could not list Auth users"}
              </Text>
            ) : (
              <Text style={styles.opsMeta}>
                listed {ops.authSignals.listed}
                {ops.authSignals.truncated ? "+" : ""} · unconfirmed{" "}
                {ops.authSignals.unconfirmed} · banned {ops.authSignals.banned} · signed-in 7d{" "}
                {ops.authSignals.signedInLast7d}
              </Text>
            )}
          </View>
        ) : null}

        <View style={styles.chips} testID="owner-monitoring__windows">
          {WINDOWS.map((w) => {
            const active = w.id === window;
            return (
              <Pressable
                key={w.id}
                testID={`owner-monitoring__window_${w.id}`}
                onPress={() => setWindow(w.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{w.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading && !snapshot ? (
          <View style={styles.center} testID="owner-monitoring__loading">
            <ActivityIndicator size="large" color="#0A556B" />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox} testID="owner-monitoring__error">
            <Text style={styles.errorText}>{error}</Text>
            <Pressable testID="owner-monitoring__retry" onPress={() => void load()} style={styles.retry}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {snapshot && !error ? (
          <View testID="owner-monitoring__kpis">
            {METRIC_ROWS.map((row) => (
              <View
                key={row.key}
                style={styles.metricCard}
                testID={`owner-monitoring__metric_${row.key}`}
              >
                <Text style={styles.metricLabel}>{row.label}</Text>
                <Text style={styles.metricValue}>{snapshot.metrics[row.key]}</Text>
                {snapshot.metricModes?.[row.key] === "total_fallback" ? (
                  <Text style={styles.metricMode}>total (no created_at filter)</Text>
                ) : snapshot.histograms?.[row.key] ? (
                  <KpiHistogram
                    histogram={snapshot.histograms[row.key]!}
                    testID={`owner-monitoring__histogram_${row.key}`}
                  />
                ) : null}
              </View>
            ))}
            <Text style={styles.meta} testID="owner-monitoring__generated">
              Window {snapshot.window} · since {snapshot.since.slice(0, 19)}Z · generated{" "}
              {snapshot.generatedAt.slice(0, 19)}Z
            </Text>
            {snapshot.metrics.companies === 0 &&
            snapshot.metrics.projects === 0 &&
            snapshot.metrics.tasks === 0 &&
            snapshot.metrics.users === 0 ? (
              <Text style={styles.emptyHint} testID="owner-monitoring__empty_hint">
                All zeros for this window — expected on a quiet DEV sample.
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#E7F4F8" },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0A556B",
  },
  back: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    minWidth: 64,
  },
  backSpacer: { minWidth: 64 },
  backText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  title: { color: "#fff", fontWeight: "700", fontSize: 16 },
  scroll: { padding: 16, paddingBottom: 48 },
  banner: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C8E6EF",
    backgroundColor: "#F8FCFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerText: { color: "#577783", fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C8E6EF",
    backgroundColor: "#F4FAFC",
  },
  chipActive: { backgroundColor: "#0A556B", borderColor: "#0A556B" },
  chipText: { color: "#577783", fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  center: { paddingVertical: 40, alignItems: "center" },
  errorBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F5C2C2",
    backgroundColor: "#FFF5F5",
    padding: 16,
  },
  errorText: { color: "#8B1E1E", fontSize: 14, lineHeight: 20 },
  retry: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0A556B",
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  metricCard: {
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D5E8EF",
    backgroundColor: "#F4FAFC",
    padding: 16,
  },
  metricLabel: { fontSize: 13, color: "#577783", fontWeight: "600" },
  metricValue: { marginTop: 4, fontSize: 28, fontWeight: "700", color: "#0D2630" },
  metricMode: { marginTop: 4, fontSize: 11, color: "#8AA3AD" },
  meta: { marginTop: 8, fontSize: 11, color: "#8AA3AD", lineHeight: 16 },
  emptyHint: { marginTop: 12, fontSize: 13, color: "#577783", lineHeight: 18 },
  opsBlock: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C8E6EF",
    backgroundColor: "#F8FCFF",
    padding: 14,
  },
  opsTitle: { fontSize: 15, fontWeight: "700", color: "#0A556B", marginBottom: 4 },
  opsSubtitle: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: "#577783",
    textTransform: "uppercase",
  },
  opsNote: { fontSize: 12, color: "#8AA3AD", marginBottom: 8, lineHeight: 16 },
  opsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 3,
  },
  opsLabel: { fontSize: 13, color: "#334155", flex: 1 },
  opsValue: { fontSize: 13, color: "#0F172A", fontWeight: "600", flex: 1, textAlign: "right" },
  opsMeta: { fontSize: 13, color: "#577783", lineHeight: 18, marginTop: 2 },
});
