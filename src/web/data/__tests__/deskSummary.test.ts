import { buildDeskProjectStat } from "../deskSummary";

describe("deskSummary (M-WEB-01)", () => {
  it("rolls task buckets per project", () => {
    const stat = buildDeskProjectStat(
      {
        id: "p1",
        name: "Site A",
        status: "active",
        location: "HK",
      },
      {
        isProjectAdmin: true,
        memberCount: 3,
        tasks: [
          { project_id: "p1", status: "new", due_date: null },
          { project_id: "p1", status: "in_progress", due_date: null },
          {
            project_id: "p1",
            status: "new",
            due_date: "2000-01-01T00:00:00.000Z",
          },
          { project_id: "p1", status: "reviewing", due_date: null },
        ],
      },
    );
    expect(stat.taskCount).toBe(4);
    expect(stat.openTasks).toBe(4);
    expect(stat.doing).toBe(1);
    expect(stat.inReview).toBe(1);
    expect(stat.overdue).toBeGreaterThanOrEqual(1);
    expect(stat.isProjectAdmin).toBe(true);
    expect(stat.memberCount).toBe(3);
  });
});
