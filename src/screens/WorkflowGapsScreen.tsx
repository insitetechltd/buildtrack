import React, { useCallback, useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import BrandHeaderTitle from "../components/BrandHeaderTitle";
import ModernScreenHeader from "../components/ModernScreenHeader";
import { useTaskStore } from "../state/taskStore.supabase";
import {
  classifyLoadedTaskWorkflowGaps,
  type TaskWorkflowGapResult,
} from "../utils/taskWorkflowGaps";

export type WorkflowGapsScreenProps = {
  onNavigateBack: () => void;
  onInspectTask: (taskId: string) => void;
};

function GapRow({
  item,
  onPress,
}: {
  item: TaskWorkflowGapResult;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`workflow-gaps__row_${item.taskId}`}
      onPress={onPress}
      className="mb-3 rounded-2xl border border-[#C8E6EF] bg-white px-4 py-3"
    >
      <Text className="text-base font-semibold text-[#0D2630]" numberOfLines={2}>
        {item.title}
      </Text>
      <Text className="mt-1 text-sm text-[#577783]">
        {item.status} · primary {item.primary}
      </Text>
      <Text className="mt-2 text-xs leading-5 text-[#497080]">
        {item.codes.join(" · ")}
      </Text>
    </Pressable>
  );
}

export default function WorkflowGapsScreen({
  onNavigateBack,
  onInspectTask,
}: WorkflowGapsScreenProps) {
  const tasks = useTaskStore((s) => s.tasks);

  const gaps = useMemo(
    () => classifyLoadedTaskWorkflowGaps(tasks ?? []),
    [tasks],
  );

  const renderItem = useCallback(
    ({ item }: { item: TaskWorkflowGapResult }) => (
      <GapRow item={item} onPress={() => onInspectTask(item.taskId)} />
    ),
    [onInspectTask],
  );

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      className="flex-1 bg-[#E7F4F8]"
      testID="workflow-gaps-screen__root"
    >
      <StatusBar style="light" />
      <ModernScreenHeader
        title="Workflow Gaps"
        titleNode={<BrandHeaderTitle label="WORKFLOW GAPS" subtitle="OWNER" />}
        showBackButton
        onBack={onNavigateBack}
      />
      <View className="border-b border-[#C8E6EF] bg-[#F8FCFF] px-4 py-3">
        <Text className="text-sm leading-5 text-[#577783]">
          Loaded tasks only — not a full-table audit. Soft-deleted rows are
          excluded. Tap a row to inspect.
        </Text>
        <Text
          testID="workflow-gaps-screen__count"
          className="mt-2 text-sm font-semibold text-[#0A556B]"
        >
          {gaps.length} gap{gaps.length === 1 ? "" : "s"}
        </Text>
      </View>
      <FlatList
        testID="workflow-gaps-screen__list"
        data={gaps}
        keyExtractor={(item) => item.taskId}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        renderItem={renderItem}
        ListEmptyComponent={
          <View className="rounded-2xl border border-dashed border-[#A8D3E0] bg-white px-4 py-6">
            <Text className="text-base leading-6 text-[#577783]">
              No workflow gaps in the currently loaded task store.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
