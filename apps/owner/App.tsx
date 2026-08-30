import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { isPlatformSuperuser } from "./src/config/platformSuperusers";
import { supabase, type Session } from "./src/lib/supabase";
import OwnerAppNavigator from "./src/navigation/OwnerAppNavigator";
import DeniedScreen from "./src/screens/DeniedScreen";
import LoginScreen from "./src/screens/LoginScreen";

type Gate = "loading" | "login" | "denied" | "home";

export default function App() {
  const [gate, setGate] = useState<Gate>("loading");
  const [session, setSession] = useState<Session | null>(null);

  const applySession = useCallback((next: Session | null) => {
    setSession(next);
    if (!next?.user) {
      setGate("login");
      return;
    }
    if (!isPlatformSuperuser(next.user)) {
      setGate("denied");
      return;
    }
    setGate("home");
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!supabase) {
      setGate("login");
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        applySession(data.session);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      applySession(next);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setSession(null);
    setGate("login");
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style={gate === "home" ? "light" : "dark"} />
      {gate === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#0A556B" />
        </View>
      ) : null}
      {gate === "login" ? (
        <LoginScreen onSignedIn={() => undefined} />
      ) : null}
      {gate === "denied" ? <DeniedScreen onSignOut={() => void signOut()} /> : null}
      {gate === "home" && session ? (
        <OwnerAppNavigator onSignOut={() => void signOut()} />
      ) : null}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7F4F8",
  },
});
