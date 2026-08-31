jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
}));

import { Alert } from "react-native";

import { handleStatTilePress, isStatTileDisabled } from "../statTileLogic";

describe("StatTileRow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("invokes onPress for enabled tiles", () => {
    const onPress = jest.fn();
    handleStatTilePress({
      label: "Projects",
      value: 3,
      testID: "owner-tenant-company-detail__stat_projects",
      onPress,
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("shows Soon alert for disabled tasks tile without navigating", () => {
    const onPress = jest.fn();
    handleStatTilePress({
      label: "Tasks",
      value: 12,
      testID: "owner-tenant-company-detail__stat_tasks",
      disabled: true,
      disabledHint: "Task lists — next release",
      onPress,
    });
    expect(onPress).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith("Coming soon", "Task lists — next release");
  });

  it("treats tiles without onPress as disabled", () => {
    const tile = {
      label: "Tasks",
      value: "—",
      testID: "owner-tenant-user-detail__stat_tasks",
    };
    expect(isStatTileDisabled(tile)).toBe(true);
    handleStatTilePress(tile);
    expect(Alert.alert).toHaveBeenCalled();
  });
});
