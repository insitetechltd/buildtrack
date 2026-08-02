import { buildTaskDetailVerificationUrl } from "@/navigation/screenVerification";

describe("task detail verification journey", () => {
  it("builds a deterministic verification url for task detail", () => {
    expect(buildTaskDetailVerificationUrl("task-123")).toBe("taskr://verify/task/task-123");
  });
});
