import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  fetchOwnerAuditLogs,
  OwnerOpsError,
  type OwnerAuditEntry,
} from "../../lib/fetchOwnerOpsRead";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { goBackTenant } from "../../navigation/tenantNavigation";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "AuditLog">;

export default function AuditLogScreen({ navigation }: Props) {
  const [entries, setEntries] = useState<OwnerAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    setError(null);
    try {
      setEntries(await fetchOwnerAuditLogs(supabase, 50));
    } catch (err) {
      setEntries([]);
      setError(err instanceof OwnerOpsError ? err.message : "Could not load audit log");
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
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-audit__root">
      <View style={s.header}>
        <Pressable testID="owner-audit__back" onPress={() => goBackTenant(navigation)} style={s.back}>
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <Text style={s.title}>Audit log</Text>
        <View style={s.backSpacer} />
      </View>
      <FlatList
        contentContainerStyle={s.scroll}
        data={entries}
        keyExtractor={(item) => item.id}
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
        ListHeaderComponent={
          <>
            <View style={s.banner}>
              <Text style={s.bannerText}>
                Owner write actions on DEV (create/deactivate). Read-only via Edge.
              </Text>
            </View>
            {loading && entries.length === 0 ? (
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
            {!loading && !error && entries.length === 0 ? (
              <Text style={s.meta} testID="owner-audit__empty">
                No audit entries yet.
              </Text>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <View style={s.card} testID={`owner-audit__row_${item.id}`}>
            <Text style={s.cardTitle}>{item.action}</Text>
            <Text style={s.cardSub}>
              {item.occurredAt.slice(0, 19)}Z · {item.actorEmail ?? item.actorUserId ?? "—"}
            </Text>
            {item.companyId ? (
              <Text style={s.rowMeta}>company {item.companyId.slice(0, 8)}…</Text>
            ) : null}
            {item.targetUserId ? (
              <Text style={s.rowMeta}>target {item.targetUserId.slice(0, 8)}…</Text>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
