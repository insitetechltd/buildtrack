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

import {
  fetchCompanyDetail,
  OwnerTenantError,
  type CompanyDetail,
} from "../../lib/fetchOwnerTenantRead";
import {
  fetchSupportSnapshot,
  type OwnerSupportSnapshot,
} from "../../lib/fetchOwnerOpsRead";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { goBackTenant, resetToTenantHome } from "../../navigation/tenantNavigation";
import CompanyHeroDeck from "./CompanyHeroDeck";
import CompanyOverviewPane from "./CompanyOverviewPane";
import CompanyProjectsPane from "./CompanyProjectsPane";
import CompanySegmentControl from "./CompanySegmentControl";
import CompanyTasksPane from "./CompanyTasksPane";
import CompanyUsersPane from "./CompanyUsersPane";
import {
  parseCompanyDetailSegment,
  type CompanyDetailSegment,
} from "./companyDetailSegments";
import TenantScreenHeader from "./TenantScreenHeader";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "CompanyDetail">;

export default function CompanyDetailScreen({ navigation, route }: Props) {
  const { companyId, companyName, initialSegment } = route.params;
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [support, setSupport] = useState<OwnerSupportSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<CompanyDetailSegment>(() =>
    parseCompanyDetailSegment(initialSegment),
  );

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      setError(null);
      try {
        const [d, supportSnap] = await Promise.all([
          fetchCompanyDetail(supabase, companyId),
          fetchSupportSnapshot(supabase, companyId).catch(() => null),
        ]);
        setDetail(d);
        setSupport(supportSnap);
      } catch (err) {
        setDetail(null);
        setError(err instanceof OwnerTenantError ? err.message : "Could not load company");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  React.useEffect(() => {
    if (initialSegment) {
      setSegment(parseCompanyDetailSegment(initialSegment));
    }
  }, [initialSegment]);

  const onSelectSegment = (next: CompanyDetailSegment) => {
    setSegment(next);
  };

  const heroVariant = segment === "overview" ? "full" : "compact";
  const compactFocus =
    segment === "users" ? "users" : segment === "tasks" ? "tasks" : "projects";

  const overviewContent = detail ? (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingTop: 0 }]}
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
      <CompanyOverviewPane detail={detail} support={support} onJumpSegment={onSelectSegment} />
    </ScrollView>
  ) : null;

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-tenant-company-detail__root">
      <TenantScreenHeader
        title={companyName}
        onBack={() => goBackTenant(navigation)}
        onHome={() => resetToTenantHome(navigation)}
        backTestID="owner-tenant-company-detail__back"
        homeTestID="owner-tenant-company-detail__home"
      />
      {loading && !detail ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#0A556B" />
        </View>
      ) : null}
      {error && !detail ? (
        <View style={[s.scroll, s.errorBox, { margin: 16 }]}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable onPress={() => void load()} style={s.retry}>
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {detail ? (
        <>
          <CompanyHeroDeck
            detail={detail}
            variant={heroVariant}
            compactFocus={compactFocus}
          />
          <CompanySegmentControl
            active={segment}
            projectCount={detail.stats.projects}
            userCount={detail.stats.users}
            onSelect={onSelectSegment}
          />
          {segment === "overview" ? overviewContent : null}
          {segment === "projects" ? (
            <CompanyProjectsPane
              key="projects"
              companyId={companyId}
              companyName={companyName}
              navigation={navigation}
            />
          ) : null}
          {segment === "users" ? (
            <CompanyUsersPane
              key="users"
              companyId={companyId}
              companyName={companyName}
              navigation={navigation}
            />
          ) : null}
          {segment === "tasks" ? (
            <ScrollView contentContainerStyle={s.scroll} key="tasks">
              <CompanyTasksPane />
            </ScrollView>
          ) : null}
        </>
      ) : null}
    </SafeAreaView>
  );
}
