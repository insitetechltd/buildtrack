import {
  beginLibraryPickerSession,
  formatLibraryPickerTimingHud,
  getLibraryPickerTimingSnapshot,
  markLibraryPickerMetadata,
  markLibraryPickerTilePainted,
  resetLibraryPickerTimingForTests,
  subscribeLibraryPickerTiming,
} from "../libraryPickerTiming";

describe("libraryPickerTiming", () => {
  let now = 10_000;

  beforeEach(() => {
    now = 10_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
    resetLibraryPickerTimingForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("ignores marks until a session begins", () => {
    markLibraryPickerMetadata(12);
    markLibraryPickerTilePainted("a");
    expect(getLibraryPickerTimingSnapshot()).toBeNull();
  });

  it("records overlay → metadata → first row (3) → first screen (12)", () => {
    beginLibraryPickerSession();
    now += 15;
    markLibraryPickerMetadata(12);
    now += 200;
    markLibraryPickerTilePainted("a");
    markLibraryPickerTilePainted("b");
    expect(getLibraryPickerTimingSnapshot()?.firstRowAt).toBeNull();
    markLibraryPickerTilePainted("c");
    const afterRow = getLibraryPickerTimingSnapshot();
    expect(afterRow?.firstRowAt).toBe(10_215);
    expect(afterRow?.firstScreenAt).toBeNull();

    now += 800;
    for (let i = 3; i < 12; i += 1) {
      markLibraryPickerTilePainted(`p${i}`);
    }
    const done = getLibraryPickerTimingSnapshot();
    expect(done?.firstScreenAt).toBe(11_015);
    expect(done?.paintedCount).toBe(12);
    expect(delta(done!.overlayOpenAt, done!.metadataAt)).toBe(15);
    expect(delta(done!.overlayOpenAt, done!.firstRowAt)).toBe(215);
    expect(delta(done!.overlayOpenAt, done!.firstScreenAt)).toBe(1015);
  });

  it("does not double-count the same tile id", () => {
    beginLibraryPickerSession();
    markLibraryPickerMetadata(12);
    markLibraryPickerTilePainted("a");
    markLibraryPickerTilePainted("a");
    expect(getLibraryPickerTimingSnapshot()?.paintedCount).toBe(1);
  });

  it("scales row/screen expectations when the album has fewer than 12 photos", () => {
    beginLibraryPickerSession();
    markLibraryPickerMetadata(2);
    markLibraryPickerTilePainted("a");
    expect(getLibraryPickerTimingSnapshot()?.firstRowAt).toBeNull();
    markLibraryPickerTilePainted("b");
    const snap = getLibraryPickerTimingSnapshot();
    expect(snap?.firstRowAt).not.toBeNull();
    expect(snap?.firstScreenAt).not.toBeNull();
    expect(snap?.expectedRow).toBe(2);
    expect(snap?.expectedScreen).toBe(2);
  });

  it("formats a HUD string and notifies subscribers", () => {
    const seen: string[] = [];
    const unsub = subscribeLibraryPickerTiming((snap) => {
      seen.push(formatLibraryPickerTimingHud(snap));
    });
    beginLibraryPickerSession();
    now += 12;
    markLibraryPickerMetadata(12);
    unsub();
    const hud = formatLibraryPickerTimingHud(getLibraryPickerTimingSnapshot());
    expect(hud).toContain("L1 timing");
    expect(hud).toContain("meta +12ms");
    expect(hud).toContain("row —");
    expect(seen.length).toBeGreaterThan(0);
  });
});

function delta(from: number, to: number | null): number | null {
  if (to == null) {
    return null;
  }
  return to - from;
}
