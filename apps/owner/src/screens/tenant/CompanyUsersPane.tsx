import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  fetchUserList,
  OwnerTenantError,
  type UserListItem,
} from "../../lib/fetchOwnerTenantRead";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { navigateTenant } from "../../navigation/tenantNavigation";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = {
  companyId: string;
  companyName: string;
  navigation: NativeStackNavigationProp<OwnerStackParamList>;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function isPmSeat(item: UserListItem): boolean {
  const seat = item.seatClass.toLowerCase();
  const role = item.role.toLowerCase();
  return seat === "pm" || role.includes("admin") || role.includes("manager");
}

export default function CompanyUsersPane({ companyId, companyName, navigation }: Props) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      setError(null);
      try {
        const result = await fetchUserList(supabase, companyId);
        setUsers(result.users);
        setTruncated(result.truncated);
      } catch (err) {
        setUsers([]);
        setError(err instanceof OwnerTenantError ? err.message : "Could not load users");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.seatClass.toLowerCase().includes(q),
    );
  }, [users, query]);

  const pmCount = users.filter((u) => isPmSeat(u)).length;
  const workerCount = users.length - pmCount;

  return (
    <FlatList
      style={s.contentFlex}
      contentContainerStyle={[s.scroll, { paddingTop: 0 }]}
      data={filtered}
      keyExtractor={(item) => item.id}
      testID="owner-tenant-company-detail__users_pane"
      keyboardShouldPersistTaps="handled"
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
          <View style={s.paneSearchRow}>
            <View style={s.paneSearch}>
              <Ionicons name="search-outline" size={18} color="#8AA3AD" />
              <TextInput
                testID="owner-tenant-users__search"
                style={s.paneSearchInput}
                placeholder="Search name or email…"
                placeholderTextColor="#8AA3AD"
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
            <Pressable
              testID="owner-tenant-users__add"
              style={s.paneAddBtn}
              onPress={() =>
                navigateTenant(navigation, "CreateUser", { companyId, companyName })
              }
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="person-add-outline" size={16} color="#fff" />
                <Text style={s.paneAddText}>Add</Text>
              </View>
            </Pressable>
          </View>
          <Text style={s.paneCountCaption}>
            {filtered.length}
            {filtered.length !== users.length ? ` of ${users.length}` : ""} users · {pmCount}{" "}
            pm · {workerCount} worker
          </Text>
          {truncated ? <Text style={s.meta}>Showing first 100 users.</Text> : null}
          {loading && users.length === 0 ? (
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
        </>
      }
      renderItem={({ item }) => {
        const pm = isPmSeat(item);
        const pillLabel = item.isPending
          ? "Pending"
          : !item.isActive
            ? "Inactive"
            : pm
              ? "PM"
              : "Worker";
        const pillFilled = pm && item.isActive && !item.isPending;

        return (
          <Pressable
            testID={`owner-tenant-users__row_${item.id}`}
            style={s.paneListCard}
            onPress={() =>
              navigateTenant(navigation, "UserDetail", {
                companyId,
                companyName,
                userId: item.id,
                userName: item.name,
              })
            }
          >
            <View style={[s.paneAvatar, !item.isActive ? s.paneAvatarMuted : null]}>
              <Text
                style={[s.paneAvatarText, !item.isActive ? s.paneAvatarTextMuted : null]}
              >
                {initials(item.name)}
              </Text>
            </View>
            <View style={s.paneListBody}>
              <Text
                style={[s.cardTitle, !item.isActive ? { color: "#8AA3AD" } : null]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text style={s.cardSub} numberOfLines={1}>
                {item.role} · {item.projectCount} projects
              </Text>
              <Text style={s.rowMeta} numberOfLines={1}>
                {item.email}
              </Text>
              {item.isPending || !item.isActive ? (
                <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                  {item.isPending ? (
                    <View style={[s.badge, s.badgePending]}>
                      <Text style={[s.badgeText, s.badgePendingText]}>Pending</Text>
                    </View>
                  ) : null}
                  {!item.isActive ? (
                    <View style={[s.badge, s.badgeInactive]}>
                      <Text style={[s.badgeText, s.badgeInactiveText]}>Inactive</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
            <View style={[s.paneSeatPill, pillFilled ? s.paneSeatPillFilled : null]}>
              <Text
                style={[
                  s.paneSeatPillText,
                  pillFilled ? s.paneSeatPillTextFilled : null,
                  item.isPending ? s.badgePendingText : null,
                  !item.isActive && !item.isPending ? s.badgeInactiveText : null,
                ]}
              >
                {pillLabel}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8AA3AD" />
          </Pressable>
        );
      }}
      ListEmptyComponent={
        !loading && !error ? (
          <Text style={s.meta}>{query.trim() ? "No matching users." : "No users."}</Text>
        ) : null
      }
    />
  );
}
