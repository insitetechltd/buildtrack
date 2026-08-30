import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  title: string;
  body: string;
  testID: string;
  onBack: () => void;
};

export default function StubSectionScreen({ title, body, testID, onBack }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID={testID}>
      <View style={styles.header}>
        <Pressable testID={`${testID}__back`} onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.backSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.stubLabel}>Stub</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#E7F4F8" },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0A556B",
  },
  back: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    minWidth: 64,
  },
  backSpacer: { minWidth: 64 },
  backText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  title: { color: "#fff", fontWeight: "700", fontSize: 16 },
  scroll: { padding: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D5E8EF",
    backgroundColor: "#F4FAFC",
    padding: 16,
  },
  stubLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8AA3AD",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  body: { fontSize: 14, lineHeight: 20, color: "#577783" },
});
