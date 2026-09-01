import { resolveLibraryPickerTimingHudEnabled } from "../libraryPickerPerf";

describe("library picker timing HUD gate", () => {
  it("shows the HUD in Metro / debug compiles", () => {
    expect(resolveLibraryPickerTimingHudEnabled(true)).toBe(true);
    expect(resolveLibraryPickerTimingHudEnabled(true, "0")).toBe(true);
  });

  it("mutes the HUD on production compiles", () => {
    expect(resolveLibraryPickerTimingHudEnabled(false)).toBe(false);
    expect(resolveLibraryPickerTimingHudEnabled(false, "")).toBe(false);
    expect(resolveLibraryPickerTimingHudEnabled(false, "0")).toBe(false);
  });

  it("allows an explicit diagnostic opt-in on a release binary", () => {
    expect(resolveLibraryPickerTimingHudEnabled(false, "1")).toBe(true);
    expect(resolveLibraryPickerTimingHudEnabled(false, "true")).toBe(true);
  });
});
