import React from "react";
import { StyleSheet, Text, View } from "react-native";

import KpiHistogram from "./KpiHistogram";
import type { OwnerKpiHistogram } from "../lib/fetchOwnerKpiSnapshot";

type Props = {
  tasksByStatus: Record<string, number>;
  testID?: string;
};

export default function StatusCountBars({ tasksByStatus, testID }: Props) {
  const buckets = Object.entries(tasksByStatus)
    .filter(([, count]) => count >= 0)
    .map(([status, count]) => ({
      start: status,
      label: status.replace(/_/g, " ").slice(0, 5),
      count,
    }));

  const histogram: OwnerKpiHistogram = { bucketUnit: "day", buckets };
  if (buckets.length === 0) {
    return <Text style={styles.empty}>No tasks</Text>;
  }
  return (
    <View testID={testID}>
      <KpiHistogram histogram={histogram} testID={testID ? `${testID}__bars` : undefined} hideUnit />
      <Text style={styles.caption}>Tasks by status (read-only)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { marginTop: 8, fontSize: 13, color: "#8AA3AD" },
  caption: { marginTop: 4, fontSize: 10, color: "#8AA3AD" },
});
