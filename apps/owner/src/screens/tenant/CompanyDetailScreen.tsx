import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  fetchCompanyDetail,
  OwnerTenantError,
  type CompanyDetail,
} from "../../lib/fetchOwnerTenantRead";
import {
  fetchSupportSnapshot,
  type OwnerSupportSnapshot,
} from "../../lib/fetchOwnerOpsRead";
import { formatSeatUsageLine } from "../../lib/ownerEntitlementView";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "CompanyDetail">;

export default function CompanyDetailScreen({ navigation, route }: Props) {
  const { companyId, companyName } = route.params;
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [support, setSupport] = useState<OwnerSupportSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      setError(null);
      try {
        const [d, supportSnap] = await Promise.all([
          fetchCompanyDetail(supabase, companyId),
          fetchSupportSnapshot(supabase, companyId).catch(() => null),
        ]);
        setDetail(d);
        setSupport(supportSnap);
      } catch (err) {
        setDetail(null);
        setError(err instanceof OwnerTenantError ? err.message : "Could not load company");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-tenant-company-detail__root">
      <View style={s.header}>
        <Pressable testID="owner-tenant-company-detail__back" onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <Text style={s.title} numberOfLines={1}>
          {companyName}
        </Text>
        <View style={s.backSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load({ soft: true }); }} tintColor="#0A556B" />
        }
      >
        {loading && !detail ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#0A556B" />
          </View>
        ) : null}
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
            <Pressable onPress={() => void load()} style={s.retry}>
              <Text style={s.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {detail ? (
          <>
            <View style={s.card}>
              <Text style={s.sectionTitle}>Metadata</Text>
              <Text style={s.cardTitle}>{detail.company.name}</Text>
              <Text style={s.cardSub}>{detail.company.type.replace(/_/g, " ")}</Text>
              {detail.company.email ? <Text style={s.rowMeta}>{detail.company.email}</Text> : null}
              {detail.company.phone ? <Text style={s.rowMeta}>{detail.company.phone}</Text> : null}
              {detail.company.address ? <Text style={s.rowMeta}>{detail.company.address}</Text> : null}
            </View>
            <View style={s.card} testID="owner-tenant-company-detail__entitlement">
              <Text style={s.sectionTitle}>Entitlement</Text>
              <Text style={s.cardTitle}>{detail.entitlement.statusLabel}</Text>
              <Text style={s.cardSub}>{detail.entitlement.limitsLabel}</Text>
              <Text style={s.rowMeta}>
                Seats:{" "}
                {formatSeatUsageLine(
                  detail.usage.pmSeats,
                  detail.usage.pmSeatLimit,
                  detail.usage.workerSeats,
                  detail.usage.workerSeatLimit,
                )}
              </Text>
              <Text style={s.rowMeta}>
                Projects: {detail.usage.projectCount}
                {detail.usage.projectLimit != null ? ` / ${detail.usage.projectLimit}` : " / ∞"}
              </Text>
            </View>
            {support ? (
              <View style={s.card} testID="owner-tenant-company-detail__support">
                <Text style={s.sectionTitle}>Support snapshot</Text>
                {support.sections?.subscription === "unavailable" ? (
                  <Text style={s.rowMeta}>Subscription: unavailable</Text>
                ) : (
                  <Text style={s.rowMeta}>
                    Sub: {support.subscription.status ?? "—"}
                    {support.subscription.stripeSubscriptionId
                      ? ` · ${support.subscription.stripeSubscriptionId.slice(0, 14)}…`
                      : ""}
                  </Text>
                )}
                <Text style={s.rowMeta}>
                  Users{" "}
                  {support.usage.activeUsers == null || support.usage.userCount == null
                    ? "unavailable"
                    : `${support.usage.activeUsers}/${support.usage.userCount} active`}
                  {" · projects "}
                  {support.usage.projectCount == null
                    ? "unavailable"
                    : `${support.usage.projectCount}${
                      support.usage.projectLimit != null
                        ? ` / ${support.usage.projectLimit}`
                        : " / ∞"
                    }`}
                </Text>
                {support.subscription.stripeCustomerId ? (
                  <Text style={s.rowMeta}>
                    Customer {support.subscription.stripeCustomerId}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <View style={s.statRow}>
              <View style={s.statTile}>
                <Text style={s.statValue}>{detail.stats.projects}</Text>
                <Text style={s.statLabel}>Projects</Text>
              </View>
              <View style={s.statTile}>
                <Text style={s.statValue}>{detail.stats.tasks}</Text>
                <Text style={s.statLabel}>Tasks</Text>
              </View>
              <View style={s.statTile}>
                <Text style={s.statValue}>{detail.stats.users}</Text>
                <Text style={s.statLabel}>Users</Text>
              </View>
            </View>
            <Pressable
              testID="owner-tenant-company-detail__projects"
              style={s.linkCard}
              onPress={() => navigation.navigate("CompanyProjects", { companyId, companyName })}
            >
              <Text style={s.linkTitle}>Projects</Text>
              <Text style={s.linkSub}>{detail.stats.projects} projects · tap for list</Text>
            </Pressable>
            <Pressable
              testID="owner-tenant-company-detail__users"
              style={s.linkCard}
              onPress={() => navigation.navigate("CompanyUsers", { companyId, companyName })}
            >
              <Text style={s.linkTitle}>Users</Text>
              <Text style={s.linkSub}>{detail.stats.users} users · read-only roster</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
