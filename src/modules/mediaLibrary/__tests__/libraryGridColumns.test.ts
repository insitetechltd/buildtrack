import {
  LIBRARY_GRID_COLUMNS,
  LIBRARY_GRID_FIRST_WAVE_ITEMS_CAP,
  LIBRARY_GRID_MAX_COLUMNS,
  libraryGridColumns,
  libraryGridFirstWaveItemCount,
} from "../libraryAlbumConstants";

describe("libraryGridColumns", () => {
  it("keeps 3 columns on iPhone widths", () => {
    expect(libraryGridColumns(390)).toBe(LIBRARY_GRID_COLUMNS);
    expect(libraryGridColumns(428)).toBe(LIBRARY_GRID_COLUMNS);
    expect(libraryGridColumns(0)).toBe(LIBRARY_GRID_COLUMNS);
  });

  it("adds columns on iPad so tiles stay near phone size", () => {
    expect(libraryGridColumns(744)).toBeGreaterThan(LIBRARY_GRID_COLUMNS);
    expect(libraryGridColumns(834)).toBeGreaterThanOrEqual(6);
    expect(libraryGridColumns(1024)).toBe(LIBRARY_GRID_MAX_COLUMNS);
    expect(libraryGridColumns(1366)).toBe(LIBRARY_GRID_MAX_COLUMNS);
  });
});

describe("libraryGridFirstWaveItemCount", () => {
  it("covers a phone first screen without exceeding the cap", () => {
    const count = libraryGridFirstWaveItemCount({
      columns: 3,
      viewHeight: 700,
      rowHeight: 130,
    });
    expect(count).toBe(18);
  });

  it("caps iPad 8-col viewport so first paint is not 40 PhotoKit jobs", () => {
    const count = libraryGridFirstWaveItemCount({
      columns: 8,
      viewHeight: 1000,
      rowHeight: 130,
    });
    expect(count).toBe(LIBRARY_GRID_FIRST_WAVE_ITEMS_CAP);
  });
});
