import {
  buildActivityFeedRows,
  countUnreadActivityFeedRows,
  formatActivityTabBadgeCount,
  RECENT_ACTIVITY_WINDOW_MS,
  resolveActivityFeedSeenAtMs,
} from "../activityFeed";

describe("activityFeed", () => {
  const now = new Date("2026-07-04T09:00:00.000Z").getTime();

  it("builds recent task updates within the five-day window", () => {
    const recentTimestamp = new Date(now - RECENT_ACTIVITY_WINDOW_MS + 60_000).toISOString();
    const staleTimestamp = new Date(now - RECENT_ACTIVITY_WINDOW_MS - 60_000).toISOString();

    const rows = buildActivityFeedRows({
      projectId: "project-1",
      tasks: [
        {
          id: "task-recent",
          projectId: "project-1",
          status: "in_progress",
          title: "Recent task",
          createdAt: recentTimestamp,
          updates: [
            {
              id: "update-recent",
              timestamp: recentTimestamp,
              status: "in_progress",
              description: "Progress photo added",
            },
          ],
        },
        {
          id: "task-stale",
          projectId: "project-1",
          status: "new",
          title: "Stale task",
          createdAt: staleTimestamp,
          updates: [
            {
              id: "update-stale",
              timestamp: staleTimestamp,
              status: "new",
              description: "Old update",
            },
          ],
        },
      ],
      now,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("update-recent");
    expect(rows[0]?.title).toBe("Progress photo added");
  });

  it("includes saved photo batches in the feed", () => {
    const savedAt = now - 60_000;

    const rows = buildActivityFeedRows({
      projectId: "project-1",
      tasks: [],
      photoBatches: [
        {
          id: "batch-1",
          projectId: "project-1",
          savedAt,
          photoUrls: ["file://photo.jpg"],
          captions: ["Roof deck"],
        },
      ],
      now,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("unattached-batch-batch-1");
    expect(rows[0]?.title).toBe("1 photos captured");
  });

  it("counts unread rows after last seen timestamp", () => {
    const rows = [
      { sortTimestamp: new Date(now - 120_000).toISOString() },
      { sortTimestamp: new Date(now - 60_000).toISOString() },
      { sortTimestamp: new Date(now - 30_000).toISOString() },
    ];

    expect(countUnreadActivityFeedRows(rows, null)).toBe(3);
    expect(countUnreadActivityFeedRows(rows, now - 90_000)).toBe(2);
    expect(countUnreadActivityFeedRows(rows, now)).toBe(0);
  });

  it("resolves seen timestamp from newest feed row or current time", () => {
    const rows = [
      { sortTimestamp: new Date(now - 120_000).toISOString() },
      { sortTimestamp: new Date(now - 30_000).toISOString() },
    ];

    expect(resolveActivityFeedSeenAtMs(rows, now)).toBe(now);
    expect(resolveActivityFeedSeenAtMs([], now - 500)).toBe(now - 500);
  });

  it("formats tab badge counts", () => {
    expect(formatActivityTabBadgeCount(0)).toBeUndefined();
    expect(formatActivityTabBadgeCount(3)).toBe(3);
    expect(formatActivityTabBadgeCount(120)).toBe("99+");
  });
});
