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
  fetchCompanyList,
  OwnerTenantError,
  type CompanyListItem,
} from "../../lib/fetchOwnerTenantRead";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { navigateTenant, resetToTenantHome } from "../../navigation/tenantNavigation";
import TenantScreenHeader from "./TenantScreenHeader";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "CompanyList">;

export default function CompanyListScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { soft?: boolean; search?: string }) => {
      if (!opts?.soft) setLoading(true);
      setError(null);
      try {
        const result = await fetchCompanyList(supabase, {
          query: opts?.search ?? query,
          limit: 25,
        });
        setCompanies(result.companies);
        setTotal(result.total);
      } catch (err) {
        setCompanies([]);
        setError(err instanceof OwnerTenantError ? err.message : "Could not load companies");
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
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-tenant-companies__root">
      <TenantScreenHeader
        title="Companies"
        onHome={() => resetToTenantHome(navigation)}
        backTestID="owner-tenant-companies__back"
        homeTestID="owner-tenant-companies__home"
      />
      <FlatList
        contentContainerStyle={s.scroll}
        data={companies}
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
                Read-only tenant drill-down on DEV. {total} companies total.
              </Text>
            </View>
            <TextInput
              testID="owner-tenant-companies__search"
              style={s.search}
              placeholder="Search by name…"
              placeholderTextColor="#8AA3AD"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => void load({ search: query })}
              returnKeyType="search"
            />
            {loading && companies.length === 0 ? (
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
        renderItem={({ item }) => (
          <Pressable
            testID={`owner-tenant-companies__card_${item.id}`}
            style={s.card}
            onPress={() =>
              navigateTenant(navigation, "CompanyDetail", {
                companyId: item.id,
                companyName: item.name,
              })
            }
          >
            <Text style={s.cardTitle}>{item.name}</Text>
            <Text style={s.cardSub}>
              {item.projectCount} projects · {item.userCount} users
            </Text>
            <Text style={s.rowMeta}>{item.type.replace(/_/g, " ")}</Text>
            <View style={[s.badge, !item.isActive && s.badgeInactive]}>
              <Text style={[s.badgeText, !item.isActive && s.badgeInactiveText]}>
                {item.isActive ? "Active" : "Inactive"}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading && !error ? (
            <Text style={s.meta}>No companies match this search.</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
