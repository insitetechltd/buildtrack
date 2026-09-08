import React from "react";
import { Pressable, Text, View } from "react-native";

import type { DashboardQueueDashboard } from "@/ui/contracts/viewAdapters";
import { cn } from "@/utils/cn";

/** Lane Tally Board type / color tokens. My + Team share equal weight (PM). */
export const QUEUE_TALLY_TOKENS = {
  sectionTitle: "#497080",
  columnHeader: "#497080",
  laneLabel: "#0D2630",
  liveCount: "#0D2630",
  zeroCount: "#8AA3AD",
  reviewUnderline: "#F59E0B",
  spine: "#0D6E87",
  divider: "#E7F4F8",
  border: "#C8E6EF",
  laneLabelPx: 20,
  columnHeaderPx: 18,
  countPx: 30,
} as const;

export type QueueOverviewNavigatePayload = {
  launchQueue: "my_queue" | "team_queue";
  launchBucket: "new" | "wip" | "review";
  launchSource: "activity_dashboard";
};

type QueueOverviewBoardProps = {
  model: DashboardQueueDashboard;
  sectionTitle?: string;
  /** Header above the lane label column (e.g. Queue / 佇列). */
  queueColumnHeader?: string;
  /** Short row labels keyed by queue id. Falls back to shortLaneLabel(group.title). */
  shortLaneLabels?: Partial<Record<"my_queue" | "team_queue", string>>;
  onCellPress: (payload: QueueOverviewNavigatePayload) => void;
};

function isZeroCount(countLabel: string) {
  return countLabel.trim() === "0";
}

/** "My Queue" → "My\\nQueue"; CJK without spaces breaks after first two characters. */
export function formatLaneLabel(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return trimmed;
  }
  const spaced = trimmed.split(/\s+/).filter(Boolean);
  if (spaced.length > 1) {
    return spaced.join("\n");
  }
  const chars = [...trimmed];
  if (chars.length >= 4) {
    return `${chars.slice(0, 2).join("")}\n${chars.slice(2).join("")}`;
  }
  return trimmed;
}

/** Table row label: first word / first CJK segment ("My Queue" → "My"). */
export function shortLaneLabel(title: string): string {
  const lines = formatLaneLabel(title).split("\n");
  return (lines[0] ?? title).trim();
}

function resolveShortLaneLabel(
  group: DashboardQueueDashboard["groups"][number],
  shortLaneLabels?: QueueOverviewBoardProps["shortLaneLabels"],
): string {
  const queue = group.cells[0]?.queue;
  if (queue && shortLaneLabels?.[queue]) {
    return shortLaneLabels[queue]!;
  }
  return shortLaneLabel(group.title);
}

export default function QueueOverviewBoard({
  model,
  sectionTitle = "Queue Overview",
  queueColumnHeader = "Queue",
  shortLaneLabels,
  onCellPress,
}: QueueOverviewBoardProps) {
  const columnHeaders =
    model.groups[0]?.cells.map((cell) => cell.title) ??
    (["New", "Doing", "Review"] as const);

  return (
    <View className="mb-5" testID="dashboard-screen__queue_dashboard">
      <Text
        className="mb-3 text-lg font-semibold uppercase tracking-wider"
        style={{ color: QUEUE_TALLY_TOKENS.sectionTitle }}
      >
        {sectionTitle}
      </Text>

      <View
        className="overflow-hidden rounded-2xl border bg-white"
        style={{ borderColor: QUEUE_TALLY_TOKENS.border }}
      >
        <View className="flex-row">
          <View
            testID="dashboard-screen__queue_spine"
            style={{ width: 4, backgroundColor: QUEUE_TALLY_TOKENS.spine }}
          />
          <View className="min-w-0 flex-1 px-2 pb-3 pt-2.5">
            <View className="mb-1 flex-row items-center">
              <View
                testID="dashboard-screen__queue_column_header"
                className="min-w-0 flex-1 items-center justify-center py-1"
              >
                <Text
                  className="text-center font-semibold"
                  style={{
                    color: QUEUE_TALLY_TOKENS.columnHeader,
                    fontSize: QUEUE_TALLY_TOKENS.columnHeaderPx,
                    lineHeight: QUEUE_TALLY_TOKENS.columnHeaderPx + 4,
                  }}
                >
                  {queueColumnHeader}
                </Text>
              </View>
              {columnHeaders.map((header) => (
                <View
                  key={header}
                  className="min-w-0 flex-1 items-center py-1"
                  style={{
                    borderLeftWidth: 1,
                    borderLeftColor: QUEUE_TALLY_TOKENS.divider,
                  }}
                >
                  <Text
                    className="font-semibold"
                    style={{
                      color: QUEUE_TALLY_TOKENS.columnHeader,
                      fontSize: QUEUE_TALLY_TOKENS.columnHeaderPx,
                      lineHeight: QUEUE_TALLY_TOKENS.columnHeaderPx + 4,
                    }}
                  >
                    {header}
                  </Text>
                </View>
              ))}
            </View>

            {model.groups.map((group, groupIndex) => (
              <View
                key={group.id}
                testID={`dashboard-screen__queue_lane_${group.id}`}
                className={cn("flex-row items-stretch", groupIndex > 0 && "border-t pt-1")}
                style={
                  groupIndex > 0
                    ? { borderTopColor: QUEUE_TALLY_TOKENS.divider }
                    : undefined
                }
              >
                <View
                  testID={`dashboard-screen__queue_lane_label_${group.id}`}
                  className="min-h-[56px] min-w-0 flex-1 items-center justify-center"
                >
                  <Text
                    className="text-center font-semibold"
                    style={{
                      color: QUEUE_TALLY_TOKENS.laneLabel,
                      fontSize: QUEUE_TALLY_TOKENS.laneLabelPx,
                      lineHeight: QUEUE_TALLY_TOKENS.laneLabelPx + 4,
                    }}
                  >
                    {resolveShortLaneLabel(group, shortLaneLabels)}
                  </Text>
                </View>

                {group.cells.map((cell) => {
                  const zero = isZeroCount(cell.countLabel);
                  const reviewHot = cell.bucket === "review" && !zero;
                  return (
                    <Pressable
                      key={cell.id}
                      testID={`dashboard-screen__queue_cell_${cell.queue}_${cell.bucket}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${group.title}, ${cell.title}, ${cell.countLabel}`}
                      hitSlop={8}
                      onPress={() =>
                        onCellPress({
                          launchQueue: cell.queue,
                          launchBucket: cell.bucket,
                          launchSource: "activity_dashboard",
                        })
                      }
                      className="min-h-[56px] min-w-0 flex-1 items-center justify-center py-2"
                      style={{
                        borderLeftWidth: 1,
                        borderLeftColor: QUEUE_TALLY_TOKENS.divider,
                      }}
                    >
                      <Text
                        className={cn("tabular-nums", zero ? "font-medium" : "font-semibold")}
                        style={{
                          fontSize: QUEUE_TALLY_TOKENS.countPx,
                          lineHeight: QUEUE_TALLY_TOKENS.countPx + 2,
                          color: zero
                            ? QUEUE_TALLY_TOKENS.zeroCount
                            : QUEUE_TALLY_TOKENS.liveCount,
                          borderBottomWidth: reviewHot ? 3 : 0,
                          borderBottomColor: reviewHot
                            ? QUEUE_TALLY_TOKENS.reviewUnderline
                            : "transparent",
                          paddingBottom: reviewHot ? 2 : 0,
                        }}
                      >
                        {cell.countLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
