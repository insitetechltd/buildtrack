import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  fetchUserDetail,
  OwnerTenantError,
  type UserDetail,
} from "../../lib/fetchOwnerTenantRead";
import {
  deactivateOwnerTenantUser,
  OwnerTenantWriteError,
} from "../../lib/fetchOwnerTenantWrite";
import {
  fetchUserSessionDebug,
  type OwnerSessionDebug,
} from "../../lib/fetchOwnerOpsRead";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "UserDetail">;

export default function UserDetailScreen({ navigation, route }: Props) {
  const { companyId, userId, userName } = route.params;
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [session, setSession] = useState<OwnerSessionDebug | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    setError(null);
    try {
      const [d, sess] = await Promise.all([
        fetchUserDetail(supabase, userId, companyId),
        fetchUserSessionDebug(supabase, userId).catch(() => null),
      ]);
      setDetail(d);
      setSession(sess);
    } catch (err) {
      setDetail(null);
      setError(err instanceof OwnerTenantError ? err.message : "Could not load user");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, userId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onDeactivate = () => {
    Alert.alert(
      "Deactivate user?",
      "Removes seat access. Company binding cannot be changed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusy(true);
              setError(null);
              try {
                await deactivateOwnerTenantUser(supabase, { companyId, userId });
                await load({ soft: true });
              } catch (err) {
                setError(
                  err instanceof OwnerTenantWriteError
                    ? err.message
                    : "Could not deactivate",
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-tenant-user-detail__root">
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <Text style={s.title} numberOfLines={1}>{userName}</Text>
        <View style={s.backSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load({ soft: true }); }} tintColor="#0A556B" />
        }
      >
        <View style={s.banner}>
          <Text style={s.bannerText}>
            Company binding is fixed at create. Deactivate frees the seat; no company switch.
          </Text>
        </View>
        {loading && !detail ? (
          <View style={s.center}><ActivityIndicator size="large" color="#0A556B" /></View>
        ) : null}
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
            <Pressable onPress={() => void load()} style={s.retry}><Text style={s.retryText}>Retry</Text></Pressable>
          </View>
        ) : null}
        {detail ? (
          <>
            <View style={s.card}>
              <Text style={s.cardTitle}>{detail.user.name}</Text>
              <Text style={s.cardSub}>{detail.user.email}</Text>
              {detail.user.phone ? <Text style={s.rowMeta}>{detail.user.phone}</Text> : null}
              <Text style={s.rowMeta}>
                Role: {detail.user.role} · Seat: {detail.user.seatClass}
              </Text>
              <Text style={s.rowMeta}>
                Company ID: {detail.user.companyId ?? "—"} (read-only)
              </Text>
              <Text style={s.rowMeta}>
                {detail.user.isPending ? "Pending approval" : detail.user.isActive ? "Active" : "Inactive"}
              </Text>
            </View>
            {session ? (
              <View style={s.card} testID="owner-tenant-user-detail__session">
                <Text style={s.sectionTitle}>Session debug (sanitized)</Text>
                <Text style={s.rowMeta}>
                  Last sign-in: {session.user.lastSignInAt?.slice(0, 19) ?? "—"}
                </Text>
                <Text style={s.rowMeta}>
                  Email confirmed: {session.user.emailConfirmedAt?.slice(0, 19) ?? "—"}
                </Text>
                <Text style={s.rowMeta}>
                  Banned until: {session.user.bannedUntil?.slice(0, 19) ?? "—"}
                </Text>
                <Text style={s.rowMeta}>
                  App meta keys: {session.user.appMetadataKeys.join(", ") || "—"}
                </Text>
                <Text style={s.rowMeta}>
                  User meta keys: {session.user.userMetadataKeys.join(", ") || "—"}
                </Text>
              </View>
            ) : null}
            {detail.user.isActive ? (
              <Pressable
                testID="owner-tenant-user-detail__deactivate"
                onPress={onDeactivate}
                disabled={busy}
                style={{
                  backgroundColor: "#B91C1C",
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                  marginBottom: 16,
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Deactivate user</Text>
                )}
              </Pressable>
            ) : null}
            <Text style={s.sectionTitle}>Project assignments</Text>
            {detail.assignments.length === 0 ? (
              <Text style={s.meta}>No active project assignments.</Text>
            ) : (
              detail.assignments.map((a, i) => (
                <View key={`${a.projectId}-${i}`} style={s.card}>
                  <Text style={s.cardTitle}>{a.projectName}</Text>
                  <Text style={s.cardSub}>
                    {a.projectRole.replace(/_/g, " ")} · {a.projectStatus}
                  </Text>
                </View>
              ))
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
