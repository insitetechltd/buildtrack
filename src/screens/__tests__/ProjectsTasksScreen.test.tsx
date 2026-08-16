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

jest.mock("@/components/ModernScreenHeader", () => ({
  __esModule: true,
  default: function MockModernScreenHeader({
    title,
    subtitle,
    titleNode,
    rightElement,
  }: {
    title?: string;
    subtitle?: string;
    titleNode?: React.ReactNode;
    rightElement?: React.ReactNode;
  }) {
    const React = require("react");
    const { Text, View } = require("react-native");
    return React.createElement(
      View,
      null,
      titleNode || (title ? React.createElement(Text, null, title) : null),
      subtitle ? React.createElement(Text, null, subtitle) : null,
      rightElement || null,
    );
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

jest.mock("@/components/BrandHeaderTitle", () => ({
  __esModule: true,
  default: function MockBrandHeaderTitle({
    label,
    subtitle,
  }: {
    label?: string;
    subtitle?: string;
  }) {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, label || subtitle || "Brand");
  },
}));


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

  it("filters pending tasks using status instead of legacy accepted", () => {
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
          id: "task-status-pending",
          projectId: "project-1",
          title: "Status pending task",
          description: "Should remain in pending filter",
          dueDate: "2099-01-01T00:00:00.000Z",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-1",
          completionPercentage: 25,
          accepted: false,
          status: "in_progress",
          currentStatus: "not_started",
          attachments: [],
          delegationHistory: [],
          starredByUsers: [],
        },
        {
          id: "task-legacy-accepted",
          projectId: "project-1",
          title: "Legacy accepted task",
          description: "Should not be matched by pending filter",
          dueDate: "2099-01-02T00:00:00.000Z",
          priority: "medium",
          assignedTo: ["user-1"],
          assignedBy: "user-1",
          completionPercentage: 0,
          accepted: true,
          status: "new",
          currentStatus: "in_progress",
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

    fireEvent.press(screen.getByText("Pending"));

    expect(screen.getByText("Status pending task")).toBeTruthy();
    expect(screen.queryByText("Legacy accepted task")).toBeNull();
    expect(screen.getByText("in progress 25%")).toBeTruthy();
  });

  it("suppresses inbox parent rows when flat child tasks exist via parentTaskId instead of legacy subTasks arrays", () => {
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
          id: "task-parent",
          projectId: "project-1",
          title: "Parent task",
          description: "Parent task should stay hidden in inbox when a flat child exists",
          dueDate: "2099-01-01T00:00:00.000Z",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "manager-1",
          completionPercentage: 10,
          status: "in_progress",
          attachments: [],
          delegationHistory: [],
          starredByUsers: [],
        },
        {
          id: "task-child",
          parentTaskId: "task-parent",
          projectId: "project-1",
          title: "Child inbox task",
          description: "Flat child task should appear in inbox",
          dueDate: "2099-01-02T00:00:00.000Z",
          priority: "medium",
          assignedTo: ["user-1"],
          assignedBy: "manager-1",
          completionPercentage: 30,
          status: "in_progress",
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

    fireEvent.press(screen.getByText("Inbox"));

    expect(screen.getByText("Child inbox task")).toBeTruthy();
    expect(screen.queryByText("Parent task")).toBeNull();
  });

  it("keeps submitted-for-review tasks out of completed and excludes cancelled tasks from pending", () => {
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
          id: "task-review",
          projectId: "project-1",
          title: "Awaiting review",
          description: "Should not show as completed",
          dueDate: "2099-01-01T00:00:00.000Z",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "manager-1",
          completionPercentage: 100,
          status: "submitted_for_review",
          attachments: [],
          delegationHistory: [],
          starredByUsers: [],
        },
        {
          id: "task-approved",
          projectId: "project-1",
          title: "Approved task",
          description: "Should show as completed",
          dueDate: "2099-01-02T00:00:00.000Z",
          priority: "medium",
          assignedTo: ["user-1"],
          assignedBy: "manager-1",
          completionPercentage: 100,
          status: "approved",
          attachments: [],
          delegationHistory: [],
          starredByUsers: [],
        },
        {
          id: "task-cancelled",
          projectId: "project-1",
          title: "Cancelled task",
          description: "Should stay out of pending",
          dueDate: "2099-01-03T00:00:00.000Z",
          priority: "low",
          assignedTo: ["user-1"],
          assignedBy: "manager-1",
          completionPercentage: 20,
          status: "cancelled",
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

    fireEvent.press(screen.getByText("Inbox"));
    fireEvent.press(screen.getByText("Completed"));
    expect(screen.getByText("Approved task")).toBeTruthy();
    expect(screen.queryByText("Awaiting review")).toBeNull();

    fireEvent.press(screen.getByText("Pending"));
    expect(screen.queryByText("Cancelled task")).toBeNull();
  });
});
