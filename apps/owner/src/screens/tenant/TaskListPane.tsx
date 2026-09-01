import React, { useCallback, useRef, useState } from "react";
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
  fetchTaskList,
  ownerTenantErrorMessage,
  type TaskListItem,
} from "../../lib/fetchOwnerTenantRead";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { navigateTenant } from "../../navigation/tenantNavigation";
import { tenantStyles as s } from "./tenantScreenStyles";
import {
  TASK_LIST_SEARCH_ACCESSIBILITY_LABEL,
  TASK_LIST_SEARCH_PLACEHOLDER,
  taskListSearchFetchQuery,
} from "./taskListSearch";

export type TaskListScope = {
  companyId: string;
  companyName: string;
  projectId?: string;
  userId?: string;
};

type Props = {
  scope: TaskListScope;
  navigation: NativeStackNavigationProp<OwnerStackParamList>;
  testID?: string;
  /** Show project name on each row (company-wide lists). */
  showProjectColumn?: boolean;
};

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function relationLabel(role: string): string {
  if (role === "assigner") return "Assigner";
  if (role === "assignee") return "Assignee";
  if (role === "delegate") return "Delegate";
  return role;
}

export default function TaskListPane({
  scope,
  navigation,
  testID = "owner-tenant-task-list__root",
  showProjectColumn = true,
}: Props) {
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const submittedQueryRef = useRef("");

  const load = useCallback(
    async (opts?: { soft?: boolean; search?: string }) => {
      if (!opts?.soft) setLoading(true);
      setError(null);
      const search =
        opts?.search !== undefined ? opts.search : submittedQueryRef.current;
      if (opts?.search !== undefined) {
        submittedQueryRef.current = opts.search;
      }
      try {
        const result = await fetchTaskList(supabase, {
          companyId: scope.companyId,
          projectId: scope.projectId,
          userId: scope.userId,
          query: search,
          limit: 50,
        });
        setTasks(result.tasks);
        setTotal(result.total);
        setTruncated(result.truncated);
      } catch (err) {
        setTasks([]);
        setTotal(0);
        setError(ownerTenantErrorMessage(err, "Could not load tasks"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [scope.companyId, scope.projectId, scope.userId],
  );

  React.useEffect(() => {
    const next = taskListSearchFetchQuery({
      type: "mount",
      draft: query,
      submitted: submittedQueryRef.current,
    });
    setQuery(next.nextDraft);
    submittedQueryRef.current = next.nextSubmitted;
    if (next.fetchQuery !== null) {
      void load({ search: next.fetchQuery });
    }
  }, [load]);

  const onChangeQuery = (text: string) => {
    const next = taskListSearchFetchQuery({
      type: "type",
      draft: text,
      submitted: submittedQueryRef.current,
    });
    setQuery(next.nextDraft);
    submittedQueryRef.current = next.nextSubmitted;
    if (next.fetchQuery !== null) {
      void load({ search: next.fetchQuery });
    }
  };

  const onSubmitQuery = () => {
    const next = taskListSearchFetchQuery({
      type: "submit",
      draft: query,
      submitted: submittedQueryRef.current,
    });
    submittedQueryRef.current = next.nextSubmitted;
    if (next.fetchQuery !== null) {
      void load({ search: next.fetchQuery });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    const next = taskListSearchFetchQuery({
      type: "refresh",
      draft: query,
      submitted: submittedQueryRef.current,
    });
    if (next.fetchQuery !== null) {
      void load({ soft: true, search: next.fetchQuery });
    } else {
      setRefreshing(false);
    }
  };

  return (
    <FlatList
      style={s.contentFlex}
      contentContainerStyle={[s.scroll, { paddingTop: 0 }]}
      data={tasks}
      keyExtractor={(item) => item.id}
      testID={testID}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#0A556B"
        />
      }
      ListHeaderComponent={
        <>
          <View style={s.paneSearchRow}>
            <View style={s.paneSearch}>
              <Ionicons name="search-outline" size={18} color="#8AA3AD" />
              <TextInput
                testID={`${testID}__search`}
                style={s.paneSearchInput}
                placeholder={TASK_LIST_SEARCH_PLACEHOLDER}
                placeholderTextColor="#8AA3AD"
                accessibilityLabel={TASK_LIST_SEARCH_ACCESSIBILITY_LABEL}
                value={query}
                onChangeText={onChangeQuery}
                onSubmitEditing={onSubmitQuery}
                returnKeyType="search"
              />
            </View>
          </View>
          <Text style={s.paneCountCaption}>
            {total} task{total === 1 ? "" : "s"}
            {truncated ? " · first page" : ""}
          </Text>
          {loading && tasks.length === 0 ? (
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
        const active = !/cancelled|archived|approved/i.test(item.status);
        return (
          <Pressable
            testID={`${testID}__row_${item.id}`}
            style={s.paneListCard}
            onPress={() =>
              navigateTenant(navigation, "TaskDetail", {
                companyId: scope.companyId,
                companyName: scope.companyName,
                taskId: item.id,
                taskTitle: item.title,
              })
            }
          >
            <View style={s.paneIconTile}>
              <Ionicons name="layers-outline" size={22} color="#0A556B" />
            </View>
            <View style={s.paneListBody}>
              <Text style={s.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={s.paneRowMetaLine}>
                <View style={[s.paneStatusDot, !active ? s.paneStatusDotMuted : null]} />
                <Text style={s.cardSub} numberOfLines={1}>
                  {statusLabel(item.status)} · {item.completionPercentage}%
                </Text>
              </View>
              {showProjectColumn ? (
                <Text style={s.rowMeta} numberOfLines={1}>
                  {item.projectName}
                  {item.primaryAssigneeName ? ` · ${item.primaryAssigneeName}` : ""}
                </Text>
              ) : item.primaryAssigneeName ? (
                <Text style={s.rowMeta} numberOfLines={1}>
                  {item.primaryAssigneeName}
                </Text>
              ) : null}
              {item.relationRoles && item.relationRoles.length > 0 ? (
                <Text style={s.rowMeta} numberOfLines={1}>
                  {item.relationRoles.map(relationLabel).join(" · ")}
                </Text>
              ) : null}
            </View>
            <View style={s.paneListBadge}>
              <Text style={s.paneListBadgeText}>{item.priority}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8AA3AD" />
          </Pressable>
        );
      }}
      ListEmptyComponent={
        !loading && !error ? (
          <Text style={s.meta} testID={`${testID}__empty`}>
            No tasks matched.
          </Text>
        ) : null
      }
    />
  );
}
