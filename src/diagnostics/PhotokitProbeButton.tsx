import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import {
  probePhotokitRequestOptions,
  previewPhotokitNewestIds,
} from "../modules/mediaLibrary/PhotokitThumbView";

/**
 * Floating diagnostic button for PhotoKit options probe.
 * Add to App.tsx temporarily for headed L3 testing.
 * 
 * Usage in App.tsx:
 * import { PhotokitProbeButton } from './src/diagnostics/PhotokitProbeButton';
 * // At end of JSX:
 * {__DEV__ && <PhotokitProbeButton />}
 */

export function PhotokitProbeButton() {
  const [running, setRunning] = useState(false);
  const autoRunRef = useRef(false);

  const runProbe = async () => {
    try {
      setRunning(true);
      console.log("[PhotokitProbe] Starting...");
      console.log("[PhotokitProbe] Checking native module availability...");
      
      // Check if native module is available
      const PhotokitThumbs = require("../modules/mediaLibrary/PhotokitThumbView");
      console.log("[PhotokitProbe] Module loaded, checking probePhotokitRequestOptions...");
      console.log("[PhotokitProbe] probePhotokitRequestOptions type:", typeof PhotokitThumbs.probePhotokitRequestOptions);

      // Get newest photo
      const ids = await previewPhotokitNewestIds(1);
      console.log("[PhotokitProbe] previewPhotokitNewestIds returned:", ids.length, "ids");
      if (ids.length === 0) {
        console.log("[PhotokitProbe] No photos found");
        Alert.alert("No Photos", "Add photos to simulator first");
        return;
      }

      const assetId = ids[0];
      console.log(`[PhotokitProbe] Testing asset: ${assetId}`);

      // Run probe
      console.log("[PhotokitProbe] Calling probePhotokitRequestOptions...");
      const result = await probePhotokitRequestOptions(assetId, 256);
      console.log("[PhotokitProbe] Probe returned:", typeof result, result ? "truthy" : "falsy");
      
      // Log full JSON to console (ONLY output - no file system)
      console.log("[PhotokitProbe] ==================== RESULTS ====================");
      console.log(JSON.stringify(result, null, 2));
      console.log("[PhotokitProbe] ========================================================");
      
      // Diagnostic: log counts
      console.log("[PhotokitProbe] Variants array length:", result?.variants?.length || 0);
      if (result?.error) {
        console.log("[PhotokitProbe] Error field:", result.error);
      }

      // Summary
      const passCount = result.variants.filter(v => v.status === "PASS").length;
      const failCount = result.variants.filter(v => v.status === "FAIL").length;
      const timeoutCount = result.variants.filter(v => v.status === "TIMEOUT").length;
      
      Alert.alert(
        "Probe Complete",
        `✓ PASS: ${passCount}\n` +
        `✗ FAIL: ${failCount}\n` +
        `⏱ TIMEOUT: ${timeoutCount}\n\n` +
        `Check Metro console for details`,
        [{ text: "OK" }]
      );

    } catch (error) {
      console.error("[PhotokitProbe] Error:", error);
      Alert.alert("Error", error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  };

  // Auto-run probe once if env var is set (for agent testing)
  useEffect(() => {
    const autoRun = process.env.EXPO_PUBLIC_AUTO_RUN_PHOTOKIT_PROBE === "1";
    if (autoRun && !autoRunRef.current && !running) {
      autoRunRef.current = true;
      console.log("[PhotokitProbe] Auto-running probe (EXPO_PUBLIC_AUTO_RUN_PHOTOKIT_PROBE=1)");
      setTimeout(() => runProbe(), 3000); // Delay 3s for app to settle
    }
  }, []);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.button, running && styles.buttonRunning]}
        onPress={runProbe}
        disabled={running}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>
          {running ? "⏳" : "🔬"}
        </Text>
        <Text style={styles.label}>
          {running ? "Probing..." : "PhotoKit\nProbe"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    right: 20,
    zIndex: 9999,
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonRunning: {
    backgroundColor: "#999",
  },
  buttonText: {
    fontSize: 24,
    marginBottom: 2,
  },
  label: {
    fontSize: 9,
    color: "#FFF",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 10,
  },
});
