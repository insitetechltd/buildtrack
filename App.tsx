import React, { useEffect } from "react";
import { Alert, Linking } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as ExpoLinking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import AppNavigator from "./src/navigation/AppNavigator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "./src/state/authStore";
import { autoBootstrapSprint7SandboxForMaestroIfNeeded } from "./src/test-utils/sprint7RuntimeSandbox";
import {
  isInviteHandoffUrl,
  parseInviteSessionPayload,
  parseInviteSignInUrl,
} from "./src/auth/inviteSignInLink";
import ThemeRoot from "./src/theme/ThemeRoot";

// VERSION CONTROL - Increment this to force a fresh app state
const APP_VERSION = "93.2";
const VERSION_KEY = "@app_version";

/** Keys that must survive a version bump (invite → Set Password depends on session). */
function shouldPreserveStorageKey(key: string): boolean {
  if (key === VERSION_KEY) return true;
  if (key.startsWith("sb-") && key.includes("auth-token")) return true;
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

    const finishInvite = async (result: { success: boolean; error?: string }) => {
      if (cancelled) return;
      if (!result.success) {
        console.warn("[Invite] failed:", result.error);
        Alert.alert(
          "Invite link failed",
          result.error ||
            "This login link is invalid or already used. Open the latest link from signup.",
        );
      }
    };

    const consumeInviteUrl = (url: string | null | undefined) => {
      if (!url || consuming) {
        return;
      }

      const handoff = isInviteHandoffUrl(url);
      const parsed = parseInviteSignInUrl(url);
      if (!handoff && !parsed) {
        return;
      }

      consuming = true;
      void (async () => {
        try {
          await waitForAuthInit();
          if (cancelled) return;

          if (handoff) {
            console.log("[Invite] Reading session handoff from clipboard…");
            const raw = await Clipboard.getStringAsync();
            const session = parseInviteSessionPayload(raw);
            if (!session) {
              await finishInvite({
                success: false,
                error:
                  "Could not read the invite session. Return to the browser invite page, tap Open Taskr again, and allow paste if asked.",
              });
              return;
            }
            const result = await useAuthStore
              .getState()
              .acceptInviteSession(session);
            try {
              await Clipboard.setStringAsync("");
            } catch {
              // best-effort clear
            }
            await finishInvite(result);
            return;
          }

          if (parsed) {
            console.log("[Invite] Consuming magic-link token…");
            const result = await useAuthStore
              .getState()
              .signInWithInviteToken(parsed.tokenHash);
            await finishInvite(result);
          }
        } finally {
          consuming = false;
        }
      })();
    };

    void (async () => {
      const initial =
        (await ExpoLinking.getInitialURL()) || (await Linking.getInitialURL());
      consumeInviteUrl(initial);
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
