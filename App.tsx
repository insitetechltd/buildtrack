import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AppNavigator from "./src/navigation/AppNavigator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "./src/state/authStore";
import { autoBootstrapSprint7SandboxForMaestroIfNeeded } from "./src/test-utils/sprint7RuntimeSandbox";
import { parseInviteSignInUrl } from "./src/auth/inviteSignInLink";
import { Linking } from "react-native";
import ThemeRoot from "./src/theme/ThemeRoot";
import { useMediaLibraryWakeWarm } from "./src/utils/useMediaLibraryWakeWarm";

// VERSION CONTROL - Increment this to force a fresh app state
const APP_VERSION = "93.1";
const VERSION_KEY = "@app_version";

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project. 
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

🔥 REAL-TIME DATA SYNC - All users receive updates immediately! ✅
Last Updated: v13.0
*/

export default function App() {
  useMediaLibraryWakeWarm();

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

    const consumeInviteUrl = (url: string | null) => {
      const parsed = parseInviteSignInUrl(url);
      if (!parsed) {
        return;
      }
      void (async () => {
        await waitForAuthInit();
        if (cancelled) {
          return;
        }
        await useAuthStore.getState().signInWithInviteToken(parsed.tokenHash);
      })();
    };

    void Linking.getInitialURL().then((url) => consumeInviteUrl(url));
    const subscription = Linking.addEventListener("url", ({ url }) => {
      consumeInviteUrl(url);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const storedVersion = await AsyncStorage.getItem(VERSION_KEY);
        
        if (storedVersion !== APP_VERSION) {
          console.log(`Version mismatch: ${storedVersion} -> ${APP_VERSION}. Clearing all data...`);
          
          // Clear ALL AsyncStorage data except the version key
          await AsyncStorage.clear();
          await AsyncStorage.setItem(VERSION_KEY, APP_VERSION);
          
          console.log("Data cleared. App will now use fresh Supabase data.");
          
          // Force a re-render by reloading the app
          if (typeof window !== "undefined" && window.location) {
            window.location.reload();
          }
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

// FORCE RELOAD v12.0 - REAL-TIME DATA SYNC SYSTEM
