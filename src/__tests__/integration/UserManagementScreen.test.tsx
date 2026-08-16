import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import UserManagementScreen from "@/screens/UserManagementScreen";

jest.mock("../../ui/viewAdapters/useUserManagementViewAdapter", () => ({
  useUserManagementViewAdapter: jest.fn(),
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
      name: "Avery Admin",
      role: "admin",
      companyId: "company-1",
    },
    logout: jest.fn(),
  }),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithCompanyInit: () => ({
    getProjectsByCompany: () => [],
    assignUserToProject: jest.fn(),
    removeUserFromProject: jest.fn(),
    getUserProjectAssignments: () => [],
  }),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStoreWithInit: () => ({
    getUsersByCompany: () => [],
    getAdminCountByCompany: () => 1,
    fetchUsers: jest.fn(),
    approveUser: jest.fn(),
    rejectUser: jest.fn(),
    getAllUsers: () => [],
  }),
}));

jest.mock("@/state/companyStore", () => ({
  useCompanyStore: () => ({
    getCompanyById: () => ({
      id: "company-1",
      name: "BuildCo",
    }),
    getCompanyBanner: jest.fn(),
  }),
}));

jest.mock("@/utils/DataRefreshManager", () => ({
  notifyDataMutation: jest.fn(),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    userManagement: {
      accessDenied: "Access denied",
      goBack: "Go Back",
    },
  }),
}));

jest.mock("@/types/buildtrack", () => ({
  isAdmin: () => true,
  getUserSystemPermission: () => "admin",
  getProjectRole: () => "worker",
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

jest.mock("react-native/Libraries/Modal/Modal", () => {
  const React = require("react");

  return function MockModal({ children }: { children?: React.ReactNode }) {
    return <>{children}</>;
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
    const { Text } = require("react-native");
    return React.createElement(Text, null, label || subtitle || "Brand");
  },
}));


jest.mock("react-native/Libraries/Components/RefreshControl/RefreshControl", () => {
  return function MockRefreshControl() {
    return null;
  };
});

describe("UserManagementScreen", () => {
  const mockRequestApproveUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const { useUserManagementViewAdapter } = require("../../ui/viewAdapters/useUserManagementViewAdapter");

    useUserManagementViewAdapter.mockReturnValue({
      output: {
        screenId: "UserManagementScreen",
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
        access: {
          isAllowed: true,
          deniedMessage: null,
        },
        companyScope: {
          companyName: "BuildCo",
          subtitle: "Showing users from your company only",
        },
        searchQuery: "",
        userCountLabel: "2 users in your company",
        activeModal: null,
        successMessage: "",
        pendingApprovalUser: null,
        pendingRemoval: null,
        refreshState: {
          isRefreshing: false,
        },
        profileMenu: {
          isVisible: false,
          displayName: "Avery Admin",
          roleLabel: "admin",
          avatarInitial: "A",
        },
        selectedUserSummary: null,
        selectedProjectId: null,
        selectedProjectName: null,
        selectedProjectRole: "worker",
        availableProjects: [],
        projectRoleOptions: [],
        userCards: [
          {
            id: "user-card:pending-user",
            userId: "pending-user",
            name: "Pending Person",
            email: "pending@example.com",
            systemRoleLabel: "admin",
            positionLabel: "Supervisor",
            isAdmin: false,
            isProtected: false,
            isPending: true,
            pendingMessage: "Awaiting approval - cannot be assigned to projects yet",
            assignmentCountLabel: null,
            assignmentRows: [],
            primaryAction: {
              id: "approve-action:pending-user",
              label: "Approve",
              testId: "user-management__approve-user-pending-user",
            },
            secondaryAction: {
              id: "reject-action:pending-user",
              label: "Reject",
              testId: "user-management__reject-user-pending-user",
            },
            density: "standard",
            structuralState: "stale",
          },
          {
            id: "user-card:assigned-user",
            userId: "assigned-user",
            name: "Assigned Member",
            email: "assigned@example.com",
            systemRoleLabel: "manager",
            positionLabel: "Project Manager",
            isAdmin: false,
            isProtected: false,
            isPending: false,
            pendingMessage: null,
            assignmentCountLabel: "1 project assignment",
            assignmentRows: [
              {
                id: "assignment:project-1",
                projectId: "project-1",
                projectName: "Tower Build",
                projectRoleLabel: "Worker",
                removeTestId: "user-management__remove-assignment-assigned-user-project-1",
              },
            ],
            primaryAction: {
              id: "assign-action:assigned-user",
              label: "Assign",
              testId: "user-management__assign-user-assigned-user",
            },
            secondaryAction: null,
            density: "standard",
            structuralState: "stale",
          },
        ],
        emptyState: {
          title: "No Users Found",
          message: "No users match your search criteria",
          showInviteAction: false,
        },
      },
      actions: {
        setSearchQuery: jest.fn(),
        handleRefresh: jest.fn(),
        openInviteModal: jest.fn(),
        closeActiveModal: jest.fn(),
        closeAssignmentFlow: jest.fn(),
        openProjectPicker: jest.fn(),
        openProjectRolePicker: jest.fn(),
        returnToAssignmentModal: jest.fn(),
        toggleProfileMenu: jest.fn(),
        confirmLogout: jest.fn(),
        requestAssignUser: jest.fn(),
        requestApproveUser: mockRequestApproveUser,
        requestRejectUser: jest.fn(),
        requestRemoveAssignment: jest.fn(),
        selectProject: jest.fn(),
        selectProjectRole: jest.fn(),
        saveAssignment: jest.fn(),
        confirmApproveUser: jest.fn(),
        confirmRejectUser: jest.fn(),
        confirmRemoveAssignment: jest.fn(),
      },
    });
  });

  it("renders adapter-driven user cards and delegates approve actions through the user management adapter", () => {
    const screen = render(<UserManagementScreen onNavigateBack={jest.fn()} />);

    expect(screen.getByText("User Management")).toBeTruthy();
    expect(screen.getByText("BuildCo")).toBeTruthy();
    expect(screen.getByText("Pending Person")).toBeTruthy();
    expect(screen.getByText("Assigned Member")).toBeTruthy();

    fireEvent.press(screen.getByTestId("user-management__approve-user-pending-user"));

    expect(mockRequestApproveUser).toHaveBeenCalledWith("pending-user");
  });
});
