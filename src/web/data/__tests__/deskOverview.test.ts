import { buildDeskProjectOverview } from "../deskOverview";

describe("deskOverview project cards", () => {
  it("rolls task + member engagement per project", () => {
    const card = buildDeskProjectOverview({
      project: {
        id: "p1",
        name: "Site A",
        status: "active",
        location: "HK",
      },
      isProjectAdmin: true,
      tasks: [
        { status: "new", due_date: null },
        { status: "in_progress", due_date: null },
        { status: "completed", due_date: null },
        { status: "new", due_date: "2000-01-01T00:00:00.000Z" },
      ],
      memberIds: ["u1", "u2", "u3"],
      activeMemberIds: new Set(["u1"]),
    });
    expect(card.name).toBe("Site A");
    expect(card.statusLabel).toBe("On-going");
    expect(card.tasks.idle).toBe(2);
    expect(card.tasks.active).toBe(1);
    expect(card.tasks.closed).toBe(1);
    expect(card.tasks.overdue).toBeGreaterThanOrEqual(1);
    expect(card.members).toEqual({
      active: 1,
      idle: 2,
      pending: 0,
      total: 3,
    });
    expect(card.isProjectAdmin).toBe(true);
  });
});
