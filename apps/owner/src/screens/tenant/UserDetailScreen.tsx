import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import {
  fetchTaskList,
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
import { navigateTenant, goBackTenant, popToTenantScreen, resetToTenantHome } from "../../navigation/tenantNavigation";
import TenantScreenHeader from "./TenantScreenHeader";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "UserDetail">;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

type DestProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  testID: string;
  disabled?: boolean;
  onPress?: () => void;
};

function DestRow({ icon, label, value, testID, disabled, onPress }: DestProps) {
  const body = (
    <>
      <View style={s.factRowIcon}>
        <Ionicons name={icon} size={22} color="#0A556B" />
      </View>
      <View style={s.destCardBody}>
        <Text style={s.destCardLabel}>{label}</Text>
        <Text style={[s.destCardValue, disabled ? s.destCardValueMuted : null]}>{value}</Text>
      </View>
      {disabled ? (
        <Text style={s.segmentSoon}>soon</Text>
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#8AA3AD" />
      )}
    </>
  );

  if (disabled || !onPress) {
    return (
      <View
        style={[s.destCard, disabled ? s.destCardDisabled : null]}
        testID={testID}
        accessibilityState={{ disabled: true }}
      >
        {body}
      </View>
    );
  }

  return (
    <Pressable style={s.destCard} testID={testID} onPress={onPress}>
      {body}
    </Pressable>
  );
}

async function shareCopy(label: string, value: string) {
  try {
    await Share.share({ message: value, title: label });
  } catch {
    // dismissed
  }
}

export default function UserDetailScreen({ navigation, route }: Props) {
  const { companyId, userId, userName } = route.params;
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [session, setSession] = useState<OwnerSessionDebug | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskCount, setTaskCount] = useState<number | null>(null);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      setError(null);
      try {
        const [d, sess, tasks] = await Promise.all([
          fetchUserDetail(supabase, userId, companyId),
          fetchUserSessionDebug(supabase, userId).catch(() => null),
          fetchTaskList(supabase, { companyId, userId, limit: 1 }).catch(() => null),
        ]);
        setDetail(d);
        setSession(sess);
        setTaskCount(tasks?.total ?? 0);
      } catch (err) {
        setDetail(null);
        setError(err instanceof OwnerTenantError ? err.message : "Could not load user");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, userId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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

  const resolvedCompanyId = detail?.user.companyId ?? companyId;
  const resolvedCompanyName = route.params.companyName;
  const statusLabel = detail
    ? detail.user.isPending
      ? "Pending approval"
      : detail.user.isActive
        ? "Active"
        : "Inactive"
    : "";

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-tenant-user-detail__root">
      <TenantScreenHeader
        title={userName}
        onBack={() => goBackTenant(navigation)}
        onHome={() => resetToTenantHome(navigation)}
      />
      <ScrollView
        contentContainerStyle={s.scroll}
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
        <View style={s.banner}>
          <Text style={s.bannerText}>
            Company binding is fixed at create. Deactivate frees the seat; no company switch.
          </Text>
        </View>
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
            <View style={s.detailHero}>
              <View style={s.detailHeroRow}>
                <View
                  style={[
                    s.paneAvatar,
                    { marginRight: 0 },
                    !detail.user.isActive ? s.paneAvatarMuted : null,
                  ]}
                >
                  <Text
                    style={[
                      s.paneAvatarText,
                      !detail.user.isActive ? s.paneAvatarTextMuted : null,
                    ]}
                  >
                    {initials(detail.user.name)}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.detailHeroTitle} numberOfLines={2}>
                    {detail.user.name}
                  </Text>
                  <View
                    style={[
                      s.deckHeroActiveBadge,
                      !detail.user.isActive ? s.deckHeroInactiveBadge : null,
                      { alignSelf: "flex-start", marginTop: 8 },
                    ]}
                  >
                    <Text
                      style={[
                        s.deckHeroActiveText,
                        !detail.user.isActive ? s.deckHeroInactiveText : null,
                      ]}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={[s.detailHeroSub, { marginTop: 10 }]}>
                {detail.user.role} · {detail.user.seatClass} seat
              </Text>
            </View>

            <View style={s.factSection}>
              <Text style={s.factSectionCaption}>Identity</Text>
              <View style={s.factSheet}>
                <Pressable
                  style={[s.factRow, s.factRowFirst]}
                  onPress={() => void Linking.openURL(`mailto:${detail.user.email}`)}
                >
                  <View style={s.factRowIcon}>
                    <Ionicons name="mail-outline" size={20} color="#0A556B" />
                  </View>
                  <View style={s.factRowBody}>
                    <Text style={s.factRowLabel}>Email</Text>
                    <Text style={s.factRowValue}>{detail.user.email}</Text>
                  </View>
                  <Ionicons name="copy-outline" size={20} color="#0A556B" />
                </Pressable>
                {detail.user.phone ? (
                  <Pressable
                    style={s.factRow}
                    onPress={() => void Linking.openURL(`tel:${detail.user.phone}`)}
                  >
                    <View style={s.factRowIcon}>
                      <Ionicons name="call-outline" size={20} color="#0A556B" />
                    </View>
                    <View style={s.factRowBody}>
                      <Text style={s.factRowLabel}>Phone</Text>
                      <Text style={s.factRowValue}>{detail.user.phone}</Text>
                    </View>
                    <Ionicons name="copy-outline" size={20} color="#0A556B" />
                  </Pressable>
                ) : null}
                <View style={s.factRow}>
                  <View style={s.factRowIcon}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#0A556B" />
                  </View>
                  <View style={s.factRowBody}>
                    <Text style={s.factRowLabel}>Role / seat</Text>
                    <Text style={s.factRowValue}>
                      {detail.user.role} · {detail.user.seatClass}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={s.factSectionCaption}>Open</Text>
            <DestRow
              icon="folder-open-outline"
              label="Projects"
              value={`${detail.assignments.length}`}
              testID="owner-tenant-user-detail__stat_projects"
              onPress={() =>
                navigateTenant(navigation, "UserAssignments", {
                  companyId: resolvedCompanyId,
                  companyName: resolvedCompanyName,
                  userId,
                  userName,
                })
              }
            />
            <DestRow
              icon="layers-outline"
              label="Tasks"
              value={taskCount == null ? "…" : `${taskCount}`}
              testID="owner-tenant-user-detail__stat_tasks"
              onPress={() =>
                navigateTenant(navigation, "EntityList", {
                  entity: "tasks",
                  companyId: resolvedCompanyId,
                  companyName: resolvedCompanyName,
                  userId,
                  userName,
                })
              }
            />
            <DestRow
              icon="business-outline"
              label="Company"
              value={resolvedCompanyName || "Open company"}
              testID="owner-tenant-user-detail__stat_company"
              onPress={() => {
                if (!resolvedCompanyId) return;
                popToTenantScreen(navigation, "CompanyDetail", {
                  companyId: resolvedCompanyId,
                  companyName: resolvedCompanyName,
                });
              }}
            />

            {session ? (
              <View style={[s.factSection, { marginTop: 8 }]}>
                <Text style={s.factSectionCaption}>Session debug</Text>
                <View style={s.factSheet} testID="owner-tenant-user-detail__session">
                  <View style={[s.factRow, s.factRowFirst]}>
                    <View style={s.factRowIcon}>
                      <Ionicons name="time-outline" size={20} color="#0A556B" />
                    </View>
                    <View style={s.factRowBody}>
                      <Text style={s.factRowLabel}>Last sign-in</Text>
                      <Text style={s.factRowValue}>
                        {session.user.lastSignInAt?.slice(0, 19) ?? "—"}
                      </Text>
                    </View>
                  </View>
                  <View style={s.factRow}>
                    <View style={s.factRowIcon}>
                      <Ionicons name="mail-open-outline" size={20} color="#0A556B" />
                    </View>
                    <View style={s.factRowBody}>
                      <Text style={s.factRowLabel}>Email confirmed</Text>
                      <Text style={s.factRowValue}>
                        {session.user.emailConfirmedAt?.slice(0, 19) ?? "—"}
                      </Text>
                    </View>
                  </View>
                  <View style={s.factRow}>
                    <View style={s.factRowIcon}>
                      <Ionicons name="ban-outline" size={20} color="#0A556B" />
                    </View>
                    <View style={s.factRowBody}>
                      <Text style={s.factRowLabel}>Banned until</Text>
                      <Text style={s.factRowValue}>
                        {session.user.bannedUntil?.slice(0, 19) ?? "—"}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={s.factRow}
                    onPress={() =>
                      void shareCopy(
                        "Metadata keys",
                        `app: ${session.user.appMetadataKeys.join(", ") || "—"}\nuser: ${
                          session.user.userMetadataKeys.join(", ") || "—"
                        }`,
                      )
                    }
                  >
                    <View style={s.factRowIcon}>
                      <Ionicons name="key-outline" size={20} color="#0A556B" />
                    </View>
                    <View style={s.factRowBody}>
                      <Text style={s.factRowLabel}>Meta keys</Text>
                      <Text style={s.factRowValue} numberOfLines={2}>
                        app {session.user.appMetadataKeys.join(", ") || "—"} · user{" "}
                        {session.user.userMetadataKeys.join(", ") || "—"}
                      </Text>
                    </View>
                    <Ionicons name="copy-outline" size={20} color="#0A556B" />
                  </Pressable>
                </View>
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
                  marginTop: 8,
                  marginBottom: 16,
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                    Deactivate user
                  </Text>
                )}
              </Pressable>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
