import {
  buildResourceKey,
  clearRequestCoordinator,
  getRequestCacheEnvelope,
  runSingleFlightRequest,
} from "../supabase";

describe("supabase request coordinator", () => {
  beforeEach(() => {
    clearRequestCoordinator();
  });

  it("deduplicates in-flight requests for the same resource key", async () => {
    let executions = 0;

    const fetcher = async () => {
      executions += 1;
      await Promise.resolve();
      return { ok: true, count: executions };
    };

    const [first, second] = await Promise.all([
      runSingleFlightRequest("tasks:project:project-123", fetcher, {
        staleMs: 15_000,
        ttlMs: 60_000,
      }),
      runSingleFlightRequest("tasks:project:project-123", fetcher, {
        staleMs: 15_000,
        ttlMs: 60_000,
      }),
    ]);

    expect(executions).toBe(1);
    expect(first.data).toEqual({ ok: true, count: 1 });
    expect(second.data).toEqual({ ok: true, count: 1 });
    expect(second.source).toBe("inflight");
  });

  it("stores cache envelope timestamps for resolved resources", async () => {
    const before = Date.now();

    await runSingleFlightRequest("projects:user:user-123", async () => ["project-1"], {
      staleMs: 60_000,
      ttlMs: 300_000,
    });

    const envelope = getRequestCacheEnvelope<string[]>("projects:user:user-123");

    expect(envelope).not.toBeNull();
    expect(envelope?.lastFetchedAt).not.toBeNull();
    expect(envelope?.staleAt).toBe(before + 60_000);
    expect(envelope?.expiresAt).toBe(before + 300_000);
    expect(envelope?.data).toEqual(["project-1"]);
  });

  it("builds stable colon-delimited resource keys", () => {
    expect(buildResourceKey("projects", "user", "user-123")).toBe("projects:user:user-123");
    expect(buildResourceKey("tasks", "project", "project-123")).toBe("tasks:project:project-123");
  });
});
