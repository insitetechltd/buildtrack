import { endOfLocalWeek, isDueThisLocalWeek, startOfLocalWeek } from "../localWeek";

describe("localWeek", () => {
  it("treats Monday–Sunday as the local week bounds", () => {
    // Wednesday 2026-09-09 local
    const wednesday = new Date(2026, 8, 9, 12, 0, 0);
    const start = startOfLocalWeek(wednesday);
    const end = endOfLocalWeek(wednesday);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(8);
    expect(start.getDate()).toBe(7); // Monday
    expect(start.getHours()).toBe(0);
    expect(end.getDate()).toBe(13); // Sunday
    expect(end.getHours()).toBe(23);
  });

  it("matches dashboard critical due-this-week membership", () => {
    const wednesday = new Date(2026, 8, 9, 12, 0, 0);
    expect(isDueThisLocalWeek(new Date(2026, 8, 10, 8, 0, 0), wednesday)).toBe(true);
    expect(isDueThisLocalWeek(new Date(2026, 8, 1, 8, 0, 0), wednesday)).toBe(false);
    expect(isDueThisLocalWeek(undefined, wednesday)).toBe(false);
  });
});
