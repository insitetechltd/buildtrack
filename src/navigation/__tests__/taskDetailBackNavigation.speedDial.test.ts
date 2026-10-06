import { Alert } from "react-native";
import {
  handleCameraTabPress,
  navigateReportTriageAction,
  navigateTasksCreateWithIntent,
} from "../taskDetailBackNavigation";
import {
  getTasksCreateDialExpanded,
  setTasksCreateDialExpanded,
} from "../tasksCreateSpeedDialStore";
import { useAuthStore } from "../../state/authStore";
import { useTaskStore } from "../../state/taskStore.supabase";

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

const reportedDetailTabState = {
  index: 2,
  routes: [
    { name: "Activity" },
    { name: "Camera" },
    {
      name: "Tasks",
      state: {
        index: 1,
        routes: [
          { name: "TasksList" },
          { name: "TaskDetail", params: { taskId: "task-9" } },
        ],
      },
    },
  ],
};

describe("navigateReportTriageAction refuse empty resolve", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockOpenReport(resolveReport: jest.Mock, fetchTaskById: jest.Mock) {
    jest.spyOn(useTaskStore, "getState").mockReturnValue({
      tasks: [{ id: "task-9", status: "reported" }],
      resolveReport,
      fetchTaskById,
    } as ReturnType<typeof useTaskStore.getState>);
    jest.spyOn(useAuthStore, "getState").mockReturnValue({
      user: { id: "manager-1", role: "manager" },
    } as ReturnType<typeof useAuthStore.getState>);
  }

  it("does not close a report without a typed note", async () => {
    const resolveReport = jest.fn().mockResolvedValue(undefined);
    const fetchTaskById = jest.fn().mockResolvedValue(null);
    mockOpenReport(resolveReport, fetchTaskById);

    await navigateReportTriageAction(reportedDetailTabState, "resolve");

    expect(resolveReport).not.toHaveBeenCalled();
    expect(fetchTaskById).not.toHaveBeenCalled();
  });
});
