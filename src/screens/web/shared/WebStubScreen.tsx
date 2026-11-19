import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  note?: string;
  testID?: string;
};

/** Placeholder canvas until real M-WEB-01 screens land. */
export function WebStubScreen({ title, note, testID }: Props) {
  return (
    <View style={styles.root} testID={testID ?? "web-stub"}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>
        {note ??
          "Spike scaffold — real data screens land next on this branch."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#07111E", marginBottom: 8 },
  note: { fontSize: 14, color: "#577783", lineHeight: 20 },
});
