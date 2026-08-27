import React, { Component, useCallback, useEffect, useState } from "react";
import {
  Alert,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CaptureSessionModule,
  CAPTURE_SESSION_AB_KEY,
} from "../modules/captureSession";

type CaptureSessionSmokeScreenProps = {
  onClose: () => void;
};

type BoundaryProps = {
  onError: (message: string) => void;
  children: React.ReactNode;
};

type BoundaryState = { hasError: boolean };

class CaptureSessionErrorBoundary extends Component<
  BoundaryProps,
  BoundaryState
> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[CaptureSessionSmoke] render crash:", error);
    this.props.onError(error?.message || String(error));
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

/**
 * Dev-only host for headed smoke / A/B of {@link CaptureSessionModule}.
 * Does not replace production Camera tab capture-first flow.
 */
export default function CaptureSessionSmokeScreen({
  onClose,
}: CaptureSessionSmokeScreenProps) {
  const insets = useSafeAreaInsets();
  const [mountModule, setMountModule] = useState(false);
  const [crashMessage, setCrashMessage] = useState<string | null>(null);

  useEffect(() => {
    console.log("[CaptureSessionSmoke] screen mounted", CAPTURE_SESSION_AB_KEY);
    // Defer CameraView mount one frame so navigation transition completes first.
    const id = requestAnimationFrame(() => setMountModule(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleComplete = useCallback(
    (result: { photos: { uri: string; fileName: string }[] }) => {
      const count = result.photos.length;
      const names = result.photos
        .slice(0, 5)
        .map((p) => p.fileName)
        .join("\n");
      Alert.alert(
        "Capture session (smoke)",
        [
          `AB key: ${CAPTURE_SESSION_AB_KEY}`,
          `Selected: ${count}`,
          names || "(none)",
          "",
          "Production Camera path unchanged — this screen is Dev Settings only.",
        ].join("\n"),
        [{ text: "OK", onPress: onClose }],
      );
    },
    [onClose],
  );

  if (crashMessage) {
    return (
      <View
        style={[
          styles.fallback,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}
        testID="capture-session-smoke__crash"
      >
        <Text style={styles.fallbackTitle}>Capture session failed to open</Text>
        <Text style={styles.fallbackBody}>{crashMessage}</Text>
        <Text style={styles.fallbackHint}>
          If this mentions Camera / ExpoCamera, rebuild the native app so
          expo-camera is linked (JS reload alone is not enough).
        </Text>
        <Pressable
          testID="capture-session-smoke__close"
          onPress={onClose}
          style={styles.closeBtn}
        >
          <Text style={styles.closeBtnText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root} testID="capture-session-smoke__root">
      {!mountModule ? (
        <View style={styles.boot}>
          <ActivityIndicator color="#7DD3E8" size="large" />
          <Text style={styles.bootText}>Opening capture session…</Text>
        </View>
      ) : (
        <CaptureSessionErrorBoundary onError={setCrashMessage}>
          <CaptureSessionModule
            selectionLimit={20}
            onCancel={onClose}
            onComplete={handleComplete}
          />
        </CaptureSessionErrorBoundary>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  bootText: {
    color: "#ccc",
    fontSize: 15,
  },
  fallback: {
    flex: 1,
    backgroundColor: "#111",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  fallbackTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  fallbackBody: {
    color: "#f88",
    fontSize: 14,
    marginBottom: 12,
  },
  fallbackHint: {
    color: "#aaa",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  closeBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#08576E",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
