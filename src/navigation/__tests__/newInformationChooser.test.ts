import { Alert } from "react-native";
import {
  canShowReportInChooser,
  isReportComingSoonForUser,
  promptNewInformationChooser,
} from "../newInformationChooser";

describe("newInformationChooser", () => {
  beforeEach(() => {
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    (Alert.alert as jest.Mock).mockRestore?.();
  });

  it("marks Report as coming-soon for managers and active for workers", () => {
    expect(
      canShowReportInChooser({ id: "w1", companyId: "c1", role: "worker" } as any),
    ).toBe(true);
    expect(
      isReportComingSoonForUser({
        id: "m1",
        companyId: "c1",
        role: "manager",
        systemPermission: "manager",
      } as any),
    ).toBe(true);
  });

  it("builds camera Alert Report | Update | Assign | Cancel for workers", () => {
    const onReport = jest.fn();
    const onAssign = jest.fn();
    const onUpdate = jest.fn();

    promptNewInformationChooser({
      user: { id: "w1", companyId: "c1", role: "worker" } as any,
      onReport,
      onAssign,
      onUpdate,
    });

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    expect(buttons.map((b) => b.text)).toEqual([
      "↑ Report",
      "↔ Update",
      "↓ Assign",
      "Cancel",
    ]);

    buttons.find((b) => b.text === "↑ Report")?.onPress?.();
    expect(onReport).toHaveBeenCalled();
  });

  it("shows Coming soon when PM taps Report, still lists Report", () => {
    const onReport = jest.fn();
    promptNewInformationChooser({
      user: {
        id: "m1",
        companyId: "c1",
        role: "manager",
        systemPermission: "manager",
      } as any,
      onReport,
      onAssign: jest.fn(),
      onUpdate: jest.fn(),
    });

    const firstAlertButtons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    expect(firstAlertButtons.map((b) => b.text)).toEqual([
      "↑ Report",
      "↔ Update",
      "↓ Assign",
      "Cancel",
    ]);

    firstAlertButtons.find((b) => b.text === "↑ Report")?.onPress?.();
    expect(onReport).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith("Report - Coming soon");
  });
});
