import { startOfLocalWeek, endOfLocalWeek } from "@/utils/localWeek";

describe("deskActivity week window helpers", () => {
  it("exposes a local week range for critical due filtering", () => {
    const today = new Date("2026-10-17T12:00:00");
    const start = startOfLocalWeek(today);
    const end = endOfLocalWeek(today);
    expect(start.getTime()).toBeLessThanOrEqual(today.getTime());
    expect(end.getTime()).toBeGreaterThanOrEqual(today.getTime());
  });
});
