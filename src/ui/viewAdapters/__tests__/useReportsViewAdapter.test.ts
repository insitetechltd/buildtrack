import { renderHook } from "@testing-library/react-native";

import { useReportsViewAdapter } from "../useReportsViewAdapter";

jest.mock("@/state/authStore", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("@/state/projectFilterStore", () => ({
  useProjectFilterStore: jest.fn(),
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: jest.fn(),
}));

jest.mock("@/utils/dateFormatter", () => ({
  useDateFormatter: jest.fn(),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: jest.fn(),
}));

describe("useReportsViewAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("derives report stats and row labels from status instead of currentStatus", () => {
    const now = new Date().toISOString();
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { useAuthStore } = require("@/state/authStore");
    const { useProjectFilterStore } = require("@/state/projectFilterStore");
    const { useTaskStore } = require("@/state/taskStore.supabase");
    const { useDateFormatter } = require("@/utils/dateFormatter");
    const { useTranslation } = require("@/utils/useTranslation");

    useAuthStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        user: {
          id: "user-1",
        },
      }),
    );

    useProjectFilterStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        selectedProjectId: null,
      }),
    );

    useTaskStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        tasks: [
          {
            id: "task-complete",
            projectId: "project-1",
            title: "Final inspection",
            assignedTo: ["user-1"],
            assignedBy: "manager-1",
            createdAt: now,
            dueDate: futureDate,
            priority: "high",
            status: "completed",
            currentStatus: "in_progress",
            completionPercentage: 100,
          },
          {
            id: "task-progress",
            projectId: "project-1",
            title: "Install anchors",
            assignedTo: ["user-1"],
            assignedBy: "manager-1",
            createdAt: now,
            dueDate: futureDate,
            priority: "medium",
            status: "in_progress",
            currentStatus: "completed",
            completionPercentage: 35,
          },
        ],
      }),
    );

    useDateFormatter.mockReturnValue({
      formatDateShort: (value: string | Date) =>
        value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10),
    });

    useTranslation.mockReturnValue({
      reports: {
        totalTasks: "Total Tasks",
        completed: "Completed",
        inProgress: "In Progress",
        overdue: "Overdue",
        avgCompletion: "Avg Completion",
        criticalPriority: "Critical Priority",
        myTasks: "My Tasks",
        assignedTasks: "Assigned Tasks",
        reportGenerated: "Report Generated",
        reportContains: "Report contains",
        tasksFrom: "tasks from",
        toDate: "to",
        exportAsPDF: "Export as PDF",
        viewSummary: "View Summary",
        reportSummary: "Report Summary",
      },
      taskDetail: {
        due: "Due",
      },
      common: {
        ok: "OK",
      },
    });

    const { result } = renderHook(() => useReportsViewAdapter());

    const completedCard = result.current.output.statisticsCards.find(
      (card) => card.id === "reports-stat:completed",
    );
    const inProgressCard = result.current.output.statisticsCards.find(
      (card) => card.id === "reports-stat:in_progress",
    );

    expect(completedCard?.value).toBe(1);
    expect(inProgressCard?.value).toBe(1);
    expect(result.current.output.visibleTaskRows.map((row) => row.statusLabel)).toEqual([
      "completed",
      "in progress",
    ]);
  });
});
