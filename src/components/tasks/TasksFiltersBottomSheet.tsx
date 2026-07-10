import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Modal from "react-native-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import ModalHandle from "@/components/ModalHandle";
import type {
  TasksOverdueWindowValue,
  TasksQueueFilterValue,
  TasksStatusFilterValue,
} from "@/ui/contracts/viewAdapters";
import { cn } from "@/utils/cn";

interface TasksFiltersBottomSheetProps {
  visible: boolean;
  stagedQueue: TasksQueueFilterValue;
  stagedStatus: TasksStatusFilterValue;
  stagedOverdueWindow: TasksOverdueWindowValue;
  onClose: () => void;
  onResetAll: () => void;
  onApply: () => void;
  onStageQueue: (value: TasksQueueFilterValue) => void;
  onStageStatus: (value: TasksStatusFilterValue) => void;
  onStageOverdueWindow: (value: TasksOverdueWindowValue) => void;
}

interface FilterOptionProps {
  testID: string;
  label: string;
  selected: boolean;
  tone?: "default" | "navy" | "blue" | "orange" | "purple" | "red";
  onPress: () => void;
}

function getSelectedToneClasses(tone: NonNullable<FilterOptionProps["tone"]>) {
  switch (tone) {
    case "blue":
      return {
        container: "border-[#BFDBFE] bg-[#EFF6FF]",
        text: "text-[#1D4ED8]",
      };
    case "orange":
      return {
        container: "border-[#FED7AA] bg-[#FFF7ED]",
        text: "text-[#C2410C]",
      };
    case "purple":
      return {
        container: "border-[#E9D5FF] bg-[#FAF5FF]",
        text: "text-[#7E22CE]",
      };
    case "red":
      return {
        container: "border-[#FECACA] bg-[#FEF2F2]",
        text: "text-[#B91C1C]",
      };
    case "navy":
    case "default":
    default:
      return {
        container: "border-[#07111E] bg-[#07111E]",
        text: "text-white",
      };
  }
}

function FilterOption({ testID, label, selected, tone = "default", onPress }: FilterOptionProps) {
  const selectedTone = getSelectedToneClasses(tone);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      className={cn(
        "min-w-[104px] rounded-full border px-4 py-2.5",
        selected ? selectedTone.container : "border-slate-200 bg-white",
      )}
    >
      <Text className={cn("text-sm font-semibold", selected ? selectedTone.text : "text-slate-700")}>
        {label}
      </Text>
    </Pressable>
  );
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
}

function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <View className="mb-5">
      <Text className="mb-3 font-mono text-xs font-semibold uppercase tracking-[1.5px] text-slate-500">
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

export default function TasksFiltersBottomSheet(props: TasksFiltersBottomSheetProps) {
  return (
    <Modal
      isVisible={props.visible}
      onBackdropPress={props.onClose}
      onBackButtonPress={props.onClose}
      onSwipeComplete={props.onClose}
      swipeDirection={["down"]}
      propagateSwipe={true}
      style={{ margin: 0, justifyContent: "flex-end" }}
      backdropOpacity={0.36}
    >
      <SafeAreaView edges={["bottom"]} className="rounded-t-[28px] bg-white px-4 pt-2">
        <View testID="tasks-filters-sheet">
          <ModalHandle />
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[20px] font-bold text-[#07111E]">Filters</Text>
            <View className="flex-row items-center gap-3">
              <Pressable testID="tasks-filters-sheet__reset" onPress={props.onResetAll}>
                <Text className="text-sm font-semibold text-[#0D6E87]">Reset all</Text>
              </Pressable>
              <Pressable
                testID="tasks-filters-sheet__close"
                onPress={props.onClose}
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              >
                <Ionicons name="close" size={18} color="#334155" />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <FilterSection title="QUEUE">
              <FilterOption
                testID="tasks-filters-sheet__queue_all_queues"
                label="All queues"
                selected={props.stagedQueue === "all_queues"}
                tone="navy"
                onPress={() => props.onStageQueue("all_queues")}
              />
              <FilterOption
                testID="tasks-filters-sheet__queue_inbox"
                label="Inbox"
                selected={props.stagedQueue === "inbox"}
                tone="navy"
                onPress={() => props.onStageQueue("inbox")}
              />
              <FilterOption
                testID="tasks-filters-sheet__queue_outbox"
                label="Outbox"
                selected={props.stagedQueue === "outbox"}
                tone="navy"
                onPress={() => props.onStageQueue("outbox")}
              />
              <FilterOption
                testID="tasks-filters-sheet__queue_archived"
                label="Archived"
                selected={props.stagedQueue === "archived"}
                tone="navy"
                onPress={() => props.onStageQueue("archived")}
              />
            </FilterSection>

            <FilterSection title="STATUS">
              <FilterOption
                testID="tasks-filters-sheet__status_any_status"
                label="Any status"
                selected={props.stagedStatus === "any_status"}
                tone="navy"
                onPress={() => props.onStageStatus("any_status")}
              />
              <FilterOption
                testID="tasks-filters-sheet__status_new"
                label="New"
                selected={props.stagedStatus === "new"}
                tone="blue"
                onPress={() => props.onStageStatus("new")}
              />
              <FilterOption
                testID="tasks-filters-sheet__status_doing"
                label="Doing"
                selected={props.stagedStatus === "doing"}
                tone="orange"
                onPress={() => props.onStageStatus("doing")}
              />
              <FilterOption
                testID="tasks-filters-sheet__status_review"
                label="Review"
                selected={props.stagedStatus === "review"}
                tone="purple"
                onPress={() => props.onStageStatus("review")}
              />
              <FilterOption
                testID="tasks-filters-sheet__status_overdue"
                label="Overdue"
                selected={props.stagedStatus === "overdue"}
                tone="red"
                onPress={() => props.onStageStatus("overdue")}
              />
            </FilterSection>

            <FilterSection title="OVERDUE WINDOW">
              <FilterOption
                testID="tasks-filters-sheet__overdue_window_show_all"
                label="Show all"
                selected={props.stagedOverdueWindow === "show_all"}
                onPress={() => props.onStageOverdueWindow("show_all")}
              />
              <FilterOption
                testID="tasks-filters-sheet__overdue_window_three_active"
                label="3 active"
                selected={props.stagedOverdueWindow === "three_active"}
                onPress={() => props.onStageOverdueWindow("three_active")}
              />
              <FilterOption
                testID="tasks-filters-sheet__overdue_window_one_week"
                label="1 week"
                selected={props.stagedOverdueWindow === "one_week"}
                onPress={() => props.onStageOverdueWindow("one_week")}
              />
              <FilterOption
                testID="tasks-filters-sheet__overdue_window_one_month"
                label="1 month"
                selected={props.stagedOverdueWindow === "one_month"}
                onPress={() => props.onStageOverdueWindow("one_month")}
              />
            </FilterSection>
            <View className="h-2" />
          </ScrollView>

          <Pressable
            testID="tasks-filters-sheet__apply"
            onPress={props.onApply}
            className="mb-2 mt-4 rounded-2xl bg-[#07111E] px-4 py-4"
          >
            <Text className="text-center text-base font-bold text-white">Apply Filters</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
