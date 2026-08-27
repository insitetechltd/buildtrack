import {
  countCompanySeatUsage,
  projectSeatUsageAfterChange,
  resolveSeatLimits,
  roleChangeExceedsSeatLimit,
  seatClassForRole,
  seatClassForUser,
  seatLimitReached,
  STARTER_DEFAULT_SEAT_LIMITS,
} from "../seatUsage";
import { waitForSeatLimitIncrease } from "../waitForSeatLimitIncrease";

describe("seatClassForRole / seatClassForUser", () => {
  it("maps CA to worker and PM roles to pm", () => {
    expect(seatClassForRole("admin")).toBe("worker");
    expect(seatClassForRole("company_admin")).toBe("worker");
    expect(seatClassForRole("supervisor")).toBe("pm");
    expect(seatClassForRole("manager")).toBe("pm");
    expect(seatClassForRole("worker")).toBe("worker");
  });

  it("lets deployableSeat override CA default to pm", () => {
    expect(
      seatClassForUser({
        id: "ca",
        role: "admin",
        deployableSeat: "pm",
      }),
    ).toBe("pm");
    expect(
      seatClassForUser({
        id: "ca",
        role: "admin",
      }),
    ).toBe("worker");
  });
});

describe("countCompanySeatUsage", () => {
  it("counts company admin toward worker seats by default (not PM)", () => {
    const usage = countCompanySeatUsage([
      {
        id: "ca",
        role: "admin",
        isActive: true,
        isPending: false,
      },
      {
        id: "w1",
        role: "worker",
        isActive: true,
        isPending: false,
      },
      {
        id: "w2",
        role: "worker",
        isActive: true,
        isPending: true,
      },
      {
        id: "inactive",
        role: "worker",
        isActive: false,
        isPending: false,
      },
    ]);

    expect(usage).toEqual({ pmCount: 0, workerCount: 3 });
  });

  it("counts CA with deployableSeat=pm toward PM seats", () => {
    const usage = countCompanySeatUsage([
      {
        id: "ca",
        role: "admin",
        deployableSeat: "pm",
        isActive: true,
        isPending: false,
      },
      {
        id: "w1",
        role: "worker",
        isActive: true,
        isPending: false,
      },
    ]);

    expect(usage).toEqual({ pmCount: 1, workerCount: 1 });
  });

  it("blocks worker invites at worker seat limit", () => {
    expect(
      seatLimitReached(
        "worker",
        { pmCount: 1, workerCount: 5 },
        { pmSeatLimit: 1, workerSeatLimit: 5 },
      ),
    ).toBe(true);
    expect(
      seatLimitReached(
        "pm",
        { pmCount: 1, workerCount: 5 },
        { pmSeatLimit: 1, workerSeatLimit: 5 },
      ),
    ).toBe(true);
  });
});

describe("resolveSeatLimits / bootstrap", () => {
  it("treats missing entitlements as Starter 1 PM + 5 workers", () => {
    expect(resolveSeatLimits(null)).toEqual(STARTER_DEFAULT_SEAT_LIMITS);
    expect(resolveSeatLimits(undefined)).toEqual({
      pmSeatLimit: 1,
      workerSeatLimit: 5,
    });
  });

  it("allows founding company admin alone under Starter defaults as worker seat", () => {
    const foundingOnly = [
      { id: "ca", role: "admin" as const, isActive: true, isPending: false },
    ];
    const limits = resolveSeatLimits(null);
    const result = roleChangeExceedsSeatLimit(foundingOnly, limits, {
      userId: "ca",
      nextRole: "admin",
      nextIsActive: true,
    });
    expect(result.exceeds).toBe(false);
    expect(result.usage).toEqual({ pmCount: 0, workerCount: 1 });
    expect(seatLimitReached("worker", result.usage, limits)).toBe(false);
    expect(seatLimitReached("pm", result.usage, limits)).toBe(false);
  });

  it("allows inviting a PM when founding CA only consumes a worker seat", () => {
    const roster = [
      { id: "ca", role: "admin" as const, isActive: true, isPending: false },
      { id: "w1", role: "worker" as const, isActive: true, isPending: false },
    ];
    const result = roleChangeExceedsSeatLimit(
      roster,
      resolveSeatLimits(null),
      { userId: "w1", nextRole: "supervisor" },
    );
    expect(result.exceeds).toBe(false);
    expect(result.usage).toEqual({ pmCount: 1, workerCount: 1 });
  });

  it("blocks upgrading CA to PM deployable seat when PM cap is full", () => {
    const roster = [
      { id: "ca", role: "admin" as const, isActive: true, isPending: false },
      {
        id: "pm",
        role: "supervisor" as const,
        isActive: true,
        isPending: false,
      },
    ];
    const result = roleChangeExceedsSeatLimit(
      roster,
      { pmSeatLimit: 1, workerSeatLimit: 5 },
      { userId: "ca", nextRole: "admin", nextDeployableSeat: "pm" },
    );
    expect(result.exceeds).toBe(true);
    expect(result.seatType).toBe("pm");
    expect(result.usage.pmCount).toBe(2);
  });
});

describe("roleChangeExceedsSeatLimit", () => {
  const roster = [
    { id: "ca", role: "admin" as const, isActive: true, isPending: false },
    { id: "w1", role: "worker" as const, isActive: true, isPending: false },
  ];
  const limits = { pmSeatLimit: 1, workerSeatLimit: 5 };

  it("rejects assigning a second PM when only 1 PM seat exists", () => {
    const withPm = [
      ...roster,
      { id: "pm", role: "supervisor" as const, isActive: true, isPending: false },
    ];
    const result = roleChangeExceedsSeatLimit(withPm, limits, {
      userId: "w1",
      nextRole: "supervisor",
    });
    expect(result.exceeds).toBe(true);
    expect(result.seatType).toBe("pm");
    expect(result.usage.pmCount).toBe(2);
  });

  it("allows demoting a PM to worker when worker seats remain", () => {
    const withPm = [
      ...roster,
      { id: "pm", role: "supervisor" as const, isActive: true, isPending: false },
    ];
    const proLimits = { pmSeatLimit: 2, workerSeatLimit: 5 };
    const result = roleChangeExceedsSeatLimit(withPm, proLimits, {
      userId: "pm",
      nextRole: "worker",
    });
    expect(result.exceeds).toBe(false);
    expect(
      projectSeatUsageAfterChange(withPm, {
        userId: "pm",
        nextRole: "worker",
      }),
    ).toEqual({ pmCount: 0, workerCount: 3 });
  });
});

describe("waitForSeatLimitIncrease", () => {
  it("resolves once entitlements show a higher seat cap", async () => {
    const fetchView = jest
      .fn()
      .mockResolvedValueOnce({
        meterLimits: { pm_seats: 1, worker_seats: 5 },
      })
      .mockResolvedValueOnce({
        meterLimits: { pm_seats: 1, worker_seats: 10 },
      });

    const result = await waitForSeatLimitIncrease({
      companyId: "c1",
      baseline: { pmSeatLimit: 1, workerSeatLimit: 5 },
      seatType: "worker",
      timeoutMs: 2000,
      intervalMs: 10,
      fetchView: fetchView as never,
    });

    expect(result).toEqual({ pmSeatLimit: 1, workerSeatLimit: 10 });
    expect(fetchView).toHaveBeenCalledTimes(2);
  });

  it("returns null when the webhook never lifts the cap", async () => {
    const fetchView = jest.fn().mockResolvedValue({
      meterLimits: { pm_seats: 1, worker_seats: 5 },
    });

    const result = await waitForSeatLimitIncrease({
      companyId: "c1",
      baseline: { pmSeatLimit: 1, workerSeatLimit: 5 },
      seatType: "worker",
      timeoutMs: 40,
      intervalMs: 10,
      fetchView: fetchView as never,
    });

    expect(result).toBeNull();
  });
});
