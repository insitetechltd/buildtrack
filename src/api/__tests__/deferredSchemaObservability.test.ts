import {
  getDeferredFallbackFireCounts,
  recordDeferredFallbackFire,
  resetDeferredFallbackObservability,
} from "../deferredSchemaObservability";

describe("deferredSchemaObservability", () => {
  beforeEach(() => {
    resetDeferredFallbackObservability();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("counts fires by op and field", () => {
    recordDeferredFallbackFire({
      op: "createTask",
      deferredField: "primary_assignee_id",
      errorCode: "PGRST204",
    });
    recordDeferredFallbackFire({
      op: "updateTask",
      deferredField: "tags",
      errorCode: "42703",
    });
    recordDeferredFallbackFire({
      op: "createTask",
      deferredField: "primary_assignee_id",
    });

    const counts = getDeferredFallbackFireCounts();
    expect(counts.total).toBe(3);
    expect(counts.byOp.createTask).toBe(2);
    expect(counts.byOp.updateTask).toBe(1);
    expect(counts.byField.primary_assignee_id).toBe(2);
    expect(counts.byField.tags).toBe(1);
    expect(counts.recent).toHaveLength(3);
  });

  it("emits a structured warn line", () => {
    recordDeferredFallbackFire({
      op: "updateTask",
      deferredField: "location_on_site",
      errorCode: "PGRST204",
    });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("[deferred_schema_fallback]"),
    );
    const line = String((console.warn as jest.Mock).mock.calls[0][0]);
    expect(line).toContain('"op":"updateTask"');
    expect(line).toContain("location_on_site");
  });
});
