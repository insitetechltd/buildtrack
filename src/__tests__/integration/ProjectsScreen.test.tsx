import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, ScrollView } from "react-native";

import ProjectsScreen from "@/screens/ProjectsScreen";
import type { Project } from "@/types/buildtrack";
import type {
  ProjectsScreenFilterOption,
  ProjectsScreenProjectItem,
  ProjectsScreenViewAdapterOutput,
} from "@/ui/contracts/viewAdapters";

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
    rightElement,
  }: {
    title: string;
    rightElement?: React.ReactNode;
  }) {
    const { Text, View } = require("react-native");

    return (
      <View>
        <Text>{title}</Text>
        {rightElement}
      </View>
    );
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

const mockGetProjectsByCompany = jest.fn(() => [
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
]);
const mockGetProjectStats = jest.fn(() => ({
  totalUsers: 4,
  usersByCategory: {
    project_manager: 1,
    team_member: 3,
    lead_project_manager: 0,
    admin: 0,
  },
  isActive: true,
}));
const mockUpdateProject = jest.fn().mockResolvedValue(undefined);
const mockGetProjectUserAssignments = jest.fn();
const mockAssignUserToProject = jest.fn().mockResolvedValue(undefined);
const mockRemoveUserFromProject = jest.fn().mockResolvedValue(undefined);
const mockUpdateUserProjectCategory = jest.fn().mockResolvedValue(undefined);
const mockGetLeadPMForProject = jest.fn(() => "user-3");
const mockFetchProjects = jest.fn().mockResolvedValue(undefined);
const mockFetchUserProjectAssignments = jest.fn().mockResolvedValue(undefined);
const mockProjectStore = {
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
  getProjectsByCompany: mockGetProjectsByCompany,
  getProjectsByUser: jest.fn(),
  getProjectStats: mockGetProjectStats,
  updateProject: mockUpdateProject,
  getProjectUserAssignments: mockGetProjectUserAssignments,
  assignUserToProject: mockAssignUserToProject,
  removeUserFromProject: mockRemoveUserFromProject,
  updateUserProjectCategory: mockUpdateUserProjectCategory,
  getLeadPMForProject: mockGetLeadPMForProject,
  fetchProjects: mockFetchProjects,
  fetchUserProjectAssignments: mockFetchUserProjectAssignments,
};

const mockGetUserById = jest.fn((userId: string) =>
  userId === "user-2"
    ? { id: "user-2", name: "Casey Rivera" }
    : { id: "user-3", name: "Jordan Lee", role: "manager" },
);
const mockGetUsersByCompany = jest.fn(() => [
  { id: "user-3", name: "Jordan Lee", role: "manager" },
]);
const mockFetchUsers = jest.fn().mockResolvedValue(undefined);
const mockUserStore = {
  getUserById: mockGetUserById,
  getUsersByCompany: mockGetUsersByCompany,
  fetchUsers: mockFetchUsers,
};

jest.mock("react-native/Libraries/Modal/Modal", () => {
  return {
    __esModule: true,
    default: function MockModal({
      children,
      visible,
      onRequestClose,
    }: {
      children?: React.ReactNode;
      visible?: boolean;
      onRequestClose?: () => void;
    }) {
      const { View } = require("react-native");

      if (!visible) {
        return null;
      }

      return (
        <View testID="projects-edit-modal" onRequestClose={onRequestClose}>
          {children}
        </View>
      );
    },
  };
});

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
  useProjectStoreWithCompanyInit: () => mockProjectStore,
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStoreWithInit: () => mockUserStore,
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
  const mockSelectStatusFilter = jest.fn();
  const mockHandleRefresh = jest.fn();
  const mockOpenEditProject = jest.fn();
  const mockCloseEditProject = jest.fn();
  const mockSaveEditedProject = jest.fn();
  let alertSpy: jest.SpyInstance;

  type AdapterActions = {
    setSearchQuery: (value: string) => void;
    selectStatusFilter: (value: "all" | "active" | "planning" | "on_hold" | "completed" | "cancelled") => void;
    handleRefresh: () => Promise<void> | void;
    openEditProject: (projectId: string) => void;
    closeEditProject: () => void;
    saveEditedProject: (project: unknown) => void;
    completeEditedProjectSave: () => void;
  };

  function buildProjectItem(
    overrides: Partial<ProjectsScreenProjectItem> = {},
  ): ProjectsScreenProjectItem {
    return {
      id: "projects:project-1",
      projectId: "project-1",
      title: "Tower A",
      description: "Core package",
      statusValue: "active",
      statusLabel: "Active",
      statusTone: "success",
      locationLabel: "Central Site",
      memberCountLabel: "4 members",
      clientName: "Acme",
      startDateLabel: "2026-01-01",
      createdByLabel: "Casey Rivera",
      leadPmName: "Jordan Lee",
      canEdit: true,
      density: "standard",
      structuralState: "stale",
      ...overrides,
    };
  }

  function buildFilterOption(
    overrides: Partial<ProjectsScreenFilterOption> = {},
  ): ProjectsScreenFilterOption {
    return {
      id: "projects-filter:all",
      value: "all",
      label: "All",
      isSelected: true,
      ...overrides,
    };
  }

  function buildProjectRecord(overrides: Partial<Project> = {}): Project {
    return {
      id: "project-1",
      companyId: "company-1",
      name: "Tower A",
      description: "Core package",
      status: "active",
      location: "Central Site",
      createdBy: "user-2",
      clientInfo: { name: "Acme" },
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...overrides,
    };
  }

  function buildAdapterOutput(
    overrides: Partial<ProjectsScreenViewAdapterOutput> = {},
  ): ProjectsScreenViewAdapterOutput {
    return {
      screenId: "ProjectsScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: true,
        isBackgroundRefreshing: false,
        isNavigationTransitionActive: false,
        ...overrides.readiness,
      },
      continuity: {
        isInitialLoading: false,
        isBackgroundRefreshing: false,
        hasCachedFrame: true,
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: false,
        freshnessLabel: "Ready",
        ...overrides.continuity,
      },
      headerActions: {
        showCreateAction: true,
        showUserManagementAction: true,
        ...overrides.headerActions,
      },
      searchQuery: "",
      statusFilter: "all",
      projectCountLabel: "1 project",
      isRefreshing: false,
      isAdmin: true,
      projectItems: [buildProjectItem()],
      filterOptions: [buildFilterOption()],
      emptyState: {
        title: "No projects yet",
        message: "You haven't been assigned to any projects yet",
        showCreateAction: true,
        ...overrides.emptyState,
      },
      editingProject: null,
      isEditModalVisible: false,
      ...overrides,
    };
  }

  function buildAdapterActions(
    overrides: Partial<AdapterActions> = {},
  ): AdapterActions {
    return {
      setSearchQuery: mockSetSearchQuery,
      selectStatusFilter: mockSelectStatusFilter,
      handleRefresh: mockHandleRefresh,
      openEditProject: mockOpenEditProject,
      closeEditProject: mockCloseEditProject,
      saveEditedProject: mockSaveEditedProject,
      completeEditedProjectSave: jest.fn(),
      ...overrides,
    };
  }

  function mockUseProjectsViewAdapterReturn({
    output,
    actions,
  }: {
    output?: Partial<ProjectsScreenViewAdapterOutput>;
    actions?: Partial<AdapterActions>;
  } = {}) {
    const { useProjectsViewAdapter } = require("../../ui/viewAdapters/useProjectsViewAdapter");

    useProjectsViewAdapter.mockReturnValue({
      output: buildAdapterOutput(output),
      actions: buildAdapterActions(actions),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    mockGetProjectUserAssignments.mockReturnValue([]);

    mockUseProjectsViewAdapterReturn();
  });

  afterEach(() => {
    alertSpy.mockRestore();
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

  it("renders extracted project-card shell fields from the projects adapter output", () => {
    mockUseProjectsViewAdapterReturn({
      output: {
        projectItems: [
          buildProjectItem({
            statusLabel: "On Hold",
            leadPmName: "Taylor Morgan",
            locationLabel: "North Yard",
            memberCountLabel: "7 members",
            clientName: "Northwind",
            startDateLabel: "2026-02-14",
            budgetLabel: "Budget: $125,000",
            createdByLabel: "Morgan Patel",
          }),
        ],
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    expect(screen.getByText("On Hold")).toBeTruthy();
    expect(screen.getByText("Lead PM: Taylor Morgan")).toBeTruthy();
    expect(screen.getByText("North Yard")).toBeTruthy();
    expect(screen.getByText("7 members")).toBeTruthy();
    expect(screen.getByText("Northwind")).toBeTruthy();
    expect(screen.getByText("2026-02-14")).toBeTruthy();
    expect(screen.getByText("Budget: $125,000")).toBeTruthy();
    expect(screen.getByText("Created by Morgan Patel")).toBeTruthy();
  });

  it("shows header actions when the adapter exposes them through the projects contract", () => {
    const onNavigateToCreateProject = jest.fn();
    const onNavigateToUserManagement = jest.fn();

    mockUseProjectsViewAdapterReturn({
      output: {
        isAdmin: false,
        headerActions: {
          showCreateAction: true,
          showUserManagementAction: true,
        },
        projectItems: [buildProjectItem()],
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={onNavigateToCreateProject}
        onNavigateToUserManagement={onNavigateToUserManagement}
      />,
    );

    fireEvent.press(screen.getByTestId("projects-create-action"));
    fireEvent.press(screen.getByTestId("projects-user-management-action"));

    expect(onNavigateToCreateProject).toHaveBeenCalledTimes(1);
    expect(onNavigateToUserManagement).toHaveBeenCalledTimes(1);
  });

  it("hides admin actions for non-admin output", () => {
    mockUseProjectsViewAdapterReturn({
      output: {
        isAdmin: false,
        headerActions: {
          showCreateAction: false,
          showUserManagementAction: false,
        },
        projectItems: [buildProjectItem()],
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("projects-create-action")).toBeNull();
    expect(screen.queryByTestId("projects-user-management-action")).toBeNull();
  });

  it("delegates status filter selection through the adapter", () => {
    mockUseProjectsViewAdapterReturn({
      output: {
        filterOptions: [
          buildFilterOption({ value: "all", label: "All", isSelected: true }),
          buildFilterOption({
            id: "projects-filter:planning",
            value: "planning",
            label: "Planning",
            isSelected: false,
          }),
        ],
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText("Planning"));

    expect(mockSelectStatusFilter).toHaveBeenCalledWith("planning");
  });

  it("renders the loading state when the adapter is initially loading", () => {
    mockUseProjectsViewAdapterReturn({
      output: {
        continuity: {
          isInitialLoading: true,
          isBackgroundRefreshing: false,
          hasCachedFrame: false,
          shouldRenderSkeletonShell: false,
          shouldRenderEmptyState: false,
          freshnessLabel: "Loading",
        },
        projectItems: [],
        projectCountLabel: "0 projects",
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    expect(screen.getByText("Loading projects...")).toBeTruthy();
  });

  it("returns null when the adapter has no usable readiness data outside the loading path", () => {
    mockUseProjectsViewAdapterReturn({
      output: {
        readiness: {
          hasUsableData: false,
        },
        continuity: {
          isInitialLoading: false,
        },
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    expect(screen.toJSON()).toBeNull();
    expect(screen.queryByText("Projects")).toBeNull();
  });

  it("renders the empty state create action only when allowed", () => {
    const onNavigateToCreateProject = jest.fn();

    mockUseProjectsViewAdapterReturn({
      output: {
        projectItems: [],
        projectCountLabel: "0 projects",
        emptyState: {
          title: "No projects yet",
          message: "Create your first project to get started",
          showCreateAction: true,
        },
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={onNavigateToCreateProject}
      />,
    );

    fireEvent.press(screen.getByText("Create Project"));

    expect(onNavigateToCreateProject).toHaveBeenCalledTimes(1);
  });

  it("hides the empty state create action when the adapter disallows it", () => {
    mockUseProjectsViewAdapterReturn({
      output: {
        projectItems: [],
        projectCountLabel: "0 projects",
        emptyState: {
          title: "No projects found",
          message: "Try adjusting your search or filters",
          showCreateAction: false,
        },
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    expect(screen.queryByText("Create Project")).toBeNull();
  });

  it("renders empty-state title and message from the projects adapter output", () => {
    mockUseProjectsViewAdapterReturn({
      output: {
        projectItems: [],
        projectCountLabel: "0 projects",
        emptyState: {
          title: "No archived projects",
          message: "Try clearing your filters to see active work.",
          showCreateAction: false,
        },
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    expect(screen.getByText("No archived projects")).toBeTruthy();
    expect(
      screen.getByText("Try clearing your filters to see active work."),
    ).toBeTruthy();
  });

  it("delegates refresh through the adapter", () => {
    mockUseProjectsViewAdapterReturn();

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    const projectListScrollView = screen
      .UNSAFE_getAllByType(ScrollView)
      .find((node) => Boolean(node.props.refreshControl));

    expect(projectListScrollView).toBeTruthy();

    projectListScrollView?.props.refreshControl.props.onRefresh();

    expect(mockHandleRefresh).toHaveBeenCalledTimes(1);
  });

  it("delegates project edit entry through the adapter", () => {
    mockUseProjectsViewAdapterReturn({
      output: {
        projectItems: [buildProjectItem({ canEdit: true })],
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("projects-edit-project-1"));

    expect(mockOpenEditProject).toHaveBeenCalledWith("project-1");
  });

  it("delegates project-card navigation through the project detail callback", () => {
    const onNavigateToProjectDetail = jest.fn();

    mockUseProjectsViewAdapterReturn({
      output: {
        projectItems: [buildProjectItem({ title: "Tower A" })],
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={onNavigateToProjectDetail}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("projects-card-project-1"));

    expect(onNavigateToProjectDetail).toHaveBeenCalledWith("project-1");
  });

  it("renders the edit modal when the adapter exposes an active editing project", () => {
    mockUseProjectsViewAdapterReturn({
      output: {
        isEditModalVisible: true,
        editingProject: buildProjectRecord(),
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    expect(screen.getByTestId("projects-edit-modal")).toBeTruthy();
    expect(screen.getByText("Edit Project")).toBeTruthy();
    expect(screen.getByText("Project Information")).toBeTruthy();
    expect(screen.queryByText(/Debug:/)).toBeNull();
  });

  it("delegates modal close requests through the projects adapter", () => {
    mockUseProjectsViewAdapterReturn({
      output: {
        isEditModalVisible: true,
        editingProject: buildProjectRecord(),
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    fireEvent(screen.getByTestId("projects-edit-modal"), "onRequestClose");

    expect(mockCloseEditProject).toHaveBeenCalledTimes(1);
  });

  it("delegates modal save through the projects adapter with the edited project payload", () => {
    mockUseProjectsViewAdapterReturn({
      output: {
        isEditModalVisible: true,
        editingProject: buildProjectRecord(),
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText("Save"));

    expect(mockSaveEditedProject).toHaveBeenCalledTimes(1);
    expect(mockSaveEditedProject).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "project-1",
        name: "Tower A",
        description: "Core package",
        status: "active",
        location: "Central Site",
      }),
    );
    expect(mockRemoveUserFromProject).not.toHaveBeenCalled();
    expect(mockAssignUserToProject).not.toHaveBeenCalled();
  });

  it("prevents modal save when the project name is blank", () => {
    mockUseProjectsViewAdapterReturn({
      output: {
        isEditModalVisible: true,
        editingProject: buildProjectRecord(),
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    fireEvent.changeText(screen.getByDisplayValue("Tower A"), "   ");
    fireEvent.press(screen.getByText("Save"));

    expect(Alert.alert).toHaveBeenCalledWith("Error", "Project name is required");
    expect(mockSaveEditedProject).not.toHaveBeenCalled();
    expect(mockRemoveUserFromProject).not.toHaveBeenCalled();
    expect(mockAssignUserToProject).not.toHaveBeenCalled();
  });

  it("prevents modal save when the end date is not after the start date", () => {
    mockUseProjectsViewAdapterReturn({
      output: {
        isEditModalVisible: true,
        editingProject: buildProjectRecord(),
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText("2026-12-31"));
    fireEvent(screen.UNSAFE_getByType("DateTimePicker"), "onChange", undefined, new Date("2025-12-31T00:00:00.000Z"));
    fireEvent.press(screen.getByText("Save"));

    expect(Alert.alert).toHaveBeenCalledWith("Error", "End date must be after start date");
    expect(mockSaveEditedProject).not.toHaveBeenCalled();
    expect(mockRemoveUserFromProject).not.toHaveBeenCalled();
    expect(mockAssignUserToProject).not.toHaveBeenCalled();
  });

  it("updates lead-PM assignments only after a successful save when the selection changes", async () => {
    const mockCompleteEditedProjectSave = jest.fn();

    mockGetUsersByCompany.mockReturnValue([
      { id: "user-3", name: "Jordan Lee", role: "manager" },
      { id: "user-4", name: "Taylor Morgan", role: "manager" },
    ]);
    mockGetLeadPMForProject.mockReturnValue("user-3");
    mockGetProjectUserAssignments.mockReturnValue([
      {
        userId: "user-3",
        projectId: "project-1",
        category: "lead_project_manager",
        assignedBy: "user-1",
        assignedAt: "2026-01-02T00:00:00.000Z",
        isActive: true,
      },
    ]);
    mockSaveEditedProject.mockResolvedValueOnce(undefined);

    mockUseProjectsViewAdapterReturn({
      output: {
        isEditModalVisible: true,
        editingProject: buildProjectRecord(),
      },
      actions: {
        completeEditedProjectSave: mockCompleteEditedProjectSave,
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Jordan Lee (manager)")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Jordan Lee (manager)"));
    fireEvent.press(screen.getByText("Taylor Morgan (manager)"));
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockSaveEditedProject).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockCompleteEditedProjectSave).toHaveBeenCalledTimes(1);
    });

    expect(mockAssignUserToProject).toHaveBeenCalledWith(
      "user-4",
      "project-1",
      "lead_project_manager",
      "user-1",
    );
    expect(mockRemoveUserFromProject).toHaveBeenCalledWith("user-3", "project-1");
    expect(mockSaveEditedProject.mock.invocationCallOrder[0]).toBeLessThan(
      mockAssignUserToProject.mock.invocationCallOrder[0],
    );
    expect(mockAssignUserToProject.mock.invocationCallOrder[0]).toBeLessThan(
      mockRemoveUserFromProject.mock.invocationCallOrder[0],
    );
    expect(mockRemoveUserFromProject.mock.invocationCallOrder[0]).toBeLessThan(
      mockCompleteEditedProjectSave.mock.invocationCallOrder[0],
    );
  });

  it("updates the selected manager category to lead PM when they are already assigned to the project", async () => {
    const mockCompleteEditedProjectSave = jest.fn();

    mockGetUsersByCompany.mockReturnValue([
      { id: "user-3", name: "Jordan Lee", role: "manager" },
      { id: "user-4", name: "Taylor Morgan", role: "manager" },
    ]);
    mockGetLeadPMForProject.mockReturnValue("user-3");
    mockGetProjectUserAssignments.mockReturnValue([
      {
        userId: "user-3",
        projectId: "project-1",
        category: "lead_project_manager",
        assignedBy: "user-1",
        assignedAt: "2026-01-02T00:00:00.000Z",
        isActive: true,
      },
      {
        userId: "user-4",
        projectId: "project-1",
        category: "contractor",
        assignedBy: "user-1",
        assignedAt: "2026-01-03T00:00:00.000Z",
        isActive: true,
      },
    ]);
    mockSaveEditedProject.mockResolvedValueOnce(undefined);

    mockUseProjectsViewAdapterReturn({
      output: {
        isEditModalVisible: true,
        editingProject: buildProjectRecord(),
      },
      actions: {
        completeEditedProjectSave: mockCompleteEditedProjectSave,
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Jordan Lee (manager)")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Jordan Lee (manager)"));
    fireEvent.press(screen.getByText("Taylor Morgan (manager)"));
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockSaveEditedProject).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockUpdateUserProjectCategory).toHaveBeenCalledWith(
        "user-4",
        "project-1",
        "lead_project_manager",
      );
    });
    await waitFor(() => {
      expect(mockCompleteEditedProjectSave).toHaveBeenCalledTimes(1);
    });

    expect(mockAssignUserToProject).not.toHaveBeenCalled();
    expect(mockSaveEditedProject.mock.invocationCallOrder[0]).toBeLessThan(
      mockUpdateUserProjectCategory.mock.invocationCallOrder[0],
    );
    expect(mockRemoveUserFromProject).toHaveBeenCalledWith("user-3", "project-1");
    expect(mockUpdateUserProjectCategory.mock.invocationCallOrder[0]).toBeLessThan(
      mockRemoveUserFromProject.mock.invocationCallOrder[0],
    );
    expect(mockRemoveUserFromProject.mock.invocationCallOrder[0]).toBeLessThan(
      mockCompleteEditedProjectSave.mock.invocationCallOrder[0],
    );
  });

  it("removes every stale active lead assignment that does not match the selected lead so retries can clean up duplicates", async () => {
    const mockCompleteEditedProjectSave = jest.fn();

    mockGetUsersByCompany.mockReturnValue([
      { id: "user-3", name: "Jordan Lee", role: "manager" },
      { id: "user-4", name: "Taylor Morgan", role: "manager" },
    ]);
    mockGetLeadPMForProject.mockReturnValue("user-4");
    mockGetProjectUserAssignments.mockReturnValue([
      {
        userId: "user-4",
        projectId: "project-1",
        category: "lead_project_manager",
        assignedBy: "user-1",
        assignedAt: "2026-01-03T00:00:00.000Z",
        isActive: true,
      },
      {
        userId: "user-3",
        projectId: "project-1",
        category: "lead_project_manager",
        assignedBy: "user-1",
        assignedAt: "2026-01-02T00:00:00.000Z",
        isActive: true,
      },
    ]);
    mockSaveEditedProject.mockResolvedValueOnce(undefined);

    mockUseProjectsViewAdapterReturn({
      output: {
        isEditModalVisible: true,
        editingProject: buildProjectRecord(),
      },
      actions: {
        completeEditedProjectSave: mockCompleteEditedProjectSave,
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Taylor Morgan (manager)")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockSaveEditedProject).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockRemoveUserFromProject).toHaveBeenCalledWith("user-3", "project-1");
    });
    await waitFor(() => {
      expect(mockCompleteEditedProjectSave).toHaveBeenCalledTimes(1);
    });

    expect(mockAssignUserToProject).not.toHaveBeenCalled();
    expect(mockUpdateUserProjectCategory).not.toHaveBeenCalled();
    expect(mockRemoveUserFromProject).not.toHaveBeenCalledWith("user-4", "project-1");
    expect(mockSaveEditedProject.mock.invocationCallOrder[0]).toBeLessThan(
      mockRemoveUserFromProject.mock.invocationCallOrder[0],
    );
    expect(mockRemoveUserFromProject.mock.invocationCallOrder[0]).toBeLessThan(
      mockCompleteEditedProjectSave.mock.invocationCallOrder[0],
    );
  });

  it("keeps a lead-PM removal failure inside the save flow after starting the replacement assignment", async () => {
    const removeError = new Error("Remove failed");
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const mockCompleteEditedProjectSave = jest.fn();

    mockGetUsersByCompany.mockReturnValue([
      { id: "user-3", name: "Jordan Lee", role: "manager" },
      { id: "user-4", name: "Taylor Morgan", role: "manager" },
    ]);
    mockGetLeadPMForProject.mockReturnValue("user-3");
    mockGetProjectUserAssignments.mockReturnValue([
      {
        userId: "user-3",
        projectId: "project-1",
        category: "lead_project_manager",
        assignedBy: "user-1",
        assignedAt: "2026-01-02T00:00:00.000Z",
        isActive: true,
      },
    ]);
    mockSaveEditedProject.mockResolvedValueOnce(undefined);
    mockRemoveUserFromProject.mockRejectedValueOnce(removeError);

    mockUseProjectsViewAdapterReturn({
      output: {
        isEditModalVisible: true,
        editingProject: buildProjectRecord(),
      },
      actions: {
        completeEditedProjectSave: mockCompleteEditedProjectSave,
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Jordan Lee (manager)")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Jordan Lee (manager)"));
    fireEvent.press(screen.getByText("Taylor Morgan (manager)"));
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockSaveEditedProject).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "ProjectsScreen: Failed to save edited project modal state:",
        removeError,
      );
    });

    expect(mockAssignUserToProject).toHaveBeenCalledWith(
      "user-4",
      "project-1",
      "lead_project_manager",
      "user-1",
    );
    expect(mockRemoveUserFromProject).toHaveBeenCalledWith("user-3", "project-1");
    expect(mockCompleteEditedProjectSave).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("keeps a lead-PM assignment failure inside the save flow after save succeeds", async () => {
    const assignError = new Error("Assign failed");
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const mockCompleteEditedProjectSave = jest.fn();

    mockGetUsersByCompany.mockReturnValue([
      { id: "user-4", name: "Taylor Morgan", role: "manager" },
    ]);
    mockGetLeadPMForProject.mockReturnValue("");
    mockSaveEditedProject.mockResolvedValueOnce(undefined);
    mockAssignUserToProject.mockRejectedValueOnce(assignError);

    mockUseProjectsViewAdapterReturn({
      output: {
        isEditModalVisible: true,
        editingProject: buildProjectRecord(),
      },
      actions: {
        completeEditedProjectSave: mockCompleteEditedProjectSave,
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("No Lead PM (Select one)")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("No Lead PM (Select one)"));
    fireEvent.press(screen.getByText("Taylor Morgan (manager)"));
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockSaveEditedProject).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "ProjectsScreen: Failed to save edited project modal state:",
        assignError,
      );
    });

    expect(mockRemoveUserFromProject).not.toHaveBeenCalled();
    expect(mockAssignUserToProject).toHaveBeenCalledWith(
      "user-4",
      "project-1",
      "lead_project_manager",
      "user-1",
    );
    expect(mockCompleteEditedProjectSave).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("does not mutate lead-PM assignments when modal save rejects", async () => {
    const saveError = new Error("Save failed");
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const mockCompleteEditedProjectSave = jest.fn();

    mockGetUsersByCompany.mockReturnValue([
      { id: "user-3", name: "Jordan Lee", role: "manager" },
      { id: "user-4", name: "Taylor Morgan", role: "manager" },
    ]);
    mockGetLeadPMForProject.mockReturnValue("user-3");
    mockSaveEditedProject.mockRejectedValueOnce(saveError);

    mockUseProjectsViewAdapterReturn({
      output: {
        isEditModalVisible: true,
        editingProject: buildProjectRecord(),
      },
      actions: {
        completeEditedProjectSave: mockCompleteEditedProjectSave,
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Jordan Lee (manager)")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Jordan Lee (manager)"));
    fireEvent.press(screen.getByText("Taylor Morgan (manager)"));
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockSaveEditedProject).toHaveBeenCalledTimes(1);
    });

    expect(mockRemoveUserFromProject).not.toHaveBeenCalled();
    expect(mockAssignUserToProject).not.toHaveBeenCalled();
    expect(mockCompleteEditedProjectSave).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "ProjectsScreen: Failed to save edited project modal state:",
      saveError,
    );

    consoleErrorSpy.mockRestore();
  });

  it("hydrates an existing lead PM after mount so saving does not clear it when assignments arrive late", async () => {
    const mockCompleteEditedProjectSave = jest.fn();

    mockGetUsersByCompany.mockReturnValue([]);
    mockGetLeadPMForProject.mockReturnValue("");
    mockGetProjectUserAssignments.mockReturnValue([]);
    mockSaveEditedProject.mockResolvedValueOnce(undefined);

    mockUseProjectsViewAdapterReturn({
      output: {
        isEditModalVisible: true,
        editingProject: buildProjectRecord(),
      },
      actions: {
        completeEditedProjectSave: mockCompleteEditedProjectSave,
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    expect(screen.getByText("No Lead PM (Select one)")).toBeTruthy();

    mockGetUsersByCompany.mockReturnValue([
      { id: "user-3", name: "Jordan Lee", role: "manager" },
    ]);
    mockGetLeadPMForProject.mockReturnValue("user-3");
    mockGetProjectUserAssignments.mockReturnValue([
      {
        userId: "user-3",
        projectId: "project-1",
        category: "lead_project_manager",
        assignedBy: "user-1",
        assignedAt: "2026-01-02T00:00:00.000Z",
        isActive: true,
      },
    ]);

    screen.rerender(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Jordan Lee (manager)")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockSaveEditedProject).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockCompleteEditedProjectSave).toHaveBeenCalledTimes(1);
    });

    expect(mockAssignUserToProject).not.toHaveBeenCalled();
    expect(mockUpdateUserProjectCategory).not.toHaveBeenCalled();
    expect(mockRemoveUserFromProject).not.toHaveBeenCalled();
  });

  it("resyncs to no lead PM when a stale cached lead hydrates to empty so save does not recreate it", async () => {
    const mockCompleteEditedProjectSave = jest.fn();

    mockGetUsersByCompany.mockReturnValue([
      { id: "user-3", name: "Jordan Lee", role: "manager" },
    ]);
    mockGetLeadPMForProject.mockReturnValue("user-3");
    mockGetProjectUserAssignments.mockReturnValue([
      {
        userId: "user-3",
        projectId: "project-1",
        category: "lead_project_manager",
        assignedBy: "user-1",
        assignedAt: "2026-01-02T00:00:00.000Z",
        isActive: true,
      },
    ]);
    mockSaveEditedProject.mockResolvedValueOnce(undefined);

    mockUseProjectsViewAdapterReturn({
      output: {
        isEditModalVisible: true,
        editingProject: buildProjectRecord(),
      },
      actions: {
        completeEditedProjectSave: mockCompleteEditedProjectSave,
      },
    });

    const screen = render(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Jordan Lee (manager)")).toBeTruthy();
    });

    mockGetLeadPMForProject.mockReturnValue("");
    mockGetProjectUserAssignments.mockReturnValue([]);

    screen.rerender(
      <ProjectsScreen
        onNavigateToProjectDetail={jest.fn()}
        onNavigateToCreateProject={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("No Lead PM (Select one)")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockSaveEditedProject).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockCompleteEditedProjectSave).toHaveBeenCalledTimes(1);
    });

    expect(mockAssignUserToProject).not.toHaveBeenCalled();
    expect(mockUpdateUserProjectCategory).not.toHaveBeenCalled();
    expect(mockRemoveUserFromProject).not.toHaveBeenCalled();
  });
});
