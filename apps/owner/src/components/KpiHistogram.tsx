import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { OwnerKpiHistogram } from "../lib/fetchOwnerKpiSnapshot";

type Props = {
  histogram: OwnerKpiHistogram;
  testID?: string;
  hideUnit?: boolean;
};

const BAR_MAX_HEIGHT = 48;

function labelStride(bucketCount: number): number {
  if (bucketCount <= 7) return 1;
  if (bucketCount <= 12) return 2;
  return 5;
}

export default function KpiHistogram({ histogram, testID, hideUnit }: Props) {
  const maxCount = Math.max(1, ...histogram.buckets.map((b) => b.count));

  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.bars} testID={testID ? `${testID}__bars` : undefined}>
        {histogram.buckets.map((bucket, index) => {
          const height = bucket.count === 0 ? 2 : Math.max(4, (bucket.count / maxCount) * BAR_MAX_HEIGHT);
          return (
            <View key={`${bucket.start}-${index}`} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[styles.barFill, { height }]}
                  testID={testID ? `${testID}__bar_${index}` : undefined}
                />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {histogram.buckets.map((bucket, index) => {
          const stride = labelStride(histogram.buckets.length);
          const show =
            index === 0 ||
            index === histogram.buckets.length - 1 ||
            index % stride === 0;
          return (
            <View key={`${bucket.start}-label-${index}`} style={styles.labelCol}>
              <Text style={styles.labelText} numberOfLines={1}>
                {show ? bucket.label : " "}
              </Text>
            </View>
          );
        })}
      </View>
      {!hideUnit ? (
        <Text style={styles.unit}>
          {histogram.bucketUnit === "hour" ? "UTC hours" : "UTC days"}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: BAR_MAX_HEIGHT,
  },
  barCol: { flex: 1, minWidth: 2 },
  barTrack: {
    flex: 1,
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: 3,
    backgroundColor: "#0A556B",
    minHeight: 2,
  },
  labels: {
    flexDirection: "row",
    gap: 2,
    marginTop: 4,
  },
  labelCol: { flex: 1, minWidth: 2 },
  labelText: {
    fontSize: 8,
    color: "#8AA3AD",
    textAlign: "center",
  },
  unit: {
    marginTop: 4,
    fontSize: 10,
    color: "#8AA3AD",
  },
});
