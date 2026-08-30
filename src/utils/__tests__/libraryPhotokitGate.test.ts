import {
  isPhotokitGateBusy,
  resetPhotokitGateForTests,
  runExclusivePhotokitJob,
  waitForPhotokitGateIdle,
} from "../libraryPhotokitGate";

describe("libraryPhotokitGate", () => {
  beforeEach(() => {
    resetPhotokitGateForTests();
  });

  it("runs jobs strictly one at a time", async () => {
    const order: string[] = [];
    let releaseA!: () => void;
    const aGate = new Promise<void>((resolve) => {
      releaseA = resolve;
    });

    const a = runExclusivePhotokitJob("a", async () => {
      order.push("a-start");
      await aGate;
      order.push("a-end");
      return "a";
    });
    const b = runExclusivePhotokitJob("b", async () => {
      order.push("b-start");
      order.push("b-end");
      return "b";
    });

    expect(isPhotokitGateBusy()).toBe(true);
    await Promise.resolve();
    expect(order).toEqual(["a-start"]);

    releaseA();
    await expect(a).resolves.toBe("a");
    await expect(b).resolves.toBe("b");
    expect(order).toEqual(["a-start", "a-end", "b-start", "b-end"]);
    expect(isPhotokitGateBusy()).toBe(false);
  });

  it("keeps the queue alive after a rejected job", async () => {
    await expect(
      runExclusivePhotokitJob("fail", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    await expect(
      runExclusivePhotokitJob("ok", async () => "ok"),
    ).resolves.toBe("ok");
  });

  it("waitForPhotokitGateIdle resolves when depth hits 0", async () => {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const job = runExclusivePhotokitJob("hold", async () => {
      await hold;
    });
    const idle = waitForPhotokitGateIdle(5000);
    release();
    await job;
    await idle;
    expect(isPhotokitGateBusy()).toBe(false);
  });
});
