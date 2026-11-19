import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useAuthStore } from "./src/state/authStore";
import ThemeRoot from "./src/theme/ThemeRoot";
import WebApp from "./src/webRouter";

/**
 * Web entry (Metro resolves App.web.tsx when platform=web).
 * Intentionally does NOT import AppNavigator / mobile screens — those pull
 * `openai` and crash the classic <script> bundle via React Refresh TDZ
 * (`ChatCompletionStoreMessagesPage` before initialization → blank page).
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
      }
    };

    const timeoutId = setTimeout(() => {
      const { isLoading } = useAuthStore.getState();
      if (isLoading) {
        console.warn("Auth initialization timeout - forcing loading to false");
        useAuthStore.setState({ isLoading: false });
      }
    }, 10000);

    void initAuth();
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeRoot>
          <WebApp />
        </ThemeRoot>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
