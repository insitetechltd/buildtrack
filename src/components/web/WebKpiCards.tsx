import React from "react";
import { StyleSheet, Text, View } from "react-native";

export type WebKpiTone = "default" | "danger" | "success" | "muted";

export function WebKpiTile({
  label,
  value,
  hint,
  tone = "default",
  testID,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: WebKpiTone;
  testID?: string;
}) {
  const valueColor =
    tone === "danger"
      ? "#B91C1C"
      : tone === "success"
        ? "#047857"
        : tone === "muted"
          ? "#8AA3AD"
          : "#07111E";
  const borderColor =
    tone === "danger"
      ? "#FECACA"
      : tone === "success"
        ? "#A7F3D0"
        : "#D6E9EE";
  const bg =
    tone === "danger"
      ? "#FEF2F2"
      : tone === "success"
        ? "#ECFDF5"
        : "#FFFFFF";

  return (
    <View
      testID={testID}
      style={[styles.tile, { borderColor, backgroundColor: bg }]}
    >
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function WebKpiSection({
  title,
  subtitle,
  children,
  testID,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <View testID={testID} style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      <View style={styles.row}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#497080",
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: "#577783",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    minWidth: 118,
    flexGrow: 1,
    flexBasis: 118,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  value: {
    fontSize: 26,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#577783",
  },
  hint: {
    marginTop: 2,
    fontSize: 11,
    color: "#8AA3AD",
  },
});
