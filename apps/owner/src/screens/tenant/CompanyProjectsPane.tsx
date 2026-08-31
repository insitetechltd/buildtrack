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
  fetchProjectList,
  OwnerTenantError,
  type ProjectListItem,
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

export default function CompanyProjectsPane({ companyId, companyName, navigation }: Props) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
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
        const result = await fetchProjectList(supabase, companyId);
        setProjects(result.projects);
        setTruncated(result.truncated);
      } catch (err) {
        setProjects([]);
        setError(err instanceof OwnerTenantError ? err.message : "Could not load projects");
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
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q) ||
        (p.location ?? "").toLowerCase().includes(q),
    );
  }, [projects, query]);

  return (
    <FlatList
      style={s.contentFlex}
      contentContainerStyle={[s.scroll, { paddingTop: 0 }]}
      data={filtered}
      keyExtractor={(item) => item.id}
      testID="owner-tenant-company-detail__projects_pane"
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
                testID="owner-tenant-projects__search"
                style={s.paneSearchInput}
                placeholder="Search projects…"
                placeholderTextColor="#8AA3AD"
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
          </View>
          <Text style={s.paneCountCaption}>
            {filtered.length}
            {filtered.length !== projects.length ? ` of ${projects.length}` : ""} projects
          </Text>
          {truncated ? <Text style={s.meta}>Showing first 100 projects.</Text> : null}
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
        </>
      }
      renderItem={({ item }) => {
        const active = !/closed|complete|archived/i.test(item.status);
        return (
          <Pressable
            testID={`owner-tenant-projects__row_${item.id}`}
            style={s.paneListCard}
            onPress={() =>
              navigateTenant(navigation, "ProjectSummary", {
                companyId,
                companyName,
                projectId: item.id,
                projectName: item.name,
              })
            }
          >
            <View style={s.paneIconTile}>
              <Ionicons name="business-outline" size={22} color="#0A556B" />
            </View>
            <View style={s.paneListBody}>
              <Text style={s.cardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={s.paneRowMetaLine}>
                <View style={[s.paneStatusDot, !active ? s.paneStatusDotMuted : null]} />
                <Text style={s.cardSub} numberOfLines={1}>
                  {item.status} · {item.memberCount} members
                </Text>
              </View>
              {item.location ? (
                <View style={s.paneRowMetaLine}>
                  <Ionicons name="location-outline" size={12} color="#8AA3AD" />
                  <Text style={s.rowMeta} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={s.paneListBadge}>
              <Text style={s.paneListBadgeText}>{item.taskCount} tasks</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8AA3AD" />
          </Pressable>
        );
      }}
      ListEmptyComponent={
        !loading && !error ? (
          <Text style={s.meta}>{query.trim() ? "No matching projects." : "No projects."}</Text>
        ) : null
      }
    />
  );
}
