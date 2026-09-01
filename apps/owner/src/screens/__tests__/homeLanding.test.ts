import type { OwnerEconomicsSnapshot } from "../../lib/fetchOwnerEconomicsSnapshot";
import type { OwnerEconomicsStripeSnapshot } from "../../lib/fetchOwnerOpsRead";
import type { OwnerMonitoringOpsSnapshot } from "../../lib/fetchOwnerOpsRead";
import {
  billingDrift,
  deriveHomeAlert,
  derivePulseLevel,
  formatMoneyLabel,
  formatUpdatedAgo,
  homeUpdatedLine,
  monitoringDotTone,
  onHomeAlertPress,
  pulseBadgeLabel,
  supabaseProvider,
  trialCount,
  withoutSubRowCaption,
} from "../homeLanding";

const opsOk = (): OwnerMonitoringOpsSnapshot => ({
  generatedAt: "2026-09-01T02:00:00.000Z",
  providers: [
    { name: "stripe", state: "operational", detail: "ok", scope: "global_provider" },
    { name: "github", state: "operational", detail: "ok", scope: "global_provider" },
    { name: "supabase", state: "operational", detail: "ok", scope: "global_provider" },
  ],
  secretsPresent: {},
  githubRepo: { configured: false, detail: "n/a" },
  supabaseBackup: { state: "unavailable", detail: "n/a" },
  edgeLogs: { state: "unavailable", detail: "n/a" },
  authSignals: {
    state: "ok",
    listed: 10,
    unconfirmed: 2,
    banned: 0,
    signedInLast7d: 64,
    truncated: false,
  },
  note: "global",
});

const stripeLive = (
  overrides: Partial<OwnerEconomicsStripeSnapshot> = {},
): OwnerEconomicsStripeSnapshot => ({
  generatedAt: "2026-09-01T02:00:00.000Z",
  stripeConfigured: true,
  providerState: "ok",
  detail: "ok",
  mrrCents: 1_845_000,
  mrrEstimate: true,
  currency: "HKD",
  listIncomplete: false,
  subscriptionStatusCounts: {},
  trialCount: 3,
  pastDueCount: 0,
  reconcile: {
    state: "computed",
    aligned: 10,
    dbOnly: 0,
    stripeOnly: 0,
    statusMismatch: 0,
    flags: [],
  },
  ...overrides,
});

describe("homeLanding pulse", () => {
  it("is OK when Supabase is up and Stripe is clean", () => {
    const alert = deriveHomeAlert({ ops: opsOk(), stripe: stripeLive() });
    expect(alert).toBeNull();
    expect(derivePulseLevel({ ops: opsOk(), alert })).toBe("ok");
    expect(pulseBadgeLabel("ok")).toBe("OK");
  });

  it("pages P0 only for Supabase unavailable, not Stripe status or missing key", () => {
    const stripeDown = opsOk();
    stripeDown.providers = [
      { name: "stripe", state: "unavailable", detail: "unreachable", scope: "global_provider" },
      { name: "github", state: "unavailable", detail: "unreachable", scope: "global_provider" },
      { name: "supabase", state: "operational", detail: "ok", scope: "global_provider" },
    ];
    expect(deriveHomeAlert({ ops: stripeDown, stripe: stripeLive({ stripeConfigured: false }) })).toBeNull();

    const supabaseDown = opsOk();
    supabaseDown.providers = [
      { name: "supabase", state: "unavailable", detail: "unreachable", scope: "global_provider" },
    ];
    expect(deriveHomeAlert({ ops: supabaseDown, stripe: stripeLive() })).toEqual({
      severity: "p0",
      message: "Supabase unavailable — investigate",
      destination: "monitoring",
    });
    expect(derivePulseLevel({
      ops: supabaseDown,
      alert: deriveHomeAlert({ ops: supabaseDown, stripe: stripeLive() }),
    })).toBe("act");
  });

  it("pages P1 for reconcile drift only when Stripe is configured", () => {
    const drifted = stripeLive({
      reconcile: {
        state: "computed",
        aligned: 8,
        dbOnly: 1,
        stripeOnly: 1,
        statusMismatch: 0,
        flags: [],
      },
    });
    expect(billingDrift(drifted)).toBe(2);
    expect(deriveHomeAlert({ ops: opsOk(), stripe: drifted })).toEqual({
      severity: "p1",
      message: "2 subscriptions need review",
      destination: "economics",
    });
    expect(deriveHomeAlert({
      ops: opsOk(),
      stripe: { ...drifted, stripeConfigured: false },
    })).toBeNull();
  });

  it("never treats empty provider list or missing supabase as OK", () => {
    const empty = opsOk();
    empty.providers = [];
    expect(derivePulseLevel({ ops: empty, alert: null })).toBe("unknown");
    expect(derivePulseLevel({ ops: null, alert: null })).toBe("unknown");

    const noSupabase = opsOk();
    noSupabase.providers = [
      { name: "stripe", state: "operational", detail: "ok", scope: "global_provider" },
    ];
    expect(derivePulseLevel({ ops: noSupabase, alert: null })).toBe("unknown");
    expect(supabaseProvider(noSupabase)).toBeNull();
  });

  it("treats degraded supabase as watch without paging", () => {
    const degraded = opsOk();
    degraded.providers = [
      { name: "supabase", state: "degraded", detail: "slow", scope: "global_provider" },
    ];
    expect(deriveHomeAlert({ ops: degraded, stripe: stripeLive() })).toBeNull();
    expect(derivePulseLevel({ ops: degraded, alert: null })).toBe("watch");
  });
});

describe("homeLanding money", () => {
  it("formats HKD without inventing a number when unconfigured", () => {
    expect(formatMoneyLabel(stripeLive({ stripeConfigured: false })).value).toBe("—");
    expect(formatMoneyLabel(stripeLive()).value).toBe("HKD 18,450");
    expect(formatMoneyLabel(stripeLive({ mrrCents: null })).value).toBe("withheld");
  });

  it("uses Stripe trial count when configured, else Postgres trialsNotEnded", () => {
    const economics = {
      totals: { trialsNotEnded: 7 },
    } as OwnerEconomicsSnapshot;
    expect(trialCount(stripeLive({ trialCount: 3 }), economics)).toBe(3);
    expect(trialCount(stripeLive({ stripeConfigured: false, trialCount: 0 }), economics)).toBe(7);
  });
});

describe("homeLanding copy", () => {
  it("formats relative update time", () => {
    const now = Date.parse("2026-09-01T03:00:00.000Z");
    expect(formatUpdatedAgo("2026-09-01T02:58:00.000Z", now)).toBe("Updated 2m ago");
  });

  it("hides without-sub-row copy at zero", () => {
    expect(withoutSubRowCaption(0)).toBeNull();
    expect(withoutSubRowCaption(6)).toBe("6 without sub row");
  });

  it("finds the supabase provider by name", () => {
    expect(supabaseProvider(opsOk())?.name).toBe("supabase");
  });
});

describe("homeLanding interaction", () => {
  it("paints monitoring green only when supabase is operational", () => {
    expect(monitoringDotTone("operational")).toBe("green");
    expect(monitoringDotTone("degraded")).toBe("amber");
    expect(monitoringDotTone("unavailable")).toBe("red");
    expect(monitoringDotTone(undefined)).toBe("amber");
  });

  it("does not claim health when ops is missing", () => {
    expect(homeUpdatedLine("unknown", "2026-09-01T02:58:00.000Z")).toBe(
      "Health unknown — pull to retry",
    );
    expect(
      homeUpdatedLine("ok", "2026-09-01T02:58:00.000Z", Date.parse("2026-09-01T03:00:00.000Z")),
    ).toBe("Updated 2m ago");
  });

  it("routes P0 alert to Monitoring and P1 to Economics", () => {
    const nav = { onOpenMonitoring: jest.fn(), onOpenEconomics: jest.fn() };
    onHomeAlertPress(
      { severity: "p0", message: "x", destination: "monitoring" },
      nav,
    );
    expect(nav.onOpenMonitoring).toHaveBeenCalledTimes(1);
    expect(nav.onOpenEconomics).not.toHaveBeenCalled();

    nav.onOpenMonitoring.mockClear();
    onHomeAlertPress(
      { severity: "p1", message: "y", destination: "economics" },
      nav,
    );
    expect(nav.onOpenEconomics).toHaveBeenCalledTimes(1);
    expect(nav.onOpenMonitoring).not.toHaveBeenCalled();
  });
});
