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

import {
  fetchTaskDetail,
  OwnerTenantError,
  type TaskDetail,
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

type Props = NativeStackScreenProps<OwnerStackParamList, "TaskDetail">;

function FactRow({
  icon,
  label,
  value,
  first,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  first?: boolean;
}) {
  return (
    <View style={[s.factRow, first ? s.factRowFirst : null]}>
      <View style={s.factRowIcon}>
        <Ionicons name={icon} size={20} color="#0A556B" />
      </View>
      <View style={s.factRowBody}>
        <Text style={s.factRowLabel}>{label}</Text>
        <Text style={s.factRowValue}>{value}</Text>
      </View>
    </View>
  );
}

function formatWhen(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function TaskDetailScreen({ navigation, route }: Props) {
  const { companyId, companyName, taskId, taskTitle } = route.params;
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      setError(null);
      try {
        setDetail(await fetchTaskDetail(supabase, taskId, companyId));
      } catch (err) {
        setDetail(null);
        setError(err instanceof OwnerTenantError ? err.message : "Could not load task");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, taskId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const task = detail?.task;

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-tenant-task-detail__root">
      <TenantScreenHeader
        title={task?.title ?? taskTitle}
        onBack={() => goBackTenant(navigation)}
        onHome={() => resetToTenantHome(navigation)}
        backTestID="owner-tenant-task-detail__back"
        homeTestID="owner-tenant-task-detail__home"
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
        {task ? (
          <>
            <View style={s.detailHero}>
              <View style={s.detailHeroRow}>
                <View style={s.deckHeroLogo}>
                  <Ionicons name="layers-outline" size={24} color="#0A556B" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.detailHeroTitle} numberOfLines={3}>
                    {task.title}
                  </Text>
                  <View style={[s.deckHeroActiveBadge, { alignSelf: "flex-start", marginTop: 8 }]}>
                    <Text style={s.deckHeroActiveText}>{task.status.replace(/_/g, " ")}</Text>
                  </View>
                </View>
              </View>
              <Text style={s.detailHeroSub}>
                {task.projectName} · {task.completionPercentage}% complete
              </Text>
            </View>

            <View style={s.factSection}>
              <Text style={s.factSectionCaption}>Task</Text>
              <View style={s.factSheet}>
                <FactRow first icon="flag-outline" label="Priority" value={task.priority} />
                <FactRow icon="calendar-outline" label="Due" value={formatWhen(task.dueDate)} />
                <FactRow
                  icon="person-outline"
                  label="Primary assignee"
                  value={task.primaryAssigneeName ?? "Unassigned"}
                />
                <FactRow
                  icon="people-outline"
                  label="Assignees"
                  value={`${task.assigneeCount} active`}
                />
                {task.locationOnSite ? (
                  <FactRow icon="location-outline" label="On site" value={task.locationOnSite} />
                ) : null}
                {task.tags.length > 0 ? (
                  <FactRow icon="pricetag-outline" label="Tags" value={task.tags.join(", ")} />
                ) : null}
                {task.description ? (
                  <FactRow icon="document-text-outline" label="Description" value={task.description} />
                ) : null}
              </View>
            </View>

            <Text style={s.factSectionCaption}>Open</Text>
            <Pressable
              style={s.destCard}
              testID="owner-tenant-task-detail__open_project"
              onPress={() =>
                navigateTenant(navigation, "ProjectSummary", {
                  companyId,
                  companyName,
                  projectId: task.projectId,
                  projectName: task.projectName,
                })
              }
            >
              <View style={s.factRowIcon}>
                <Ionicons name="business-outline" size={22} color="#0A556B" />
              </View>
              <View style={s.destCardBody}>
                <Text style={s.destCardLabel}>Project</Text>
                <Text style={s.destCardValue}>{task.projectName}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#8AA3AD" />
            </Pressable>
            <Pressable
              style={s.destCard}
              testID="owner-tenant-task-detail__open_company"
              onPress={() =>
                popToTenantScreen(navigation, "CompanyDetail", { companyId, companyName })
              }
            >
              <View style={s.factRowIcon}>
                <Ionicons name="briefcase-outline" size={22} color="#0A556B" />
              </View>
              <View style={s.destCardBody}>
                <Text style={s.destCardLabel}>Company</Text>
                <Text style={s.destCardValue}>{companyName}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#8AA3AD" />
            </Pressable>

            {detail.recentActivities.length > 0 ? (
              <View style={[s.factSection, { marginTop: 8 }]}>
                <Text style={s.factSectionCaption}>Recent activity</Text>
                <View style={s.factSheet} testID="owner-tenant-task-detail__activities">
                  {detail.recentActivities.map((activity, index) => (
                    <View
                      key={activity.id}
                      style={[s.factRow, index === 0 ? s.factRowFirst : null]}
                    >
                      <View style={s.factRowIcon}>
                        <Ionicons name="time-outline" size={20} color="#0A556B" />
                      </View>
                      <View style={s.factRowBody}>
                        <Text style={s.factRowLabel}>
                          {activity.activityType.replace(/_/g, " ")} · {activity.userName}
                        </Text>
                        <Text style={s.factRowValue}>
                          {activity.description?.trim() ||
                            formatWhen(activity.timestamp)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={s.factFootnote}>
              <Ionicons name="information-circle-outline" size={18} color="#8AA3AD" />
              <Text style={s.factFootnoteText}>
                Read-only operator view. Field users create and update tasks in Taskr.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
