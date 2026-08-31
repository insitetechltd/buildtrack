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
  fetchUserList,
  OwnerTenantError,
  type UserListItem,
} from "../../lib/fetchOwnerTenantRead";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { navigateTenant, resetToTenantHome } from "../../navigation/tenantNavigation";
import TenantScreenHeader from "./TenantScreenHeader";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "CompanyUsers">;

export default function CompanyUsersScreen({ navigation, route }: Props) {
  const { companyId, companyName } = route.params;
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
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
  }, [companyId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-tenant-users__root">
      <TenantScreenHeader
        title="Users"
        onHome={() => resetToTenantHome(navigation)}
        right={
          <Pressable
            testID="owner-tenant-users__add"
            onPress={() =>
              navigateTenant(navigation, "CreateUser", { companyId, companyName })
            }
            style={s.back}
          >
            <Text style={s.backText}>Add</Text>
          </Pressable>
        }
      />
      <FlatList
        contentContainerStyle={s.scroll}
        data={users}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load({ soft: true }); }} tintColor="#0A556B" />
        }
        ListHeaderComponent={
          <>
            <View style={s.banner}>
              <Text style={s.bannerText}>
                {companyName} · create / deactivate via owner Edge
              </Text>
            </View>
            {truncated ? <Text style={s.meta}>Showing first 100 users.</Text> : null}
            {loading && users.length === 0 ? (
              <View style={s.center}><ActivityIndicator size="large" color="#0A556B" /></View>
            ) : null}
            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
                <Pressable onPress={() => void load()} style={s.retry}><Text style={s.retryText}>Retry</Text></Pressable>
              </View>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`owner-tenant-users__row_${item.id}`}
            style={s.card}
            onPress={() =>
              navigateTenant(navigation, "UserDetail", {
                companyId,
                companyName,
                userId: item.id,
                userName: item.name,
              })
            }
          >
            <Text style={s.cardTitle}>{item.name}</Text>
            <Text style={s.cardSub}>{item.projectCount} projects</Text>
            <Text style={s.rowMeta}>
              {item.email} · {item.role} · {item.seatClass} seat
            </Text>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
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
          </Pressable>
        )}
        ListEmptyComponent={!loading && !error ? <Text style={s.meta}>No users.</Text> : null}
      />
    </SafeAreaView>
  );
}
