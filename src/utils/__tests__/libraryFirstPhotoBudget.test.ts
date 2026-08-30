import {
  LIBRARY_FIRST_PHOTO_BUDGET_MS,
  isWithinFirstPhotoBudget,
} from "../libraryPickerPerf";
import {
  beginLibraryPickerSession,
  getLibraryPickerTimingSnapshot,
  markLibraryPickerTilePainted,
  resetLibraryPickerTimingForTests,
} from "../libraryPickerTiming";

describe("library first-photo timing budget", () => {
  let now = 10_000;

  beforeEach(() => {
    now = 10_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
    resetLibraryPickerTimingForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("exports a 3s product budget", () => {
    expect(LIBRARY_FIRST_PHOTO_BUDGET_MS).toBe(3000);
  });

  it("accepts first paint inside the budget", () => {
    expect(isWithinFirstPhotoBudget(1000, 2500)).toBe(true);
    expect(isWithinFirstPhotoBudget(1000, 4001)).toBe(false);
  });

  it("records first tile within budget (simulated warm bridge)", () => {
    beginLibraryPickerSession();
    now += 900;
    markLibraryPickerTilePainted("a1");
    const snap = getLibraryPickerTimingSnapshot();
    expect(snap?.firstTileAt).toBe(10_900);
    expect(
      isWithinFirstPhotoBudget(snap!.overlayOpenAt, snap!.firstTileAt!),
    ).toBe(true);
  });

  it("fails the budget when first tile is late", () => {
    beginLibraryPickerSession();
    now += 4500;
    markLibraryPickerTilePainted("late");
    const snap = getLibraryPickerTimingSnapshot();
    expect(
      isWithinFirstPhotoBudget(snap!.overlayOpenAt, snap!.firstTileAt!),
    ).toBe(false);
  });
});
