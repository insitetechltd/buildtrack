import {
  buildActivityFeedGroups,
  buildActivityFeedRows,
  countUnreadActivityFeedRows,
  formatActivityTabBadgeCount,
  groupActivityFeedRows,
  RECENT_ACTIVITY_MAX_ITEMS,
  RECENT_ACTIVITY_WINDOW_MS,
  resolveActivityFeedDotTone,
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
    expect(rows[0]?.dotTone).toBe("caution");
  });

  it("includes a create row when create-time photos exist alongside later updates", () => {
    const recentTimestamp = new Date(now - 60_000).toISOString();
    const createTimestamp = new Date(now - 120_000).toISOString();

    const rows = buildActivityFeedRows({
      projectId: "project-1",
      tasks: [
        {
          id: "task-create-photos",
          projectId: "project-1",
          status: "in_progress",
          title: "Camera flow task",
          createdAt: createTimestamp,
          attachments: ["company/tasks/a.jpg"],
          updates: [
            {
              id: "update-accept",
              timestamp: recentTimestamp,
              status: "in_progress",
              description: "Task accepted by Tristan",
            },
          ],
        },
      ],
      now,
    });

    expect(rows.map((row) => row.id)).toEqual([
      "update-accept",
      "activity-task:task-create-photos",
    ]);
    expect(rows[1]?.title).toBe("New Task");
  });

  it("groups events by taskId and caps Recent Activity at 20 groups", () => {
    const tasks = Array.from({ length: RECENT_ACTIVITY_MAX_ITEMS + 5 }, (_, index) => {
      const timestamp = new Date(now - index * 60_000).toISOString();
      return {
        id: `task-${index}`,
        projectId: "project-1",
        status: "in_progress" as const,
        title: `Task ${index}`,
        createdAt: timestamp,
        updates: [
          {
            id: `update-${index}`,
            timestamp,
            status: "in_progress" as const,
            description: `Update ${index}`,
          },
        ],
      };
    });

    const groups = buildActivityFeedGroups({
      projectId: "project-1",
      tasks,
      now,
    });

    expect(groups).toHaveLength(RECENT_ACTIVITY_MAX_ITEMS);
    expect(groups[0]?.taskId).toBe("task-0");
    expect(groups[0]?.events[0]?.id).toBe("update-0");
    expect(groups[RECENT_ACTIVITY_MAX_ITEMS - 1]?.taskId).toBe(
      `task-${RECENT_ACTIVITY_MAX_ITEMS - 1}`,
    );
  });

  it("stacks multiple events for the same task newest-first", () => {
    const groups = buildActivityFeedGroups({
      projectId: "project-1",
      tasks: [
        {
          id: "task-1",
          projectId: "project-1",
          status: "rejected",
          title: "Door punch",
          createdAt: new Date(now - 180_000).toISOString(),
          updates: [
            {
              id: "update-progress",
              timestamp: new Date(now - 120_000).toISOString(),
              status: "in_progress",
              description: "Progress photo added",
              activityType: "progress_update",
            },
            {
              id: "update-reject",
              timestamp: new Date(now - 60_000).toISOString(),
              status: "rejected",
              description: "Rejected — wrong finish",
              activityType: "review_rejection",
            },
          ],
        },
      ],
      now,
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.events.map((event) => event.id)).toEqual([
      "update-reject",
      "update-progress",
    ]);
    expect(groups[0]?.events[0]?.dotTone).toBe("negative");
    expect(groups[0]?.events[1]?.dotTone).toBe("caution");
  });

  it("tie-breaks equal timestamps with reject over progress", () => {
    const stamp = new Date(now - 60_000).toISOString();
    const grouped = groupActivityFeedRows([
      {
        id: "progress",
        taskId: "task-1",
        title: "Progress",
        subtitle: "Task",
        timestampLabel: "now",
        statusLabel: "In Progress",
        sortTimestamp: stamp,
        dotTone: "caution",
        activityType: "progress_update",
      },
      {
        id: "reject",
        taskId: "task-1",
        title: "Rejected",
        subtitle: "Task",
        timestampLabel: "now",
        statusLabel: "Rejected",
        sortTimestamp: stamp,
        dotTone: "negative",
        activityType: "review_rejection",
      },
    ]);

    expect(grouped[0]?.events.map((event) => event.id)).toEqual([
      "reject",
      "progress",
    ]);
  });

  it("maps activity kinds to dot tones", () => {
    expect(
      resolveActivityFeedDotTone({ activityType: "review_rejection" }),
    ).toBe("negative");
    expect(
      resolveActivityFeedDotTone({ activityType: "review_acceptance" }),
    ).toBe("positive");
    expect(
      resolveActivityFeedDotTone({ activityType: "progress_update" }),
    ).toBe("caution");
    expect(resolveActivityFeedDotTone({ activityType: "creation" })).toBe(
      "info",
    );
    expect(resolveActivityFeedDotTone({ status: "archived" })).toBe("info");
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
    expect(rows[0]?.dotTone).toBe("caution");
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
