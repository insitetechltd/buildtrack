import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Navigate } from "react-router-dom";

import { useAuthStore } from "@/state/authStore";
import { defaultWebPathAfterLogin } from "@/web/access";

export function WebLoginScreen() {
  const { login, isLoading, isAuthenticated, user } = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated && user) {
    return <Navigate to={defaultWebPathAfterLogin(user)} replace />;
  }

  async function handleSubmit() {
    setError(null);
    if (!identifier.trim()) {
      setError("Email or phone is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    const ok = await login(identifier.trim(), password);
    if (!ok) {
      setError("Invalid credentials. Please try again.");
    }
  }

  return (
    <View style={styles.page} testID="web-login">
      <View style={styles.card}>
        <Text style={styles.title}>Taskr Web</Text>
        <Text style={styles.subtitle}>Company & project desk — localhost spike</Text>
        <TextInput
          testID="web-login-identifier"
          placeholder="Email or phone"
          placeholderTextColor="#8FA3AD"
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          value={identifier}
          onChangeText={setIdentifier}
        />
        <TextInput
          testID="web-login-password"
          placeholder="Password"
          placeholderTextColor="#8FA3AD"
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleSubmit}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          testID="web-login-submit"
          style={[styles.btn, isLoading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnText}>Sign In</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#08576E",
    padding: 24,
  },
  card: {
    width: 420,
    maxWidth: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 32,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#07111E", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#577783", marginBottom: 28 },
  input: {
    height: 48,
    backgroundColor: "#F4FAFC",
    borderWidth: 1,
    borderColor: "#C8E2EA",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    fontSize: 15,
    color: "#07111E",
  },
  btn: {
    marginTop: 8,
    backgroundColor: "#12A8E0",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  error: { color: "#DC2626", fontSize: 13, marginBottom: 8 },
});
