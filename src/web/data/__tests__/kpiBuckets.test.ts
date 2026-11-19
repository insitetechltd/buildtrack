import {
  accumulateProjectStages,
  accumulateTaskCounts,
  classifyProjectStage,
  classifyTaskLifecycle,
  wasTouchedInWindow,
} from "../kpiBuckets";

describe("kpiBuckets", () => {
  it("classifies task lifecycle into closed / active / idle", () => {
    expect(classifyTaskLifecycle("completed")).toBe("closed");
    expect(classifyTaskLifecycle("in_progress")).toBe("active");
    expect(classifyTaskLifecycle("reviewing")).toBe("active");
    expect(classifyTaskLifecycle("new")).toBe("idle");
    expect(classifyTaskLifecycle("assigned")).toBe("idle");
  });

  it("classifies project stages", () => {
    expect(classifyProjectStage("active")).toBe("active");
    expect(classifyProjectStage("on_hold")).toBe("active");
    expect(classifyProjectStage("planning")).toBe("idle");
    expect(classifyProjectStage("completed")).toBe("closed");
    expect(classifyProjectStage("cancelled")).toBe("closed");
  });

  it("accumulates task counts including overdue on open tasks", () => {
    const counts = accumulateTaskCounts([
      { status: "new", due_date: null },
      { status: "in_progress", due_date: null },
      { status: "completed", due_date: null },
      { status: "new", due_date: "2000-01-01T00:00:00.000Z" },
    ]);
    expect(counts.total).toBe(4);
    expect(counts.idle).toBe(2);
    expect(counts.active).toBe(1);
    expect(counts.closed).toBe(1);
    expect(counts.overdue).toBeGreaterThanOrEqual(1);
  });

  it("accumulates project stage counts", () => {
    const stages = accumulateProjectStages([
      { status: "active" },
      { status: "planning" },
      { status: "completed" },
      { status: "cancelled" },
    ]);
    expect(stages).toEqual({ active: 1, idle: 1, closed: 2, total: 4 });
  });

  it("detects past-week touch via updated_at", () => {
    const sinceIso = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    expect(
      wasTouchedInWindow({
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: new Date().toISOString(),
        sinceIso,
      }),
    ).toBe(true);
    expect(
      wasTouchedInWindow({
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-02T00:00:00.000Z",
        sinceIso,
      }),
    ).toBe(false);
  });
});
