import {
  buildSprint7SandboxAutomationUrl,
  handleAutomationLaunchUrl,
  parseAutomationLaunchUrl,
} from "@/navigation/screenAutomation";

describe("screen automation routes", () => {
  it("builds a deterministic Sprint 7 sandbox automation url", () => {
    expect(buildSprint7SandboxAutomationUrl("tristan")).toBe(
      "taskr://automation/sprint7/tristan",
    );
    expect(buildSprint7SandboxAutomationUrl("herman")).toBe(
      "taskr://automation/sprint7/herman",
    );
  });

  it("parses a Sprint 7 sandbox automation url into an actionable launch request", () => {
    expect(parseAutomationLaunchUrl("taskr://automation/sprint7/tristan")).toEqual({
      type: "sprint7-sandbox",
      actor: "tristan",
    });

    expect(parseAutomationLaunchUrl("taskr://automation/sprint7/herman")).toEqual({
      type: "sprint7-sandbox",
      actor: "herman",
    });
  });

  it("ignores unrelated deep links", () => {
    expect(parseAutomationLaunchUrl("taskr://verify/task/task-123")).toBeNull();
    expect(parseAutomationLaunchUrl("https://example.com")).toBeNull();
  });

  it("runs the Sprint 7 sandbox bootstrap for a recognized automation url", async () => {
    const runSprint7Sandbox = jest.fn().mockResolvedValue(undefined);

    await expect(
      handleAutomationLaunchUrl("taskr://automation/sprint7/herman", {
        runSprint7Sandbox,
      }),
    ).resolves.toBe(true);

    expect(runSprint7Sandbox).toHaveBeenCalledWith("herman");
  });

  it("does nothing for non-automation urls", async () => {
    const runSprint7Sandbox = jest.fn().mockResolvedValue(undefined);

    await expect(
      handleAutomationLaunchUrl("taskr://verify/task/task-123", {
        runSprint7Sandbox,
      }),
    ).resolves.toBe(false);

    expect(runSprint7Sandbox).not.toHaveBeenCalled();
  });
});
