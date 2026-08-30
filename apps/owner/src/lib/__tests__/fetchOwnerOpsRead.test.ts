import {
  parseMonitoringOpsSnapshot,
  parseEconomicsStripeSnapshot,
  fetchMonitoringOpsSnapshot,
  OwnerOpsError,
} from "../fetchOwnerOpsRead";

describe("parseMonitoringOpsSnapshot", () => {
  const valid = {
    generatedAt: "2026-08-30T00:00:00.000Z",
    providers: [
      {
        name: "stripe",
        state: "operational",
        detail: "All Systems Operational",
        scope: "global_provider",
      },
    ],
    secretsPresent: { STRIPE_SECRET_KEY: true, GITHUB_TOKEN: false },
    githubRepo: { configured: false, detail: "Not configured on DEV" },
    supabaseBackup: { state: "unavailable", detail: "Requires Management API" },
    edgeLogs: { state: "unavailable", detail: "Dashboard Logs" },
    authSignals: {
      listed: 10,
      unconfirmed: 1,
      banned: 0,
      signedInLast7d: 3,
      truncated: false,
      state: "ok",
    },
    note: "global",
  };

  it("parses providers and secret booleans", () => {
    const parsed = parseMonitoringOpsSnapshot(valid);
    expect(parsed.providers[0].name).toBe("stripe");
    expect(parsed.secretsPresent.STRIPE_SECRET_KEY).toBe(true);
    expect(parsed.secretsPresent.GITHUB_TOKEN).toBe(false);
  });

  it("rejects missing providers", () => {
    expect(() => parseMonitoringOpsSnapshot({ ...valid, providers: null })).toThrow(
      OwnerOpsError,
    );
  });
});

describe("parseEconomicsStripeSnapshot", () => {
  it("parses unconfigured Stripe honestly", () => {
    const parsed = parseEconomicsStripeSnapshot({
      generatedAt: "2026-08-30T00:00:00.000Z",
      stripeConfigured: false,
      providerState: "unavailable",
      detail: "Stripe: Not configured on DEV",
      mrrCents: null,
      currency: null,
      subscriptionStatusCounts: {},
      trialCount: 0,
      pastDueCount: 0,
      reconcile: {
        state: "unknown",
        aligned: 0,
        dbOnly: 0,
        stripeOnly: 0,
        statusMismatch: 0,
        flags: [],
      },
    });
    expect(parsed.stripeConfigured).toBe(false);
    expect(parsed.detail).toMatch(/Not configured/);
    expect(parsed.mrrCents).toBeNull();
  });

  it("parses reconcile flags", () => {
    const parsed = parseEconomicsStripeSnapshot({
      generatedAt: "2026-08-30T00:00:00.000Z",
      stripeConfigured: true,
      providerState: "ok",
      detail: "ok",
      mrrCents: 16000,
      currency: "HKD",
      subscriptionStatusCounts: { active: 1 },
      trialCount: 0,
      pastDueCount: 0,
      reconcile: {
        state: "computed",
        aligned: 1,
        dbOnly: 0,
        stripeOnly: 1,
        statusMismatch: 0,
        flags: [{ companyId: null, kind: "stripe_only", detail: "sub_x" }],
      },
    });
    expect(parsed.mrrCents).toBe(16000);
    expect(parsed.reconcile.stripeOnly).toBe(1);
    expect(parsed.reconcile.flags[0].kind).toBe("stripe_only");
  });
});

describe("fetchMonitoringOpsSnapshot", () => {
  it("throws not_configured when client missing", async () => {
    await expect(fetchMonitoringOpsSnapshot(null)).rejects.toMatchObject({
      code: "not_configured",
    });
  });

  it("invokes monitoringSnapshot action", async () => {
    const invoke = jest.fn(async () => ({
      data: {
        generatedAt: "2026-08-30T00:00:00.000Z",
        providers: [],
        secretsPresent: {},
        githubRepo: { configured: false, detail: "n/a" },
        supabaseBackup: { state: "unavailable", detail: "x" },
        edgeLogs: { state: "unavailable", detail: "y" },
        authSignals: {
          listed: 0,
          unconfirmed: 0,
          banned: 0,
          signedInLast7d: 0,
          truncated: false,
          state: "ok",
        },
        note: "",
      },
      error: null,
    }));
    await fetchMonitoringOpsSnapshot({ functions: { invoke } });
    expect(invoke).toHaveBeenCalledWith("owner-ops-read", {
      body: { action: "monitoringSnapshot" },
    });
  });
});
