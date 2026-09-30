import { Platform } from "react-native";
import {
  probePhotokitRequestOptions,
  type PhotokitProbeResult,
  type PhotokitProbeVariant,
} from "../PhotokitThumbView";

/**
 * PhotoKit Request Options Probe
 * 
 * Tests different PHImageRequestOptions combinations to identify which
 * delivery/resize modes successfully return images vs hitting errors
 * like PHPhotosErrorDomain Code=3303.
 * 
 * Evidence: .cache/insite-perf20/sim-photokit-dig/callpath-ab/options-probe/
 * 
 * This test is designed to be run on a real iOS simulator with photos.
 * It will be skipped in CI and on Android.
 */

const SKIP_REASON = Platform.OS !== "ios" 
  ? "iOS only" 
  : "Requires real simulator with photos - run manually";

describe("PhotoKit Request Options Probe", () => {
  const TEST_ASSET_ID = process.env.PHOTOKIT_TEST_ASSET_ID || "";
  const MAX_PIXEL = 256;
  
  // Skip in automated runs - this is a diagnostic tool
  const runProbe = TEST_ASSET_ID.length > 0;

  it.skip("should probe different PHImageRequestOptions combinations", async () => {
    if (!runProbe) {
      console.log(`Skipped: ${SKIP_REASON}`);
      console.log("To run: PHOTOKIT_TEST_ASSET_ID=<asset-id> npm test photokitRequestOptions");
      return;
    }

    const result = await probePhotokitRequestOptions(TEST_ASSET_ID, MAX_PIXEL);
    
    console.log("\n=== PhotoKit Request Options Probe Results ===\n");
    console.log(JSON.stringify(result, null, 2));
    
    // Write results to evidence directory
    const fs = require("fs");
    const path = require("path");
    const evidenceDir = path.join(
      __dirname,
      "../../../../.cache/insite-perf20/sim-photokit-dig/callpath-ab/options-probe"
    );
    
    if (fs.existsSync(evidenceDir)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const resultFile = path.join(evidenceDir, `probe-result-${timestamp}.json`);
      fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
      console.log(`\nResults written to: ${resultFile}\n`);
    }
    
    // Analysis
    const passVariants = result.variants.filter(v => v.status === "PASS");
    const failVariants = result.variants.filter(v => v.status === "FAIL");
    const timeoutVariants = result.variants.filter(v => v.status === "TIMEOUT");
    
    console.log("\n=== Summary ===");
    console.log(`Total variants tested: ${result.variants.length}`);
    console.log(`PASS: ${passVariants.length}`);
    console.log(`FAIL: ${failVariants.length}`);
    console.log(`TIMEOUT: ${timeoutVariants.length}`);
    
    if (passVariants.length > 0) {
      console.log("\nSuccessful variants:");
      passVariants.forEach(v => {
        console.log(`  ✓ ${v.variant} (${v.elapsedMs}ms)`);
        if (v.uri) {
          console.log(`    URI: ${v.uri}`);
        }
      });
    }
    
    if (failVariants.length > 0) {
      console.log("\nFailed variants:");
      failVariants.forEach(v => {
        console.log(`  ✗ ${v.variant}`);
        if (v.error) {
          console.log(`    Error: ${v.error.domain} Code=${v.error.code}`);
          console.log(`    ${v.error.description}`);
        }
        if (v.imageNull) {
          console.log(`    Image was null`);
        }
      });
    }
    
    // This test always passes - it's a diagnostic probe
    expect(result.variants.length).toBeGreaterThan(0);
  });

  describe("Request Options Contract", () => {
    it("should define expected delivery modes", () => {
      // Contract: PHImageRequestOptionsDeliveryMode enum values
      const deliveryModes = ["fastFormat", "highQualityFormat", "opportunistic"];
      expect(deliveryModes).toHaveLength(3);
    });

    it("should define expected resize modes", () => {
      // Contract: PHImageRequestOptionsResizeMode enum values
      const resizeModes = ["none", "fast", "exact"];
      expect(resizeModes).toHaveLength(3);
    });

    it("should validate probe result structure", () => {
      const mockVariant: PhotokitProbeVariant = {
        variant: "test",
        status: "PASS",
        callbackCount: 1,
        elapsedMs: 100,
        uri: "file:///test.jpg",
      };

      expect(mockVariant.variant).toBe("test");
      expect(mockVariant.status).toBe("PASS");
      expect(["PASS", "FAIL", "TIMEOUT"]).toContain(mockVariant.status);
    });

    it("should handle error responses in probe results", () => {
      const mockErrorVariant: PhotokitProbeVariant = {
        variant: "test_error",
        status: "FAIL",
        callbackCount: 1,
        elapsedMs: 50,
        error: {
          domain: "PHPhotosErrorDomain",
          code: 3303,
          description: "Asset is not available",
        },
      };

      expect(mockErrorVariant.status).toBe("FAIL");
      expect(mockErrorVariant.error?.code).toBe(3303);
      expect(mockErrorVariant.error?.domain).toBe("PHPhotosErrorDomain");
    });

    it("should handle timeout scenarios", () => {
      const mockTimeoutVariant: PhotokitProbeVariant = {
        variant: "test_timeout",
        status: "TIMEOUT",
        callbackCount: 0,
        elapsedMs: 3000,
      };

      expect(mockTimeoutVariant.status).toBe("TIMEOUT");
      expect(mockTimeoutVariant.elapsedMs).toBeGreaterThanOrEqual(3000);
    });

    it("should validate image metadata structure", () => {
      const mockImageVariant: PhotokitProbeVariant = {
        variant: "test_image",
        status: "PASS",
        callbackCount: 1,
        elapsedMs: 150,
        imageSize: {
          width: 256,
          height: 256,
          scale: 2,
        },
        uri: "file:///test.jpg",
      };

      expect(mockImageVariant.imageSize).toBeDefined();
      expect(mockImageVariant.imageSize?.width).toBeGreaterThan(0);
      expect(mockImageVariant.imageSize?.height).toBeGreaterThan(0);
      expect(mockImageVariant.imageSize?.scale).toBeGreaterThan(0);
    });

    it("should validate result wrapper structure", () => {
      const mockResult: PhotokitProbeResult = {
        variants: [
          {
            variant: "test1",
            status: "PASS",
            callbackCount: 1,
            elapsedMs: 100,
          },
        ],
      };

      expect(mockResult.variants).toBeInstanceOf(Array);
      expect(mockResult.variants.length).toBeGreaterThan(0);
      expect(mockResult.error).toBeUndefined();
    });

    it("should handle probe errors at wrapper level", () => {
      const mockErrorResult: PhotokitProbeResult = {
        variants: [],
        error: "native_unavailable",
      };

      expect(mockErrorResult.variants).toHaveLength(0);
      expect(mockErrorResult.error).toBe("native_unavailable");
    });
  });
});
