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
  fetchAllProjects,
  OwnerTenantError,
  type GlobalProjectListItem,
} from "../../lib/fetchOwnerTenantRead";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { goBackTenant, navigateTenant, resetToTenantHome } from "../../navigation/tenantNavigation";
import TenantScreenHeader from "./TenantScreenHeader";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "AllProjects">;

export default function AllProjectsScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<GlobalProjectListItem[]>([]);
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
        const result = await fetchAllProjects(supabase, {
          query: opts?.search ?? query,
          limit: 50,
        });
        setProjects(result.projects);
        setTotal(result.total);
        setTruncated(result.truncated);
      } catch (err) {
        setProjects([]);
        setError(
          err instanceof OwnerTenantError ? err.message : "Could not load projects",
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
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-tenant-all-projects__root">
      <TenantScreenHeader
        title="All projects"
        onBack={() => goBackTenant(navigation)}
        onHome={() => resetToTenantHome(navigation)}
        backTestID="owner-tenant-all-projects__back"
        homeTestID="owner-tenant-all-projects__home"
      />
      <FlatList
        contentContainerStyle={s.scroll}
        data={projects}
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
                Every project on DEV, across companies. {total} total
                {truncated ? " · showing first page" : ""}.
              </Text>
            </View>
            <TextInput
              testID="owner-tenant-all-projects__search"
              style={s.search}
              placeholder="Search project name…"
              placeholderTextColor="#8AA3AD"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => void load({ search: query })}
              returnKeyType="search"
            />
            {loading && projects.length === 0 ? (
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
            {!loading && !error && projects.length === 0 ? (
              <Text style={s.meta} testID="owner-tenant-all-projects__empty">
                No projects matched.
              </Text>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`owner-tenant-all-projects__row_${item.id}`}
            style={s.card}
            onPress={() => {
              if (!item.companyId) return;
              navigateTenant(navigation, "ProjectSummary", {
                companyId: item.companyId,
                companyName: item.companyName ?? "Company",
                projectId: item.id,
                projectName: item.name,
              });
            }}
          >
            <Text style={s.cardTitle}>{item.name}</Text>
            <Text style={s.cardSub}>
              {item.taskCount} tasks · {item.memberCount} members
              {item.companyName ? ` · ${item.companyName}` : ""}
            </Text>
            <Text style={s.rowMeta}>{item.status}{item.location ? ` · ${item.location}` : ""}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
