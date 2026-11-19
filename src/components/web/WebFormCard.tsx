import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type Field = {
  key: string;
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
};

type Props = {
  title: string;
  fields: Field[];
  onChange: (key: string, value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  busy?: boolean;
  error?: string | null;
  testID?: string;
  extra?: React.ReactNode;
};

export function WebFormCard({
  title,
  fields,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  busy,
  error,
  testID,
  extra,
}: Props) {
  return (
    <View style={styles.card} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      {fields.map((field) => (
        <View key={field.key} style={styles.field}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput
            testID={testID ? `${testID}__${field.key}` : undefined}
            style={[styles.input, field.multiline ? styles.multiline : null]}
            value={field.value}
            onChangeText={(v) => onChange(field.key, v)}
            placeholder={field.placeholder}
            placeholderTextColor="#9CA3AF"
            multiline={field.multiline}
          />
        </View>
      ))}
      {extra}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        {onCancel ? (
          <Pressable testID={testID ? `${testID}__cancel` : undefined} onPress={onCancel} style={styles.secondary}>
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
        ) : null}
        <Pressable
          testID={testID ? `${testID}__submit` : undefined}
          onPress={onSubmit}
          disabled={busy}
          style={[styles.primary, busy ? styles.disabled : null]}
        >
          <Text style={styles.primaryText}>{busy ? "Saving…" : submitLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D6E9EE",
    padding: 16,
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#07111E", marginBottom: 12 },
  field: { marginBottom: 10 },
  label: { fontSize: 12, fontWeight: "600", color: "#577783", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#D6E9EE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#07111E",
    backgroundColor: "#F8FCFD",
  },
  multiline: { minHeight: 72, textAlignVertical: "top" },
  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, gap: 8 },
  primary: {
    backgroundColor: "#0D6E87",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  secondary: {
    borderWidth: 1,
    borderColor: "#D6E9EE",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryText: { color: "#07111E", fontWeight: "600", fontSize: 13 },
  disabled: { opacity: 0.6 },
  error: { color: "#DC2626", marginBottom: 8, fontSize: 13 },
});
