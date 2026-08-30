import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  onSignOut: () => void;
};

export default function DeniedScreen({ onSignOut }: Props) {
  return (
    <View style={styles.root} testID="owner-denied__root">
      <Text style={styles.title}>Not an owner account</Text>
      <Text style={styles.body}>
        HQ is allowlisted for platform operators only. Sign out and use
        Taskr for field work.
      </Text>
      <Pressable testID="owner-denied__signout" style={styles.button} onPress={onSignOut}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#E7F4F8",
    padding: 24,
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#0D2630", marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 22, color: "#577783", marginBottom: 24 },
  button: {
    backgroundColor: "#0A556B",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
