import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import ProjectDetailScreen from "@/screens/ProjectDetailScreen";

jest.mock("@/ui/viewAdapters/useProjectDetailViewAdapter", () => ({
  useProjectDetailViewAdapter: jest.fn(),
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

jest.mock("@/components/ProjectForm", () => ({
  __esModule: true,
  default: function MockProjectForm() {
    const { Text } = require("react-native");
    return <Text>Mock Project Form</Text>;
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
      id: "admin-1",
      role: "admin",
      companyId: "company-1",
    },
  }),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithCompanyInit: () => ({
    getProjectById: () => ({
      id: "project-1",
      name: "Tower A",
      description: "Core package",
      status: "active",
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
      location: "Central Site",
      clientInfo: {
        name: "Acme",
        email: "contact@acme.test",
      },
      createdBy: "user-2",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
    updateProject: jest.fn().mockResolvedValue(undefined),
    getProjectStats: () => ({
      totalUsers: 4,
      usersByCategory: {
        lead_project_manager: 1,
        worker: 3,
      },
      isActive: true,
    }),
    getProjectUserAssignments: () => [
      {
        id: "assignment-1",
        userId: "user-3",
        projectId: "project-1",
        category: "lead_project_manager",
        assignedAt: "2026-01-02T00:00:00.000Z",
        assignedBy: "admin-1",
        isActive: true,
      },
    ],
    getLeadPMForProject: () => "user-3",
    assignUserToProject: jest.fn().mockResolvedValue(undefined),
    removeUserFromProject: jest.fn().mockResolvedValue(undefined),
    fetchProjectUserAssignments: jest.fn().mockResolvedValue(undefined),
    cleanupDuplicateAssignments: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStoreWithInit: () => ({
    getUserById: (userId: string) => {
      if (userId === "user-2") {
        return { id: "user-2", name: "Casey Rivera" };
      }

      if (userId === "user-3") {
        return {
          id: "user-3",
          name: "Jordan Lee",
          email: "jordan@example.com",
          role: "manager",
          position: "Project Manager",
          companyId: "company-1",
        };
      }

      return null;
    },
    getUsersByCompany: () => [],
    getAllUsers: () => [],
  }),
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: () => ({
    getTasksByProject: () => [
      { id: "task-1", projectId: "project-1" },
      { id: "task-2", projectId: "project-1" },
    ],
  }),
}));

jest.mock("@/state/companyStore", () => ({
  useCompanyStore: () => ({
    getCompanyById: jest.fn(),
  }),
}));

jest.mock("@/state/userPreferencesStore", () => ({
  useUserPreferencesStore: () => ({
    isFavoriteUser: jest.fn(() => false),
    toggleFavoriteUser: jest.fn(),
  }),
}));

jest.mock("@/types/buildtrack", () => {
  const actual = jest.requireActual("@/types/buildtrack");

  return {
    ...actual,
    getProjectRole: (assignment: { category?: string; projectRole?: string }) =>
      assignment.projectRole || assignment.category || "worker",
  };
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
    const { Text, View } = require("react-native");
    return React.createElement(
      View,
      null,
      label ? React.createElement(Text, null, label) : null,
      subtitle ? React.createElement(Text, null, subtitle) : null,
    );
  },
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

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("react-native/Libraries/Modal/Modal", () => {
  return function MockModal({ children }: { children?: React.ReactNode }) {
    return <>{children}</>;
  };
});

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: "DateTimePicker",
}));

jest.mock("@react-native-picker/picker", () => ({
  Picker: "Picker",
}));

describe("ProjectDetailScreen", () => {
  const mockOpenEditProject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const { useProjectDetailViewAdapter } = require("@/ui/viewAdapters/useProjectDetailViewAdapter");

    useProjectDetailViewAdapter.mockReturnValue({
      output: {
        screenId: "ProjectDetailScreen",
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
        project: {
          id: "project-1",
          name: "Tower A",
          description: "Core package",
          status: "active",
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2026-12-31T00:00:00.000Z",
          location: "Central Site",
          clientInfo: {
            name: "Acme",
            email: "contact@acme.test",
          },
          createdBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        header: {
          projectId: "project-1",
          title: "Tower A",
          description: "Core package",
          statusValue: "active",
          statusLabel: "active",
        },
        leadPm: {
          userId: "user-3",
          name: "Jordan Lee",
          email: "jordan@example.com",
        },
        statCards: [
          {
            id: "project-detail-stat:members",
            statId: "members",
            label: "Team Members",
            value: 4,
            iconName: "people-outline",
            density: "standard",
            structuralState: "stale",
          },
          {
            id: "project-detail-stat:tasks",
            statId: "tasks",
            label: "Total Tasks",
            value: 2,
            iconName: "checkbox-outline",
            density: "standard",
            structuralState: "stale",
          },
        ],
        informationRows: [
          {
            id: "project-detail-info:location",
            label: "Location",
            value: "Central Site",
          },
        ],
        memberRows: [
          {
            id: "project-member:user-3",
            userId: "user-3",
            name: "Jordan Lee",
            projectRoleLabel: "lead project manager",
            email: "jordan@example.com",
            isLeadPm: true,
            canRemove: false,
            density: "standard",
            structuralState: "stale",
          },
        ],
        isRefreshing: false,
        canEdit: true,
        canManageMembers: true,
        editingProject: null,
        isEditModalVisible: false,
        isAddMemberModalVisible: false,
        existingMemberIds: ["user-3"],
        emptyState: null,
      },
      actions: {
        handleRefresh: jest.fn(),
        openEditProject: mockOpenEditProject,
        closeEditProject: jest.fn(),
        saveProjectEdits: jest.fn(),
        openAddMemberModal: jest.fn(),
        closeAddMemberModal: jest.fn(),
        addMembers: jest.fn(),
        confirmRemoveMember: jest.fn(),
      },
    });
  });

  it("renders project details and exposes the edit entry point for admins", () => {
    const screen = render(
      <ProjectDetailScreen
        projectId="project-1"
        onNavigateBack={jest.fn()}
      />,
    );

    expect(screen.getAllByText("Tower A").length).toBeGreaterThan(0);
    expect(screen.getByText("Project details")).toBeTruthy();
    expect(screen.getByText("Lead Project Manager: Jordan Lee")).toBeTruthy();

    fireEvent.press(screen.getByTestId("project-detail__edit"));

    expect(mockOpenEditProject).toHaveBeenCalled();
  });
});
