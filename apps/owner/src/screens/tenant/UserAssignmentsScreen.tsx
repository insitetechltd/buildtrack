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
  fetchUserDetail,
  OwnerTenantError,
  type UserDetail,
} from "../../lib/fetchOwnerTenantRead";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { navigateTenant, resetToTenantHome } from "../../navigation/tenantNavigation";
import TenantScreenHeader from "./TenantScreenHeader";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "UserAssignments">;

export default function UserAssignmentsScreen({ navigation, route }: Props) {
  const { companyId, companyName, userId, userName } = route.params;
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      setError(null);
      try {
        setDetail(await fetchUserDetail(supabase, userId, companyId));
      } catch (err) {
        setDetail(null);
        setError(err instanceof OwnerTenantError ? err.message : "Could not load assignments");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, userId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const assignments = detail?.assignments ?? [];

  return (
    <SafeAreaView
      style={s.safe}
      edges={["top", "bottom"]}
      testID="owner-tenant-user-assignments__root"
    >
      <TenantScreenHeader
        title="Projects"
        onHome={() => resetToTenantHome(navigation)}
      />
      <FlatList
        contentContainerStyle={s.scroll}
        data={assignments}
        keyExtractor={(item, i) => `${item.projectId ?? "p"}-${i}`}
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
                {userName} · {companyName}
              </Text>
            </View>
            {loading && assignments.length === 0 ? (
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
        renderItem={({ item, index }) => (
          <Pressable
            testID={`owner-tenant-user-assignments__row_${item.projectId ?? index}`}
            style={s.card}
            onPress={() => {
              if (!item.projectId) return;
              navigateTenant(navigation, "ProjectSummary", {
                companyId: detail?.user.companyId ?? companyId,
                companyName,
                projectId: item.projectId,
                projectName: item.projectName,
              });
            }}
          >
            <Text style={s.cardTitle}>{item.projectName}</Text>
            <Text style={s.cardSub}>
              {item.projectRole.replace(/_/g, " ")} · {item.projectStatus}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading && !error ? (
            <Text style={s.meta}>No active project assignments.</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
