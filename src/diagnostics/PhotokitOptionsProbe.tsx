import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import {
  probePhotokitRequestOptions,
  previewPhotokitNewestIds,
  type PhotokitProbeResult,
} from "../modules/mediaLibrary/PhotokitThumbView";

/**
 * PhotoKit Options Probe Diagnostic
 * 
 * Interactive UI to test different PHImageRequestOptions combinations
 * and identify which delivery/resize modes work vs hitting errors.
 * 
 * Results are logged to console and written to:
 * .cache/insite-perf20/sim-photokit-dig/callpath-ab/options-probe/
 */

export function PhotokitOptionsProbe() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PhotokitProbeResult | null>(null);
  const [assetId, setAssetId] = useState<string>("");

  const runProbe = async () => {
    try {
      setRunning(true);
      setResult(null);

      // Get the newest photo ID
      console.log("[Probe] Fetching newest photo IDs...");
      const ids = await previewPhotokitNewestIds(1);
      
      if (ids.length === 0) {
        Alert.alert("No Photos", "No photos found in library. Add photos to simulator.");
        return;
      }

      const testAssetId = ids[0];
      setAssetId(testAssetId);
      console.log(`[Probe] Testing asset: ${testAssetId}`);

      // Run the probe
      console.log("[Probe] Running options probe...");
      const probeResult = await probePhotokitRequestOptions(testAssetId, 256);
      
      setResult(probeResult);
      
      // Log full JSON to console FIRST (primary result sink)
      console.log("[Probe] ==================== RESULTS ====================");
      console.log(JSON.stringify(probeResult, null, 2));
      console.log("[Probe] ========================================================");

      // Write to cache (best-effort, Expo 54 compatible)
      let resultPath = "(not written)";
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        resultPath = `${FileSystem.cacheDirectory}photokit-probe-result-${timestamp}.json`;
        
        await FileSystem.writeAsStringAsync(
          resultPath,
          JSON.stringify(probeResult, null, 2)
        );
        
        console.log(`[Probe] Results written to: ${resultPath}`);
      } catch (writeError) {
        console.warn("[Probe] File write failed (non-fatal):", writeError);
      }

      // Generate summary
      const passCount = probeResult.variants.filter(v => v.status === "PASS").length;
      const failCount = probeResult.variants.filter(v => v.status === "FAIL").length;
      
      Alert.alert(
        "Probe Complete",
        `Tested ${probeResult.variants.length} variants\n` +
        `✓ PASS: ${passCount}\n` +
        `✗ FAIL: ${failCount}\n\n` +
        `Results: ${resultPath}`,
        [{ text: "OK" }]
      );

    } catch (error) {
      console.error("[Probe] Error:", error);
      Alert.alert("Probe Error", error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  };

  const copyResults = async () => {
    if (!result) return;
    const text = JSON.stringify(result, null, 2);
    // Clipboard isn't available in test harness, just log
    console.log("[Probe] Results copied to console");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PhotoKit Options Probe</Text>
      <Text style={styles.subtitle}>
        Tests PHImageRequestOptions combinations to diagnose error 3303
      </Text>

      {assetId ? (
        <Text style={styles.assetId}>Asset: {assetId.substring(0, 40)}...</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.button, running && styles.buttonDisabled]}
        onPress={runProbe}
        disabled={running}
      >
        <Text style={styles.buttonText}>
          {running ? "Running..." : "Run Probe"}
        </Text>
      </TouchableOpacity>

      {result && (
        <ScrollView style={styles.results}>
          <Text style={styles.resultsTitle}>Results:</Text>
          
          {result.variants.map((variant, i) => (
            <View key={i} style={styles.variant}>
              <View style={styles.variantHeader}>
                <Text style={styles.variantName}>{variant.variant}</Text>
                <Text style={[
                  styles.variantStatus,
                  variant.status === "PASS" && styles.statusPass,
                  variant.status === "FAIL" && styles.statusFail,
                  variant.status === "TIMEOUT" && styles.statusTimeout,
                ]}>
                  {variant.status}
                </Text>
              </View>

              <Text style={styles.variantDetail}>
                Callbacks: {variant.callbackCount} | Time: {variant.elapsedMs}ms
              </Text>

              {variant.error && (
                <Text style={styles.error}>
                  Error: {variant.error.domain} Code={variant.error.code}
                  {"\n"}{variant.error.description}
                </Text>
              )}

              {variant.imageSize && (
                <Text style={styles.imageSize}>
                  Image: {variant.imageSize.width}×{variant.imageSize.height} 
                  @{variant.imageSize.scale}x
                </Text>
              )}

              {variant.uri && (
                <Text style={styles.uri} numberOfLines={1}>
                  {variant.uri}
                </Text>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.copyButton} onPress={copyResults}>
            <Text style={styles.copyButtonText}>Log Full Results</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  assetId: {
    fontSize: 12,
    color: "#999",
    marginBottom: 16,
    fontFamily: "monospace",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: "#CCC",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  results: {
    flex: 1,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  variant: {
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  variantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  variantName: {
    fontSize: 16,
    fontWeight: "600",
  },
  variantStatus: {
    fontSize: 14,
    fontWeight: "bold",
  },
  statusPass: {
    color: "#34C759",
  },
  statusFail: {
    color: "#FF3B30",
  },
  statusTimeout: {
    color: "#FF9500",
  },
  variantDetail: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  error: {
    fontSize: 12,
    color: "#FF3B30",
    marginTop: 4,
    fontFamily: "monospace",
  },
  imageSize: {
    fontSize: 12,
    color: "#34C759",
    marginTop: 4,
  },
  uri: {
    fontSize: 10,
    color: "#999",
    marginTop: 4,
    fontFamily: "monospace",
  },
  copyButton: {
    backgroundColor: "#E5E5E5",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
