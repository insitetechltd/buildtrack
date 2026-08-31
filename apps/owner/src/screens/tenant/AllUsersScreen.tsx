import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  fetchAllUsers,
  OwnerTenantError,
  type GlobalUserListItem,
} from "../../lib/fetchOwnerTenantRead";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { goBackTenant, navigateTenant, resetToTenantHome } from "../../navigation/tenantNavigation";
import TenantScreenHeader from "./TenantScreenHeader";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "AllUsers">;

export default function AllUsersScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<GlobalUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { soft?: boolean; search?: string }) => {
      if (!opts?.soft) setLoading(true);
      setError(null);
      try {
        const result = await fetchAllUsers(supabase, {
          query: opts?.search ?? query,
          limit: 50,
        });
        setUsers(result.users);
        setTotal(result.total);
        setTruncated(result.truncated);
      } catch (err) {
        setUsers([]);
        setError(
          err instanceof OwnerTenantError ? err.message : "Could not load users",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [query],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-tenant-all-users__root">
      <TenantScreenHeader
        title="All users"
        onBack={() => goBackTenant(navigation)}
        onHome={() => resetToTenantHome(navigation)}
        backTestID="owner-tenant-all-users__back"
        homeTestID="owner-tenant-all-users__home"
      />
      <FlatList
        contentContainerStyle={s.scroll}
        data={users}
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
                Every user on DEV, across companies. {total} total
                {truncated ? " · showing first page" : ""}. Search by name or email.
              </Text>
            </View>
            <TextInput
              testID="owner-tenant-all-users__search"
              style={s.search}
              placeholder="Search name or email…"
              placeholderTextColor="#8AA3AD"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => void load({ search: query })}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
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
            {!loading && !error && users.length === 0 ? (
              <Text style={s.meta} testID="owner-tenant-all-users__empty">
                No users matched.
              </Text>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`owner-tenant-all-users__row_${item.id}`}
            style={s.card}
            onPress={() => {
              if (!item.companyId) return;
              navigateTenant(navigation, "UserDetail", {
                companyId: item.companyId,
                companyName: item.companyName ?? "Company",
                userId: item.id,
                userName: item.name,
              });
            }}
          >
            <Text style={s.cardTitle}>{item.name}</Text>
            <Text style={s.cardSub}>
              {item.projectCount} projects
              {item.companyName ? ` · ${item.companyName}` : ""}
            </Text>
            <Text style={s.rowMeta}>
              {item.email} · {item.role} · {item.seatClass} seat
              {!item.isActive ? " · inactive" : ""}
              {item.isPending ? " · pending" : ""}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
