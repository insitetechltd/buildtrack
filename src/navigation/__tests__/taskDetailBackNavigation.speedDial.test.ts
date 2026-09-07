import { Alert } from "react-native";
import {
  handleCameraTabPress,
  navigateTasksCreateWithIntent,
} from "../taskDetailBackNavigation";
import {
  getTasksCreateDialExpanded,
  setTasksCreateDialExpanded,
} from "../tasksCreateSpeedDialStore";

jest.mock("../captureFirstCameraFlow", () => ({
  promptCaptureFirstSource: jest.fn(),
}));

jest.mock("../rootNavigationRef", () => ({
  rootNavigationRef: {
    isReady: () => true,
    navigate: jest.fn(),
  },
}));

const { promptCaptureFirstSource } = jest.requireMock("../captureFirstCameraFlow");
const { rootNavigationRef } = jest.requireMock("../rootNavigationRef");

describe("handleCameraTabPress tasks speed-dial", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setTasksCreateDialExpanded(false);
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    (Alert.alert as jest.Mock).mockRestore?.();
  });

  it("toggles speed-dial on Tasks list instead of opening Update chooser", () => {
    const navigate = jest.fn();
    const tasksListState = {
      index: 2,
      routes: [
        { name: "Activity", state: { index: 0, routes: [{ name: "DashboardMain" }] } },
        { name: "Camera" },
        { name: "Tasks", state: { index: 0, routes: [{ name: "TasksList" }] } },
      ],
    };

    handleCameraTabPress({
      event: { preventDefault: jest.fn() },
      navigation: { getState: () => tasksListState, navigate },
    });
    expect(getTasksCreateDialExpanded()).toBe(true);
    expect(promptCaptureFirstSource).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();

    handleCameraTabPress({
      event: { preventDefault: jest.fn() },
      navigation: { getState: () => tasksListState, navigate },
    });
    expect(getTasksCreateDialExpanded()).toBe(false);
  });

  it("navigateTasksCreateWithIntent opens CreateTask with intent via root ref", () => {
    setTasksCreateDialExpanded(true);
    navigateTasksCreateWithIntent({ navigate: jest.fn() }, "report");
    expect(getTasksCreateDialExpanded()).toBe(false);
    expect(rootNavigationRef.navigate).toHaveBeenCalledWith(
      "MainTabs",
      expect.objectContaining({
        screen: "Tasks",
        params: expect.objectContaining({
          screen: "CreateTask",
          params: expect.objectContaining({ intent: "report" }),
        }),
      }),
    );
  });
});
