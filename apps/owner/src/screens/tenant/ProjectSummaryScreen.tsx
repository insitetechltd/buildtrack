import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import StatusCountBars from "../../components/StatusCountBars";
import {
  fetchProjectDetail,
  OwnerTenantError,
  type ProjectDetail,
} from "../../lib/fetchOwnerTenantRead";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "ProjectSummary">;

export default function ProjectSummaryScreen({ navigation, route }: Props) {
  const { companyId, companyName, projectId, projectName } = route.params;
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    setError(null);
    try {
      setDetail(await fetchProjectDetail(supabase, projectId, companyId));
    } catch (err) {
      setDetail(null);
      setError(err instanceof OwnerTenantError ? err.message : "Could not load project");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, projectId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-tenant-project-summary__root">
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <Text style={s.title} numberOfLines={1}>{projectName}</Text>
        <View style={s.backSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load({ soft: true }); }} tintColor="#0A556B" />
        }
      >
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
              <Text style={s.cardTitle}>{detail.project.name}</Text>
              <Text style={s.cardSub}>Status: {detail.project.status}</Text>
              {detail.project.location ? <Text style={s.rowMeta}>{detail.project.location}</Text> : null}
              {detail.project.description ? (
                <Text style={s.rowMeta}>{detail.project.description}</Text>
              ) : null}
              <Text style={s.rowMeta}>{detail.taskTotal} tasks total</Text>
            </View>
            <Pressable
              testID="owner-tenant-project-summary__company"
              style={s.linkCard}
              onPress={() =>
                navigation.navigate("CompanyDetail", {
                  companyId,
                  companyName,
                })
              }
            >
              <Text style={s.linkTitle}>Company</Text>
              <Text style={s.linkSub}>{companyName} · open company</Text>
            </Pressable>
            <Pressable
              testID="owner-tenant-project-summary__members"
              style={s.linkCard}
              onPress={() =>
                navigation.navigate("ProjectMembers", {
                  companyId,
                  companyName,
                  projectId,
                  projectName,
                })
              }
            >
              <Text style={s.linkTitle}>Members</Text>
              <Text style={s.linkSub}>Open assignees for this project</Text>
            </Pressable>
            <View style={s.card} testID="owner-tenant-project-summary__status_bars">
              <Text style={s.sectionTitle}>Tasks by status</Text>
              <StatusCountBars tasksByStatus={detail.tasksByStatus} testID="owner-tenant-project-summary__histogram" />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
