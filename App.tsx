import React, { useEffect } from "react";
import { Alert, Linking } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as ExpoLinking from "expo-linking";
import AppNavigator from "./src/navigation/AppNavigator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "./src/state/authStore";
import { autoBootstrapSprint7SandboxForMaestroIfNeeded } from "./src/test-utils/sprint7RuntimeSandbox";
import { parseInviteSignInUrl } from "./src/auth/inviteSignInLink";
import ThemeRoot from "./src/theme/ThemeRoot";

// VERSION CONTROL - Increment this to force a fresh app state
const APP_VERSION = "93.1";
const VERSION_KEY = "@app_version";

/** Keys that must survive a version bump (invite → Set Password depends on session). */
function shouldPreserveStorageKey(key: string): boolean {
  if (key === VERSION_KEY) return true;
  // supabase-js GoTrue session
  if (key.startsWith("sb-") && key.includes("auth-token")) return true;
  // Persisted auth gate flags (must_set_password path)
  if (key === "buildtrack-auth") return true;
  return false;
}

async function clearAppDataPreservingAuthSession(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const toRemove = keys.filter((key) => !shouldPreserveStorageKey(key));
  if (toRemove.length > 0) {
    await AsyncStorage.multiRemove(toRemove);
  }
  await AsyncStorage.setItem(VERSION_KEY, APP_VERSION);
}

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project. 
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}
*/

export default function App() {
  useEffect(() => {
    const initAuth = async () => {
      try {
        const authStore = useAuthStore.getState();
        if (authStore.initialize) {
          await authStore.initialize();
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        useAuthStore.setState({ isLoading: false });
      } finally {
        try {
          await autoBootstrapSprint7SandboxForMaestroIfNeeded();
        } catch (autoErr: any) {
          console.warn("Maestro auto-bootstrap error:", autoErr?.message ?? autoErr);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      const { isLoading } = useAuthStore.getState();
      if (isLoading) {
        console.warn("Auth initialization timeout - forcing loading to false");
        useAuthStore.setState({ isLoading: false });
      }
    }, 10000);

    initAuth();

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let consuming = false;

    const waitForAuthInit = async () => {
      if (useAuthStore.getState().isInitialized) {
        return;
      }
      await new Promise<void>((resolve) => {
        const unsub = useAuthStore.subscribe((state) => {
          if (state.isInitialized) {
            unsub();
            resolve();
          }
        });
        if (useAuthStore.getState().isInitialized) {
          unsub();
          resolve();
        }
      });
    };

    const consumeInviteUrl = (url: string | null | undefined) => {
      const parsed = parseInviteSignInUrl(url);
      if (!parsed || consuming) {
        return;
      }
      consuming = true;
      void (async () => {
        try {
          await waitForAuthInit();
          if (cancelled) {
            return;
          }
          console.log("[Invite] Consuming magic-link token…");
          const result = await useAuthStore
            .getState()
            .signInWithInviteToken(parsed.tokenHash);
          if (cancelled) {
            return;
          }
          if (!result.success) {
            console.warn("[Invite] sign-in failed:", result.error);
            Alert.alert(
              "Invite link failed",
              result.error ||
                "This login link is invalid or already used. Open the latest link from signup, or ask your admin for a new invite.",
            );
            return;
          }
          console.log("[Invite] Signed in — Set Password gate should show if required");
        } finally {
          consuming = false;
        }
      })();
    };

    // expo-linking is more reliable for cold-start custom schemes than RN Linking alone.
    void (async () => {
      const initial =
        (await ExpoLinking.getInitialURL()) || (await Linking.getInitialURL());
      consumeInviteUrl(initial);
      // iOS occasionally reports null on the first tick after a Safari → app redirect.
      if (!initial) {
        await new Promise((r) => setTimeout(r, 400));
        if (cancelled) return;
        const retry =
          (await ExpoLinking.getInitialURL()) || (await Linking.getInitialURL());
        consumeInviteUrl(retry);
      }
    })();

    const subscription = Linking.addEventListener("url", ({ url }) => {
      consumeInviteUrl(url);
    });
    const expoSub = ExpoLinking.addEventListener("url", ({ url }) => {
      consumeInviteUrl(url);
    });

    return () => {
      cancelled = true;
      subscription.remove();
      expoSub.remove();
    };
  }, []);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const storedVersion = await AsyncStorage.getItem(VERSION_KEY);

        if (storedVersion !== APP_VERSION) {
          console.log(
            `Version mismatch: ${storedVersion} -> ${APP_VERSION}. Clearing app data (preserving auth session)…`,
          );
          await clearAppDataPreservingAuthSession();
          console.log("Non-auth data cleared. Auth session preserved for invite / Set Password.");
        } else {
          console.log(`Version ${APP_VERSION} - App state is current`);
        }
      } catch (error) {
        console.error("Version check failed:", error);
      }
    };

    checkVersion();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeRoot>
          <AppNavigator />
        </ThemeRoot>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
