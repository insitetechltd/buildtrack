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
  fetchProjectMembers,
  OwnerTenantError,
  type ProjectMemberItem,
} from "../../lib/fetchOwnerTenantRead";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "ProjectMembers">;

export default function ProjectMembersScreen({ navigation, route }: Props) {
  const { companyId, companyName, projectId, projectName } = route.params;
  const [members, setMembers] = useState<ProjectMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      setError(null);
      try {
        const result = await fetchProjectMembers(supabase, projectId, companyId);
        setMembers(result.members);
      } catch (err) {
        setMembers([]);
        setError(
          err instanceof OwnerTenantError ? err.message : "Could not load members",
        );
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
      testID="owner-tenant-project-members__root"
    >
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <Text style={s.title} numberOfLines={1}>
          Members
        </Text>
        <View style={s.backSpacer} />
      </View>
      <FlatList
        contentContainerStyle={s.scroll}
        data={members}
        keyExtractor={(item) => item.userId}
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
                Assignees on {projectName} · {companyName}
              </Text>
            </View>
            {loading && members.length === 0 ? (
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
            testID={`owner-tenant-project-members__row_${item.userId}`}
            style={s.card}
            onPress={() =>
              navigation.navigate("UserDetail", {
                companyId,
                companyName,
                userId: item.userId,
                userName: item.name,
              })
            }
          >
            <Text style={s.cardTitle}>{item.name}</Text>
            <Text style={s.cardSub}>
              {item.email} · {item.role} · {item.seatClass} seat
            </Text>
            {item.projectRole ? (
              <Text style={s.rowMeta}>
                Project role: {item.projectRole.replace(/_/g, " ")}
              </Text>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          !loading && !error ? (
            <Text style={s.meta}>No active members on this project.</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
