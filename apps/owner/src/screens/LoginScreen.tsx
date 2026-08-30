import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase, supabaseConfigured } from "../lib/supabase";

type Props = {
  onSignedIn: () => void;
};

export default function LoginScreen({ onSignedIn }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!supabaseConfigured || !supabase) {
      setError("Missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY");
      return;
    }
    setBusy(true);
    try {
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      onSignedIn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root} testID="owner-login__root">
      <Text style={styles.brand}>HQ</Text>
      <Text style={styles.sub}>M-OPS-03 · Internal only</Text>
      <TextInput
        testID="owner-login__email"
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        testID="owner-login__password"
        style={styles.input}
        secureTextEntry
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        testID="owner-login__submit"
        style={[styles.button, busy && styles.buttonDisabled]}
        disabled={busy}
        onPress={() => {
          void onSubmit();
        }}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign in</Text>
        )}
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
  brand: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0A556B",
    letterSpacing: 1,
  },
  sub: {
    marginTop: 6,
    marginBottom: 28,
    color: "#577783",
    fontSize: 14,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#C8E6EF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#0A556B",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  error: { color: "#B42318", marginBottom: 8, fontSize: 14 },
});
