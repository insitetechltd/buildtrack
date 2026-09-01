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
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { fetchOwnerEconomicsSnapshot } from "../lib/fetchOwnerEconomicsSnapshot";
import { fetchOwnerKpiSnapshot } from "../lib/fetchOwnerKpiSnapshot";
import {
  fetchEconomicsStripeSnapshot,
  fetchMonitoringOpsSnapshot,
} from "../lib/fetchOwnerOpsRead";
import { supabase } from "../lib/supabase";
import {
  billingDrift,
  deriveHomeAlert,
  derivePulseLevel,
  formatMoneyLabel,
  homeUpdatedLine,
  latestGeneratedAt,
  monitoringDotTone,
  onHomeAlertPress,
  pulseBadgeLabel,
  supabaseProvider,
  taskSparklineCounts,
  trialCount,
  withoutSubRowCaption,
  type HomeAlert,
  type PulseLevel,
} from "./homeLanding";

type Props = {
  onSignOut: () => void;
  onOpenMonitoring: () => void;
  onOpenEconomics: () => void;
  onOpenTenantOps: () => void;
};

function Sparkline({ counts }: { counts: number[] }) {
  if (counts.length === 0) return null;
  const max = Math.max(1, ...counts);
  return (
    <View style={styles.spark} testID="owner-home__sparkline">
      {counts.map((count, index) => (
        <View
          key={index}
          style={[
            styles.sparkBar,
            { height: Math.max(3, Math.round((count / max) * 22)) },
          ]}
        />
      ))}
    </View>
  );
}

function pulseBadgeStyle(level: PulseLevel) {
  if (level === "act") return styles.badgeAct;
  if (level === "watch" || level === "unknown") return styles.badgeWatch;
  return styles.badgeOk;
}

function pulseBadgeTextStyle(level: PulseLevel) {
  if (level === "act") return styles.badgeActText;
  if (level === "watch" || level === "unknown") return styles.badgeWatchText;
  return styles.badgeOkText;
}

export default function OwnerHomeScreen({
  onSignOut,
  onOpenMonitoring,
  onOpenEconomics,
  onOpenTenantOps,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpi, setKpi] = useState<Awaited<ReturnType<typeof fetchOwnerKpiSnapshot>> | null>(
    null,
  );
  const [economics, setEconomics] = useState<Awaited<
    ReturnType<typeof fetchOwnerEconomicsSnapshot>
  > | null>(null);
  const [ops, setOps] = useState<Awaited<ReturnType<typeof fetchMonitoringOpsSnapshot>> | null>(
    null,
  );
  const [stripe, setStripe] = useState<Awaited<
    ReturnType<typeof fetchEconomicsStripeSnapshot>
  > | null>(null);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    const [nextKpi, nextEcon, nextOps, nextStripe] = await Promise.all([
      fetchOwnerKpiSnapshot(supabase, "7d").catch(() => null),
      fetchOwnerEconomicsSnapshot(supabase).catch(() => null),
      fetchMonitoringOpsSnapshot(supabase).catch(() => null),
      fetchEconomicsStripeSnapshot(supabase).catch(() => null),
    ]);
    setKpi(nextKpi);
    setEconomics(nextEcon);
    setOps(nextOps);
    setStripe(nextStripe);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const alert: HomeAlert | null = deriveHomeAlert({ ops, stripe });
  const pulse = derivePulseLevel({ ops, alert });
  const money = formatMoneyLabel(stripe);
  const companies = economics?.totals.companies;
  const drift = billingDrift(stripe);
  const trials = trialCount(stripe, economics);
  const pastDue = stripe?.stripeConfigured ? stripe.pastDueCount : 0;
  const withoutSub = economics?.totals.companiesWithoutSubscriptionRow ?? 0;
  const withoutCaption = withoutSubRowCaption(withoutSub);
  const signedIn = ops?.authSignals.signedInLast7d;
  const unconfirmed = ops?.authSignals.unconfirmed;
  const tasks7d = kpi?.metrics.tasks;
  const supabaseState = supabaseProvider(ops)?.state;
  const dotTone = monitoringDotTone(supabaseState);
  const monitoringDot =
    dotTone === "red" ? styles.dotRed : dotTone === "green" ? styles.dotGreen : styles.dotAmber;
  const updated = homeUpdatedLine(
    pulse,
    latestGeneratedAt([
      kpi?.generatedAt,
      economics?.generatedAt,
      ops?.generatedAt,
      stripe?.generatedAt,
    ]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="owner-home__root">
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>HQ</Text>
          <Text style={styles.meta}>Internal TF · DEV</Text>
        </View>
        <Pressable testID="owner-home__signout" onPress={onSignOut} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
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
        {alert ? (
          <Pressable
            testID="owner-home__alert"
            style={[
              styles.alert,
              alert.severity === "p0" ? styles.alertP0 : styles.alertP1,
            ]}
            onPress={() => onHomeAlertPress(alert, { onOpenMonitoring, onOpenEconomics })}
          >
            <Ionicons
              name="warning"
              size={18}
              color={alert.severity === "p0" ? "#991B1B" : "#B45309"}
            />
            <Text
              style={[
                styles.alertText,
                alert.severity === "p0" ? styles.alertP0Text : styles.alertP1Text,
              ]}
              numberOfLines={2}
            >
              {alert.message}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={alert.severity === "p0" ? "#991B1B" : "#B45309"}
            />
          </Pressable>
        ) : null}

        <Pressable testID="owner-home__hero" style={styles.hero} onPress={onOpenMonitoring}>
          <View style={styles.heroTitleRow}>
            <Text style={styles.heroTitle}>Platform pulse</Text>
            <View style={[styles.badge, pulseBadgeStyle(pulse)]}>
              <Text style={[styles.badgeText, pulseBadgeTextStyle(pulse)]}>
                {pulseBadgeLabel(pulse)}
              </Text>
            </View>
          </View>
          <View style={styles.heroMetrics}>
            <View style={styles.heroMetric}>
              <Text style={styles.heroValue} testID="owner-home__companies">
                {companies == null ? "—" : String(companies)}
              </Text>
              <Text style={styles.heroCaption}>companies</Text>
            </View>
            <View style={styles.heroMetric}>
              <Text style={styles.heroValue} testID="owner-home__mrr" numberOfLines={1}>
                {money.value}
              </Text>
              <Text style={styles.heroCaption}>{money.caption}</Text>
            </View>
          </View>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{drift} billing drift</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{trials} trials</Text>
            </View>
          </View>
          <Text style={styles.updated}>{updated}</Text>
        </Pressable>

        {loading && !kpi && !economics && !ops ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0A556B" />
          </View>
        ) : null}

        <Pressable
          testID="owner-home__section_monitoring"
          style={styles.card}
          onPress={onOpenMonitoring}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="pulse-outline" size={22} color="#0A556B" />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Monitoring</Text>
              <View style={[styles.dot, monitoringDot]} />
            </View>
            <View style={styles.monitorRow}>
              <Text style={styles.cardValue}>
                {tasks7d == null ? "—" : String(tasks7d)}
                <Text style={styles.cardValueUnit}> tasks (7d)</Text>
              </Text>
              <Sparkline counts={taskSparklineCounts(kpi)} />
            </View>
            <Text style={styles.cardSub}>
              {signedIn == null ? "—" : String(signedIn)} signed in
              {" · "}
              {unconfirmed == null ? "—" : String(unconfirmed)} unconfirmed
            </Text>
            {supabaseState === "unavailable" ? (
              <Text style={styles.downHint}>1 provider down</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8AA3AD" />
        </Pressable>

        <Pressable
          testID="owner-home__section_economics"
          style={styles.card}
          onPress={onOpenEconomics}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="cash-outline" size={22} color="#0A556B" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Economics</Text>
            <Text style={styles.cardValue}>{money.value}</Text>
            <View style={styles.pillRow}>
              <View style={[styles.pill, pastDue === 0 ? styles.pillGood : styles.pillWarn]}>
                <Text style={pastDue === 0 ? styles.pillGoodText : styles.pillWarnText}>
                  {pastDue} past due
                </Text>
              </View>
              <View style={[styles.pill, drift === 0 ? styles.pillGood : styles.pillWarn]}>
                <Text style={drift === 0 ? styles.pillGoodText : styles.pillWarnText}>
                  {drift} drift
                </Text>
              </View>
            </View>
            <Text style={styles.cardSub}>{money.stripeHint}</Text>
            {withoutCaption ? <Text style={styles.cardSub}>{withoutCaption}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8AA3AD" />
        </Pressable>

        <Pressable
          testID="owner-home__section_tenant_ops"
          style={styles.card}
          onPress={onOpenTenantOps}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="business-outline" size={22} color="#0A556B" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Tenant operations</Text>
            <Text style={styles.cardValue}>
              {companies == null ? "—" : String(companies)}
              <Text style={styles.cardValueUnit}> companies</Text>
            </Text>
            <Text style={styles.cardSub}>Quota and top tenants later</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8AA3AD" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#E7F4F8" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0A556B",
  },
  brand: { color: "#fff", fontWeight: "700", fontSize: 18, letterSpacing: 0.4 },
  meta: { color: "#C8E6EF", fontSize: 12, marginTop: 2 },
  signOut: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  signOutText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  scroll: { padding: 16, paddingBottom: 32 },
  center: { paddingVertical: 12, alignItems: "center" },
  alert: {
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 52,
  },
  alertP0: { backgroundColor: "#FEE2E2", borderColor: "#F5C2C2" },
  alertP1: { backgroundColor: "#FEF3C7", borderColor: "#F5D98A" },
  alertText: { flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  alertP0Text: { color: "#991B1B" },
  alertP1Text: { color: "#B45309" },
  hero: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C8E6EF",
    backgroundColor: "#F8FCFF",
    padding: 16,
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  heroTitle: { fontSize: 16, fontWeight: "700", color: "#0D2630" },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeOk: { backgroundColor: "#DCFCE7" },
  badgeWatch: { backgroundColor: "#FEF3C7" },
  badgeAct: { backgroundColor: "#FEE2E2" },
  badgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  badgeOkText: { color: "#166534" },
  badgeWatchText: { color: "#B45309" },
  badgeActText: { color: "#991B1B" },
  heroMetrics: { flexDirection: "row", gap: 16 },
  heroMetric: { flex: 1 },
  heroValue: { fontSize: 26, fontWeight: "700", color: "#0D2630" },
  heroCaption: { marginTop: 2, fontSize: 13, color: "#577783" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C8E6EF",
    backgroundColor: "#E7F4F8",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: { fontSize: 12, fontWeight: "600", color: "#0A556B" },
  pillGood: { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" },
  pillGoodText: { fontSize: 12, fontWeight: "600", color: "#166534" },
  pillWarn: { backgroundColor: "#FEF3C7", borderColor: "#F5D98A" },
  pillWarnText: { fontSize: 12, fontWeight: "600", color: "#B45309" },
  updated: { marginTop: 10, fontSize: 12, color: "#8AA3AD" },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D5E8EF",
    backgroundColor: "#F4FAFC",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E7F4F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#0D2630" },
  cardValue: { marginTop: 4, fontSize: 20, fontWeight: "700", color: "#0D2630" },
  cardValueUnit: { fontSize: 14, fontWeight: "600", color: "#577783" },
  cardSub: { marginTop: 4, fontSize: 13, color: "#577783" },
  downHint: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#991B1B" },
  monitorRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  spark: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 22,
    flex: 1,
    maxWidth: 88,
  },
  sparkBar: {
    flex: 1,
    borderRadius: 2,
    backgroundColor: "#0A556B",
    minWidth: 3,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: "#16A34A" },
  dotAmber: { backgroundColor: "#D97706" },
  dotRed: { backgroundColor: "#DC2626" },
});
