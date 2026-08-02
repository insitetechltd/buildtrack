import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

import ProjectPickerScreen from "@/screens/ProjectPickerScreen";

const mockSetSelectedProject = jest.fn(async () => {});
const mockFetchTasks = jest.fn(async () => {});
const mockFetchProjects = jest.fn(async () => {});
const mockFetchUserProjectAssignments = jest.fn(async () => {});
const mockFetchUsers = jest.fn(async () => {});

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithInit: () => ({
    getProjectsByUser: () => [
      { id: "project-1", name: "P1", description: "One", status: "active" },
      { id: "project-2", name: "P2", description: "Two", status: "active" },
    ],
    fetchProjects: mockFetchProjects,
    fetchUserProjectAssignments: mockFetchUserProjectAssignments,
    isLoading: false,
  }),
}));

jest.mock("@/state/projectFilterStore", () => ({
  useProjectFilterStore: () => ({
    selectedProjectId: "project-1",
    setSelectedProject: mockSetSelectedProject,
  }),
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: () => ({
    fetchTasks: mockFetchTasks,
  }),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStore: () => ({
    fetchUsers: mockFetchUsers,
  }),
}));

jest.mock("@/state/themeStore", () => ({
  useThemeStore: () => ({
    isDarkMode: false,
  }),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    projects: {
      selectProject: "Select project",
      yourProjects: "Your projects",
      noProjectsAvailable: "No projects",
      noProjectsMessage: "No projects",
    },
  }),
}));

jest.mock("@/components/StandardHeader", () => "StandardHeader");

describe("project switching journey", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("switches to a new project row through stable row test ids", async () => {
    const onNavigateBack = jest.fn();
    const view = render(<ProjectPickerScreen onNavigateBack={onNavigateBack} allowBack />);

    await act(async () => {
      fireEvent.press(view.getByTestId("projectPicker-project-project-2"));
      await Promise.resolve();
    });

    expect(mockSetSelectedProject).toHaveBeenCalledWith("project-2", "user-1");
    expect(mockFetchTasks).toHaveBeenCalled();
    expect(mockFetchProjects).toHaveBeenCalled();
    expect(mockFetchUserProjectAssignments).toHaveBeenCalledWith("user-1");
    expect(mockFetchUsers).toHaveBeenCalled();
    expect(onNavigateBack).toHaveBeenCalled();
  });
});
