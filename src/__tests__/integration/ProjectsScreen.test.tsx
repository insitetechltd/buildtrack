import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import ProjectsScreen from "@/screens/ProjectsScreen";

jest.mock(
  "../../ui/viewAdapters/useProjectsViewAdapter",
  () => ({
    useProjectsViewAdapter: jest.fn(),
  }),
);

jest.mock("@/components/StandardHeader", () => ({
  __esModule: true,
  default: function MockStandardHeader({
    title,
  }: {
    title: string;
  }) {
    const { Text } = require("react-native");

    return <Text>{title}</Text>;
  },
}));

jest.mock("@/components/LogoutFAB", () => ({
  __esModule: true,
  default: function MockLogoutFAB() {
    return null;
  },
}));

jest.mock("@/components/ModalHandle", () => ({
  __esModule: true,
  default: function MockModalHandle() {
    return null;
  },
}));

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: {
      id: "user-1",
      role: "admin",
      companyId: "company-1",
    },
  }),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithCompanyInit: () => ({
    projects: [
      {
        id: "project-1",
        name: "Tower A",
        description: "Core package",
        status: "active",
        location: "Central Site",
        createdBy: "user-2",
        clientInfo: { name: "Acme" },
        companyId: "company-1",
        startDate: "2026-01-01T00:00:00.000Z",
        endDate: "2026-12-31T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    getProjectsByCompany: () => [
      {
        id: "project-1",
        name: "Tower A",
        description: "Core package",
        status: "active",
        location: "Central Site",
        createdBy: "user-2",
        clientInfo: { name: "Acme" },
        companyId: "company-1",
        startDate: "2026-01-01T00:00:00.000Z",
        endDate: "2026-12-31T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    getProjectsByUser: jest.fn(),
    getProjectStats: () => ({
      totalUsers: 4,
      usersByCategory: {
        project_manager: 1,
        team_member: 3,
        lead_project_manager: 0,
        admin: 0,
      },
      isActive: true,
    }),
    updateProject: jest.fn().mockResolvedValue(undefined),
    getProjectUserAssignments: jest.fn(),
    assignUserToProject: jest.fn().mockResolvedValue(undefined),
    removeUserFromProject: jest.fn().mockResolvedValue(undefined),
    getLeadPMForProject: () => "user-3",
    fetchProjects: jest.fn().mockResolvedValue(undefined),
    fetchUserProjectAssignments: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStoreWithInit: () => ({
    getUserById: (userId: string) =>
      userId === "user-2"
        ? { id: "user-2", name: "Casey Rivera" }
        : { id: "user-3", name: "Jordan Lee", role: "manager" },
    getUsersByCompany: () => [{ id: "user-3", name: "Jordan Lee", role: "manager" }],
    fetchUsers: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/state/companyStore", () => ({
  useCompanyStore: () => ({
    getCompanyById: jest.fn(),
    getCompanyBanner: jest.fn(),
  }),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    projects: {
      projects: "Projects",
      project: "project",
      projectsPlural: "projects",
      searchProjects: "Search projects...",
      loadingProjects: "Loading projects...",
      assignedToYou: "assigned to you",
      noProjects: "No projects yet",
      noProjectsFound: "No projects found",
      tryAdjustingSearch: "Try adjusting your search or filters",
      createFirstProject: "Create your first project to get started",
      noProjectsMessage: "You haven't been assigned to any projects yet",
      createProject: "Create Project",
      all: "All",
      active: "Active",
      planning: "Planning",
      onHold: "On Hold",
      completed: "Completed",
      cancelled: "Cancelled",
      leadPM: "Lead PM",
      noLocation: "No location",
      member: "member",
      members: "members",
      budget: "Budget",
      createdBy: "Created by",
      unknown: "Unknown",
      projectUpdated: "Project updated successfully",
      projectInformation: "Project Information",
      projectName: "Project Name",
      enterProjectName: "Enter project name",
      projectDescription: "Project description",
      status: "Status",
      location: "Location",
      enterFullAddress: "Enter full address",
      projectTimeline: "Project Timeline",
      startDate: "Start Date",
      estimatedEndDate: "Estimated End Date",
      leadProjectManager: "Lead Project Manager",
      leadPMDescription: "Lead PM details",
      noLeadPM: "No Lead PM (Select one)",
      projectNameRequired: "Project name is required",
      endDateError: "End date must be after start date",
      editProject: "Edit Project",
    },
    errors: {
      success: "Success",
    },
    common: {
      save: "Save",
    },
  }),
}));

jest.mock("@/utils/dateFormatter", () => ({
  useDateFormatter: () => ({
    formatDateShort: (value: string | Date) =>
      value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10),
  }),
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

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: "DateTimePicker",
}));
jest.mock("@react-native-picker/picker", () => ({
  Picker: "Picker",
}));

describe("ProjectsScreen", () => {
  const mockSetSearchQuery = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const { useProjectsViewAdapter } = require("../../ui/viewAdapters/useProjectsViewAdapter");

    useProjectsViewAdapter.mockReturnValue({
      output: {
        screenId: "ProjectsScreen",
        readiness: {
          hasInitialFrame: true,
          hasUsableData: true,
          isBackgroundRefreshing: false,
          isNavigationTransitionActive: false,
        },
        continuity: {
          isInitialLoading: false,
          isBackgroundRefreshing: false,
          hasCachedFrame: true,
          shouldRenderSkeletonShell: false,
          shouldRenderEmptyState: false,
          freshnessLabel: "Ready",
        },
        searchQuery: "",
        statusFilter: "all",
        projectCountLabel: "1 project",
        isRefreshing: false,
        isAdmin: true,
        projectItems: [
          {
            id: "projects:project-1",
            projectId: "project-1",
            title: "Tower A",
            description: "Core package",
            statusValue: "active",
            statusLabel: "active",
            locationLabel: "Central Site",
            memberCountLabel: "4 members",
            clientName: "Acme",
            startDateLabel: "2026-01-01",
            createdByLabel: "Casey Rivera",
            leadPmName: "Jordan Lee",
            canEdit: true,
            density: "standard",
            structuralState: "stale",
          },
        ],
        filterOptions: [
          {
            id: "projects-filter:all",
            value: "all",
            label: "All",
            isSelected: true,
          },
        ],
        emptyState: {
          title: "No projects yet",
          message: "You haven't been assigned to any projects yet",
          showCreateAction: true,
        },
        editingProject: null,
        isEditModalVisible: false,
      },
      actions: {
        setSearchQuery: mockSetSearchQuery,
        selectStatusFilter: jest.fn(),
        handleRefresh: jest.fn(),
        openEditProject: jest.fn(),
        closeEditProject: jest.fn(),
        saveEditedProject: jest.fn(),
      },
    });
  });

  it("renders projects content and delegates search updates through the projects adapter", () => {
    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    expect(screen.getByText("Projects")).toBeTruthy();
    expect(screen.getByPlaceholderText("Search projects...")).toBeTruthy();
    expect(screen.getByText("Tower A")).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText("Search projects..."), "Tower");

    expect(mockSetSearchQuery).toHaveBeenCalledWith("Tower");
  });
});
