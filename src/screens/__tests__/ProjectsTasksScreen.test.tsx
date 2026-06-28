import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import ProjectsTasksScreen from "../ProjectsTasksScreen";

jest.mock("@/state/authStore", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("@/state/companyStore", () => ({
  useCompanyStore: jest.fn(),
}));

jest.mock("@/state/projectFilterStore", () => ({
  useProjectFilterStore: jest.fn(),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStore: jest.fn(),
  useProjectStoreWithInit: jest.fn(),
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: jest.fn(),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStoreWithInit: jest.fn(),
}));

jest.mock("@/components/CompanyBanner", () => ({
  __esModule: true,
  default: function MockCompanyBanner() {
    return null;
  },
}));

jest.mock("@/components/StandardHeader", () => ({
  __esModule: true,
  default: function MockStandardHeader() {
    return null;
  },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("ProjectsTasksScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("filters rejected tasks using status instead of legacy currentStatus", () => {
    const { useAuthStore } = require("@/state/authStore");
    const { useCompanyStore } = require("@/state/companyStore");
    const { useProjectFilterStore } = require("@/state/projectFilterStore");
    const { useProjectStoreWithInit } = require("@/state/projectStore.supabase");
    const { useTaskStore } = require("@/state/taskStore.supabase");
    const { useUserStoreWithInit } = require("@/state/userStore.supabase");

    useAuthStore.mockReturnValue({
      user: {
        id: "user-1",
      },
    });

    useCompanyStore.mockReturnValue({
      getCompanyBanner: jest.fn(),
    });

    useProjectFilterStore.mockReturnValue({
      selectedProjectId: null,
      sectionFilter: null,
      statusFilter: null,
      clearSectionFilter: jest.fn(),
      clearStatusFilter: jest.fn(),
    });

    useProjectStoreWithInit.mockReturnValue({
      getProjectById: jest.fn(),
      getProjectsByUser: jest.fn().mockReturnValue([
        {
          id: "project-1",
          name: "North Tower",
        },
      ]),
      fetchProjects: jest.fn().mockResolvedValue(undefined),
    });

    useUserStoreWithInit.mockReturnValue({
      getUserById: jest.fn(),
    });

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-status-rejected",
          projectId: "project-1",
          title: "Status rejected task",
          description: "Should remain in rejected filter",
          dueDate: "2099-01-01T00:00:00.000Z",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-1",
          completionPercentage: 0,
          accepted: false,
          status: "rejected",
          currentStatus: "in_progress",
          attachments: [],
          delegationHistory: [],
          starredByUsers: [],
        },
        {
          id: "task-legacy-rejected",
          projectId: "project-1",
          title: "Legacy rejected task",
          description: "Should not be matched by rejected filter",
          dueDate: "2099-01-02T00:00:00.000Z",
          priority: "medium",
          assignedTo: ["user-1"],
          assignedBy: "user-1",
          completionPercentage: 30,
          accepted: true,
          status: "in_progress",
          currentStatus: "rejected",
          attachments: [],
          delegationHistory: [],
          starredByUsers: [],
        },
      ],
      taskReadStatuses: [],
      fetchTasks: jest.fn().mockResolvedValue(undefined),
      toggleTaskStar: jest.fn().mockResolvedValue(undefined),
      markTaskAsRead: jest.fn().mockResolvedValue(undefined),
    });

    const screen = render(
      <ProjectsTasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText("Rejected"));

    expect(screen.getByText("Status rejected task")).toBeTruthy();
    expect(screen.queryByText("Legacy rejected task")).toBeNull();
    expect(screen.getByText("rejected 0%")).toBeTruthy();
  });
});
