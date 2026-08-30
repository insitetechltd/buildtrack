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

import {
  fetchOwnerEconomicsSnapshot,
  OwnerEconomicsError,
  type OwnerEconomicsSnapshot,
} from "../lib/fetchOwnerEconomicsSnapshot";
import {
  fetchEconomicsStripeSnapshot,
  OwnerOpsError,
  type OwnerEconomicsStripeSnapshot,
} from "../lib/fetchOwnerOpsRead";
import { supabase } from "../lib/supabase";

type Props = {
  onBack: () => void;
};

function CountRows({
  title,
  counts,
  testID,
}: {
  title: string;
  counts: Record<string, number>;
  testID: string;
}) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <View style={styles.card} testID={testID}>
      <Text style={styles.cardTitle}>{title}</Text>
      {entries.length === 0 ? (
        <Text style={styles.meta}>No rows.</Text>
      ) : (
        entries.map(([key, count]) => (
          <View key={key} style={styles.row}>
            <Text style={styles.rowLabel}>{key.replace(/_/g, " ")}</Text>
            <Text style={styles.rowValue}>{count}</Text>
          </View>
        ))
      )}
    </View>
  );
}

export default function EconomicsScreen({ onBack }: Props) {
  const [snapshot, setSnapshot] = useState<OwnerEconomicsSnapshot | null>(null);
  const [stripe, setStripe] = useState<OwnerEconomicsStripeSnapshot | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    setError(null);
    setStripeError(null);
    try {
      const [pg, stripeSnap] = await Promise.all([
        fetchOwnerEconomicsSnapshot(supabase),
        fetchEconomicsStripeSnapshot(supabase).catch((err) => {
          setStripe(null);
          setStripeError(
            err instanceof OwnerOpsError ? err.message : "Stripe enrich unavailable",
          );
          return null;
        }),
      ]);
      setSnapshot(pg);
      if (stripeSnap) setStripe(stripeSnap);
    } catch (err) {
      setSnapshot(null);
      setError(
        err instanceof OwnerEconomicsError ? err.message : "Could not load economics",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="owner-economics__root">
      <View style={styles.header}>
        <Pressable testID="owner-economics__back" onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Economics</Text>
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
            Postgres subscription / entitlement counts on DEV. Stripe MRR appears only when
            STRIPE_SECRET_KEY is configured on the Edge — never invented.
          </Text>
        </View>
        {stripeError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{stripeError}</Text>
          </View>
        ) : null}
        {stripe ? (
          <View style={styles.card} testID="owner-economics__stripe">
            <Text style={styles.cardTitle}>Stripe (API)</Text>
            {!stripe.stripeConfigured ? (
              <Text style={styles.meta} testID="owner-economics__stripe_unconfigured">
                {stripe.detail}
              </Text>
            ) : (
              <>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>
                    Est. monthly ({stripe.currency ?? "?"})
                  </Text>
                  <Text style={styles.rowValue}>
                    {stripe.mrrCents != null
                      ? (stripe.mrrCents / 100).toFixed(2)
                      : "withheld"}
                  </Text>
                </View>
                {stripe.listIncomplete || stripe.mrrEstimate === false ? (
                  <Text style={styles.meta}>
                    MRR withheld when Stripe list is incomplete or currencies mix.
                  </Text>
                ) : null}
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Trialing</Text>
                  <Text style={styles.rowValue}>{stripe.trialCount}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Past due</Text>
                  <Text style={styles.rowValue}>{stripe.pastDueCount}</Text>
                </View>
                <Text style={styles.meta}>{stripe.detail}</Text>
                <Text style={[styles.cardTitle, { marginTop: 12 }]}>Reconcile</Text>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Aligned</Text>
                  <Text style={styles.rowValue}>{stripe.reconcile.aligned}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>DB only</Text>
                  <Text style={styles.rowValue}>{stripe.reconcile.dbOnly}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Stripe only</Text>
                  <Text style={styles.rowValue}>{stripe.reconcile.stripeOnly}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Status mismatch</Text>
                  <Text style={styles.rowValue}>{stripe.reconcile.statusMismatch}</Text>
                </View>
                {stripe.reconcile.flags.slice(0, 8).map((f, i) => (
                  <Text key={`${f.kind}-${i}`} style={styles.meta}>
                    {f.kind}: {f.detail}
                  </Text>
                ))}
              </>
            )}
          </View>
        ) : null}
        {loading && !snapshot ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0A556B" />
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retry}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {snapshot ? (
          <>
            <View style={styles.card} testID="owner-economics__totals">
              <Text style={styles.cardTitle}>Totals</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Companies</Text>
                <Text style={styles.rowValue}>{snapshot.totals.companies}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>With subscription row</Text>
                <Text style={styles.rowValue}>
                  {snapshot.totals.companiesWithSubscriptionRow}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Without subscription row</Text>
                <Text style={styles.rowValue}>
                  {snapshot.totals.companiesWithoutSubscriptionRow}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Stripe subscription id</Text>
                <Text style={styles.rowValue}>
                  {snapshot.totals.companiesWithStripeSubscriptionId}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Trials not ended</Text>
                <Text style={styles.rowValue}>{snapshot.totals.trialsNotEnded}</Text>
              </View>
            </View>
            <CountRows
              title="Subscription status"
              counts={snapshot.subscriptionStatusCounts}
              testID="owner-economics__sub_status"
            />
            <CountRows
              title="Entitlement status (may drift)"
              counts={snapshot.entitlementStatusCounts}
              testID="owner-economics__ent_status"
            />
            <CountRows
              title="Billing phase"
              counts={snapshot.billingPhaseCounts}
              testID="owner-economics__billing_phase"
            />
            <CountRows
              title="Plan tiers"
              counts={snapshot.tierCounts}
              testID="owner-economics__tiers"
            />
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Platform costs / margin</Text>
              <Text style={styles.meta}>Planned — manual / provider feeds later.</Text>
            </View>
            <Text style={styles.hint}>{snapshot.currencyNote}</Text>
            <Text style={styles.hint}>Stripe: {snapshot.stripeDashboardHint}</Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#E7F4F8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#0A556B",
  },
  back: { minWidth: 64, paddingVertical: 8 },
  backText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  backSpacer: { minWidth: 64 },
  title: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  scroll: { padding: 16, paddingBottom: 48 },
  banner: {
    backgroundColor: "#D6EEF5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: { color: "#0A556B", fontSize: 13, lineHeight: 18 },
  center: { paddingVertical: 40, alignItems: "center" },
  errorBox: {
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: "#991B1B", marginBottom: 8 },
  retry: {
    alignSelf: "flex-start",
    backgroundColor: "#0A556B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0A556B",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  rowLabel: { color: "#334155", fontSize: 14, flex: 1, paddingRight: 8 },
  rowValue: { color: "#0F172A", fontSize: 14, fontWeight: "700" },
  meta: { color: "#64748B", fontSize: 13 },
  hint: { color: "#64748B", fontSize: 12, marginBottom: 6 },
});
