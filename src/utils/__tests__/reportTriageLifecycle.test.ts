import {
  areAssigneesLockedForStatus,
} from "@/ui/contracts/taskDelegationPermissions";
import {
  isResolvedReportStatus,
  isTerminalTaskStatus,
  isTriageStatus,
} from "@/utils/taskLifecycleStatus";
import { resolveClientTaskStatus } from "@/utils/taskCreateValidation";

describe("report triage lifecycle", () => {
  it("keeps reported unlocked for assignee edits during triage", () => {
    expect(areAssigneesLockedForStatus("reported")).toBe(false);
    expect(isTriageStatus("reported")).toBe(true);
  });

  it("treats resolved as closed audit state, not deleted", () => {
    expect(isResolvedReportStatus("resolved")).toBe(true);
    expect(isTerminalTaskStatus("resolved")).toBe(true);
    expect(
      resolveClientTaskStatus({
        status: "resolved",
        assigned_by: "worker-1",
        assigned_to: [],
      }),
    ).toBe("resolved");
  });

  it("preserves reported through client status resolution", () => {
    expect(
      resolveClientTaskStatus({
        status: "reported",
        assigned_by: "worker-1",
        assigned_to: [],
      }),
    ).toBe("reported");
  });
});
