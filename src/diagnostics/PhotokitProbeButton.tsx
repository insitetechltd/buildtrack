import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
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

  const runProbe = async () => {
    try {
      setRunning(true);
      console.log("[PhotokitProbe] Starting...");

      // Get newest photo
      const ids = await previewPhotokitNewestIds(1);
      if (ids.length === 0) {
        console.log("[PhotokitProbe] No photos found");
        Alert.alert("No Photos", "Add photos to simulator first");
        return;
      }

      const assetId = ids[0];
      console.log(`[PhotokitProbe] Testing asset: ${assetId}`);

      // Run probe
      const result = await probePhotokitRequestOptions(assetId, 256);
      
      // Log full JSON to console FIRST (primary result sink)
      console.log("[PhotokitProbe] ==================== RESULTS ====================");
      console.log(JSON.stringify(result, null, 2));
      console.log("[PhotokitProbe] ========================================================");

      // Write to cache (best-effort, Expo 54 compatible)
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const resultPath = `${FileSystem.cacheDirectory}photokit-probe-result-${timestamp}.json`;
        
        await FileSystem.writeAsStringAsync(
          resultPath,
          JSON.stringify(result, null, 2)
        );
        
        console.log(`[PhotokitProbe] Results written to: ${resultPath}`);
      } catch (writeError) {
        // Non-fatal: console log is primary output
        console.warn("[PhotokitProbe] File write failed (non-fatal):", writeError);
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
