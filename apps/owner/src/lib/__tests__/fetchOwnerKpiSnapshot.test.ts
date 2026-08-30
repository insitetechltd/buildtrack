import {
  mapOwnerKpiHttpError,
  parseOwnerKpiSnapshot,
  fetchOwnerKpiSnapshot,
  OwnerKpiError,
} from "../fetchOwnerKpiSnapshot";

describe("parseOwnerKpiSnapshot", () => {
  const valid = {
    window: "7d",
    generatedAt: "2026-08-30T00:00:00.000Z",
    since: "2026-08-23T00:00:00.000Z",
    timezone: "UTC",
    semantics: "created_at",
    metrics: { companies: 1, projects: 2, tasks: 3, users: 4 },
  };

  it("parses a valid payload", () => {
    expect(parseOwnerKpiSnapshot(valid).metrics.tasks).toBe(3);
  });

  it("parses histogram series when present", () => {
    const parsed = parseOwnerKpiSnapshot({
      ...valid,
      histograms: {
        tasks: {
          bucketUnit: "day",
          buckets: [
            { start: "2026-08-23T00:00:00.000Z", label: "08/23", count: 2 },
            { start: "2026-08-24T00:00:00.000Z", label: "08/24", count: 1 },
          ],
        },
      },
    });
    expect(parsed.histograms?.tasks?.buckets).toHaveLength(2);
    expect(parsed.histograms?.tasks?.buckets[0].count).toBe(2);
  });

  it("omits invalid histogram payloads", () => {
    const parsed = parseOwnerKpiSnapshot({
      ...valid,
      histograms: { tasks: { bucketUnit: "week", buckets: [] } },
    });
    expect(parsed.histograms).toBeUndefined();
  });

  it("rejects missing metrics", () => {
    expect(() => parseOwnerKpiSnapshot({ ...valid, metrics: null })).toThrow(
      OwnerKpiError,
    );
  });
});

describe("mapOwnerKpiHttpError", () => {
  it("maps 401 / 403 / 400", () => {
    expect(mapOwnerKpiHttpError(401, { error: "not_authenticated" }).code).toBe(
      "not_authenticated",
    );
    expect(mapOwnerKpiHttpError(403, { error: "forbidden" }).code).toBe("forbidden");
    expect(mapOwnerKpiHttpError(400, { error: "invalid_window" }).code).toBe(
      "invalid_window",
    );
  });
});

describe("fetchOwnerKpiSnapshot", () => {
  it("throws not_configured when client missing", async () => {
    await expect(fetchOwnerKpiSnapshot(null)).rejects.toMatchObject({
      code: "not_configured",
    });
  });

  it("returns parsed data on success", async () => {
    const client = {
      functions: {
        invoke: jest.fn(async () => ({
          data: {
            window: "today",
            generatedAt: "2026-08-30T01:00:00.000Z",
            since: "2026-08-30T00:00:00.000Z",
            timezone: "UTC",
            semantics: "x",
            metrics: { companies: 0, projects: 0, tasks: 5, users: 1 },
          },
          error: null,
        })),
      },
    };
    const snap = await fetchOwnerKpiSnapshot(client, "today");
    expect(snap.window).toBe("today");
    expect(snap.metrics.tasks).toBe(5);
    expect(client.functions.invoke).toHaveBeenCalledWith("owner-kpi-snapshot", {
      body: { window: "today" },
    });
  });
});
