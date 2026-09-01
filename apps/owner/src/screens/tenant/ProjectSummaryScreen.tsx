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
import { Ionicons } from "@expo/vector-icons";

import StatusCountBars from "../../components/StatusCountBars";
import {
  fetchProjectDetail,
  fetchProjectMembers,
  OwnerTenantError,
  type ProjectDetail,
} from "../../lib/fetchOwnerTenantRead";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import {
  goBackTenant,
  navigateTenant,
  popToTenantScreen,
  resetToTenantHome,
} from "../../navigation/tenantNavigation";
import TenantScreenHeader from "./TenantScreenHeader";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "ProjectSummary">;

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

export default function ProjectSummaryScreen({ navigation, route }: Props) {
  const { companyId, companyName, projectId, projectName } = route.params;
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      setError(null);
      try {
        const [projectDetail, membersResult] = await Promise.all([
          fetchProjectDetail(supabase, projectId, companyId),
          fetchProjectMembers(supabase, projectId, companyId).catch(() => null),
        ]);
        setDetail(projectDetail);
        setMemberCount(membersResult?.members.length ?? null);
      } catch (err) {
        setDetail(null);
        setMemberCount(null);
        setError(err instanceof OwnerTenantError ? err.message : "Could not load project");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, projectId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView
      style={s.safe}
      edges={["top", "bottom"]}
      testID="owner-tenant-project-summary__root"
    >
      <TenantScreenHeader
        title={projectName}
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
                <View style={s.deckHeroLogo}>
                  <Ionicons name="business-outline" size={24} color="#0A556B" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.detailHeroTitle} numberOfLines={2}>
                    {detail.project.name}
                  </Text>
                  <View style={[s.deckHeroActiveBadge, { alignSelf: "flex-start", marginTop: 8 }]}>
                    <Text style={s.deckHeroActiveText}>{detail.project.status}</Text>
                  </View>
                </View>
              </View>
              {detail.project.location ? (
                <View style={[s.deckHeroContactRow, { marginTop: 12 }]}>
                  <Ionicons name="location-outline" size={14} color="#C8E6EF" />
                  <Text style={s.deckHeroContact}>{detail.project.location}</Text>
                </View>
              ) : null}
              {detail.project.description ? (
                <Text style={s.detailHeroSub} numberOfLines={4}>
                  {detail.project.description}
                </Text>
              ) : null}
            </View>

            <Text style={s.factSectionCaption}>Open</Text>
            <DestRow
              icon="people-outline"
              label="Members"
              value={memberCount == null ? "…" : `${memberCount}`}
              testID="owner-tenant-project-summary__stat_members"
              onPress={() =>
                navigateTenant(navigation, "ProjectMembers", {
                  companyId,
                  companyName,
                  projectId,
                  projectName,
                })
              }
            />
            <DestRow
              icon="layers-outline"
              label="Tasks"
              value={`${detail.taskTotal}`}
              testID="owner-tenant-project-summary__stat_tasks"
              onPress={() =>
                navigateTenant(navigation, "EntityList", {
                  entity: "tasks",
                  companyId,
                  companyName,
                  projectId,
                  projectName,
                })
              }
            />
            <DestRow
              icon="business-outline"
              label="Company"
              value={companyName}
              testID="owner-tenant-project-summary__stat_company"
              onPress={() =>
                popToTenantScreen(navigation, "CompanyDetail", { companyId, companyName })
              }
            />

            <View style={[s.factSection, { marginTop: 8 }]}>
              <Text style={s.factSectionCaption}>Tasks by status</Text>
              <View style={s.factSheet} testID="owner-tenant-project-summary__status_bars">
                <View style={{ padding: 14 }}>
                  <StatusCountBars
                    tasksByStatus={detail.tasksByStatus}
                    testID="owner-tenant-project-summary__histogram"
                  />
                </View>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
