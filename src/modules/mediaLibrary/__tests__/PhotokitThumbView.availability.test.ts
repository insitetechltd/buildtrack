/**
 * Regression guard for native PhotoKit thumbs module availability ON DEVICE.
 * Ensures module loads properly and prevents silent failures that result in
 * tiles stuck as skeletons with painted = 0.
 *
 * NOTE: This test expects FALSE in Jest (no native modules), but should be
 * complemented by headed smoke tests on actual iOS devices where it must be TRUE.
 */
import { Platform } from "react-native";
import { isPhotokitThumbsAvailable } from "../PhotokitThumbView";
import {
  getLibraryPickerTimingSnapshot,
  beginLibraryPickerSession,
  resetLibraryPickerTimingForTests,
  markLibraryPickerTilePainted,
} from "@/utils/libraryPickerTiming";

describe("PhotokitThumbView module availability regression", () => {
  it("documents the Jest expectation (no native module in test env)", () => {
    // In Jest, there's no native module, so this returns false.
    // This is expected and correct for unit tests.
    const available = isPhotokitThumbsAvailable();
    expect(available).toBe(false);

    // CRITICAL: On actual iOS devices/simulators, isPhotokitThumbsAvailable()
    // MUST return true, or hybrid library tiles remain as skeletons forever.
    //
    // If device tests fail with painted = 0:
    // 1. Check Metro logs for [PhotokitThumbs] errors
    // 2. Rebuild: rm -rf ios/build && cd ios && pod install && cd ..
    // 3. Check Podfile.lock for PhotokitThumbs
    // 4. Run: npm run test:picker-timing (headed device proof)
  });

  it("logs loud warning when module is unavailable (Jest expectation)", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

    // Force a recheck by calling the function
    const available = isPhotokitThumbsAvailable();

    // In Jest (no native module), expect warning logs
    expect(available).toBe(false);
    expect(
      consoleSpy.mock.calls.some((call) =>
        call.some((arg) =>
          typeof arg === "string" &&
          arg.includes("isPhotokitThumbsAvailable() = false")
        ),
      ),
    ).toBe(true);

    consoleSpy.mockRestore();
  });

  it("tracks painted count for regression detection", () => {
    resetLibraryPickerTimingForTests();
    beginLibraryPickerSession();

    // Simulate tiles painting
    markLibraryPickerTilePainted("asset-1");
    markLibraryPickerTilePainted("asset-2");
    markLibraryPickerTilePainted("asset-3");

    const snapshot = getLibraryPickerTimingSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot!.paintedCount).toBe(3);

    // REGRESSION GUARD: On device with working native thumbs,
    // paintedCount must be > 0 within 3 seconds of first screen.
    // If painted stays 0, the native module failed to load.
  });
});
