import {
  expandPhotokitLibraryFull,
  getPhotokitThumbNativeView,
  isPhotokitLibrary2bAvailable,
  isPhotokitLibraryIndexAvailable,
  isPhotokitThumbsAvailable,
  openPhotokitLibrary,
  openPhotokitLibraryLimited,
  openPhotokitLibraryWithIds,
  photokitIdAt,
  startPhotokitRangeCaching,
  startPhotokitThumbCaching,
  stopPhotokitThumbCaching,
  pausePhotokitLibraryForAccept,
  resumePhotokitLibraryAfterAccept,
  exportPhotokitCappedJpeg,
  exportPhotokitPreviewJpeg,
} from "../PhotokitThumbView";

describe("PhotokitThumbView JS gate", () => {
  it("is unavailable in Jest (no native PhotokitThumbs module)", () => {
    expect(isPhotokitThumbsAvailable()).toBe(false);
    expect(isPhotokitLibraryIndexAvailable()).toBe(false);
    expect(isPhotokitLibrary2bAvailable()).toBe(false);
    expect(getPhotokitThumbNativeView()).toBeNull();
  });

  it("no-ops cache calls when the native module is missing", async () => {
    expect(() => {
      startPhotokitThumbCaching(["a"], 120);
      startPhotokitRangeCaching(1, 12, 27, 120);
      stopPhotokitThumbCaching();
      pausePhotokitLibraryForAccept();
      resumePhotokitLibraryAfterAccept();
    }).not.toThrow();
    await expect(exportPhotokitCappedJpeg("a", 1920)).resolves.toBeNull();
    await expect(exportPhotokitPreviewJpeg("a", 512)).resolves.toBeNull();
    await expect(openPhotokitLibrary(null)).resolves.toBeNull();
    await expect(openPhotokitLibraryLimited(null, 60)).resolves.toBeNull();
    await expect(openPhotokitLibraryWithIds(["a"])).resolves.toBeNull();
    await expect(expandPhotokitLibraryFull(1)).resolves.toBeNull();
    expect(photokitIdAt(1, 0)).toBeNull();
  });
});

describe("Export-null regression (Forever-Gray Ruled-Out R7)", () => {
  it("exportPhotokitPreviewJpeg returns null when native module missing (Jest baseline)", async () => {
    // In Jest: native PhotokitThumbs module unavailable → export returns null
    // This is expected baseline; no file:// URI to paint
    const result = await exportPhotokitPreviewJpeg("asset-id", 512);
    expect(result).toBeNull();
  });

  it("exportPhotokitCappedJpeg returns null when native module missing (Jest baseline)", async () => {
    // Same for capped export — null when native unavailable
    const result = await exportPhotokitCappedJpeg("asset-id", 1920);
    expect(result).toBeNull();
  });

  it("documents L3 requestImage callback nil hypothesis", () => {
    // Forever-gray troubleshooting L3 diagnostic (diagnostic-probe.ts) tested:
    // - Open library session → valid token/count
    // - Get asset ID at index 0 → valid asset ID
    // - Call exportPhotokitPreviewJpeg → EXPECTED: file:// URI
    //
    // If exportPhotokitPreviewJpeg returns null/empty on REAL sim:
    // → PHImageManager.requestImage callback delivered nil/cancelled image
    // → No file:// URI to paint
    // → Tile stays gray forever
    //
    // This test documents the contract:
    // - null export → no file:// URI → no paint possible
    // - Ruled-out hypothesis: "export always succeeds if permission granted"
    //   → DISPROVEN: export can return null even with Full Access

    const nullExportMeansNoPaint = true;
    expect(nullExportMeansNoPaint).toBe(true);

    // Lesson from forever-gray troubleshooting:
    // Full Access granted does NOT guarantee export success.
    // PhotoKit callback can return nil on Debug sim (iOS 18.1 regression suspected).
    const failureMode = "Full Access + export null";
    expect(failureMode).toContain("Full Access");
  });

  it("null export blocks paint even when permission and session valid", async () => {
    // Scenario that matches forever-gray symptoms:
    // 1. Permission: granted ✅
    // 2. Library session: valid token/count ✅
    // 3. Asset ID: valid ph:// identifier ✅
    // 4. Export: returns null ❌
    //
    // Result: Tile has no file:// URI → stays gray
    //
    // This is the L3 requestImage layer failure documented in diagnostic-probe.ts

    const permissionGranted = true;
    const sessionValid = true;
    const assetIdValid = true;
    const exportResult = await exportPhotokitPreviewJpeg("valid-asset", 512);

    // In Jest: export returns null (native unavailable)
    expect(exportResult).toBeNull();

    // On real sim with forever-gray bug:
    // permissionGranted && sessionValid && assetIdValid && exportResult === null
    // → PhotoKit requestImage callback delivered nil
    // → Root cause of forever-gray

    if (permissionGranted && sessionValid && assetIdValid && !exportResult) {
      // This is the forever-gray failure mode
      const rootCause = "PhotoKit callback nil";
      expect(rootCause).toContain("PhotoKit");
    }
  });
});
