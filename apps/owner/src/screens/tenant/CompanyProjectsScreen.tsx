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
  fetchProjectList,
  OwnerTenantError,
  type ProjectListItem,
} from "../../lib/fetchOwnerTenantRead";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "CompanyProjects">;

export default function CompanyProjectsScreen({ navigation, route }: Props) {
  const { companyId, companyName } = route.params;
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
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
  }, [companyId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-tenant-projects__root">
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <Text style={s.title} numberOfLines={1}>Projects</Text>
        <View style={s.backSpacer} />
      </View>
      <FlatList
        contentContainerStyle={s.scroll}
        data={projects}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load({ soft: true }); }} tintColor="#0A556B" />
        }
        ListHeaderComponent={
          <>
            <View style={s.banner}>
              <Text style={s.bannerText}>{companyName}</Text>
            </View>
            {truncated ? <Text style={s.meta}>Showing first 100 projects.</Text> : null}
            {loading && projects.length === 0 ? (
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
            testID={`owner-tenant-projects__row_${item.id}`}
            style={s.card}
            onPress={() =>
              navigation.navigate("ProjectSummary", {
                companyId,
                companyName,
                projectId: item.id,
                projectName: item.name,
              })
            }
          >
            <Text style={s.cardTitle}>{item.name}</Text>
            <Text style={s.cardSub}>
              {item.status} · {item.taskCount} tasks
            </Text>
            {item.location ? <Text style={s.rowMeta}>{item.location}</Text> : null}
          </Pressable>
        )}
        ListEmptyComponent={!loading && !error ? <Text style={s.meta}>No projects.</Text> : null}
      />
    </SafeAreaView>
  );
}
