import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  createOwnerTenantUser,
  OwnerTenantWriteError,
} from "../../lib/fetchOwnerTenantWrite";
import { supabase } from "../../lib/supabase";
import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { goBackTenant } from "../../navigation/tenantNavigation";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "CreateUser">;

export default function CreateUserScreen({ navigation, route }: Props) {
  const { companyId, companyName } = route.params;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [seatClass, setSeatClass] = useState<"pm" | "worker">("worker");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const created = await createOwnerTenantUser(supabase, {
        companyId,
        name: name.trim(),
        email: email.trim(),
        seatClass,
      });
      Alert.alert("User created", `${created.name} · ${created.email}`, [
        {
          text: "OK",
          onPress: () => goBackTenant(navigation),
        },
      ]);
    } catch (err) {
      setError(
        err instanceof OwnerTenantWriteError
          ? err.message
          : "Could not create user",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-tenant-create-user__root">
      <View style={s.header}>
        <Pressable onPress={() => goBackTenant(navigation)} style={s.back}>
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <Text style={s.title} numberOfLines={1}>Add user</Text>
        <View style={s.backSpacer} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.banner}>
          <Text style={s.bannerText}>
            {companyName} · company bound at create only. No company switch later.
          </Text>
        </View>
        <Text style={styles.label}>Name</Text>
        <TextInput
          testID="owner-tenant-create-user__name"
          style={styles.input}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          placeholder="Full name"
        />
        <Text style={styles.label}>Email</Text>
        <TextInput
          testID="owner-tenant-create-user__email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          placeholder="user@company.com"
        />
        <Text style={styles.label}>Seat</Text>
        <View style={styles.seatRow}>
          {(["worker", "pm"] as const).map((seat) => (
            <Pressable
              key={seat}
              testID={`owner-tenant-create-user__seat_${seat}`}
              onPress={() => setSeatClass(seat)}
              style={[styles.seatChip, seatClass === seat && styles.seatChipOn]}
            >
              <Text style={[styles.seatText, seatClass === seat && styles.seatTextOn]}>
                {seat === "pm" ? "PM" : "Worker"}
              </Text>
            </Pressable>
          ))}
        </View>
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}
        <Pressable
          testID="owner-tenant-create-user__submit"
          onPress={() => void submit()}
          disabled={submitting || !name.trim() || !email.trim()}
          style={[styles.submit, (submitting || !name.trim() || !email.trim()) && styles.submitDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Create user</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  label: {
    color: "#0A556B",
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  seatRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  seatChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  seatChipOn: { backgroundColor: "#0A556B", borderColor: "#0A556B" },
  seatText: { color: "#334155", fontWeight: "600" },
  seatTextOn: { color: "#fff" },
  submit: {
    backgroundColor: "#0A556B",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
