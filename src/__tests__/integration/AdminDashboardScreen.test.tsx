import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import AdminDashboardScreen from "@/screens/AdminDashboardScreen";

jest.mock("../../ui/viewAdapters/useAdminDashboardViewAdapter", () => ({
  useAdminDashboardViewAdapter: jest.fn(),
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
    userAssignments: [],
    fetchProjects: jest.fn(),
  }),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStoreWithInit: () => ({
    getUsersByCompany: () => [],
    fetchUsers: jest.fn(),
    getAllUsers: () => [],
  }),
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: (selector: (state: { tasks: unknown[]; fetchTasks: jest.Mock }) => unknown) =>
    selector({
      tasks: [],
      fetchTasks: jest.fn(),
    }),
}));

jest.mock("@/state/companyStore", () => ({
  useCompanyStore: () => ({
    getCompanyById: () => ({
      id: "company-1",
      name: "BuildCo",
    }),
    getCompanyBanner: jest.fn(),
    updateCompanyBanner: jest.fn(),
  }),
}));

jest.mock("@/types/buildtrack", () => ({
  isAdmin: () => true,
  getUserSystemPermission: () => "admin",
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

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: "Images",
  },
}));

jest.mock("expo-clipboard", () => ({
  hasImageAsync: jest.fn(),
  getImageAsync: jest.fn(),
}));

describe("AdminDashboardScreen", () => {
  const mockPressQuickAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const { useAdminDashboardViewAdapter } = require("../../ui/viewAdapters/useAdminDashboardViewAdapter");

    useAdminDashboardViewAdapter.mockReturnValue({
      output: {
        screenId: "AdminDashboardScreen",
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
          companyId: "company-1",
          companyName: "BuildCo",
          subtitle: "Showing data for your company only",
        },
        topLevelStats: [
          {
            id: "admin-stat:company_plan",
            statId: "company_plan",
            label: "Company Plan",
            value: "BuildCo",
            subtitle: "Plan & seats",
            icon: "business-outline",
            color: "bg-white",
            iconColor: "#08576E",
            textColor: "text-gray-900",
            density: "standard",
            structuralState: "stale",
            actionId: "company_plan",
            ctaLabel: "Manage",
          },
          {
            id: "admin-stat:projects",
            statId: "projects",
            label: "Projects",
            value: 12,
            hidePrimaryValue: true,
            secondaryStats: [
              { id: "planning", label: "Planning", value: 2 },
              { id: "active", label: "On-going", value: 8 },
              { id: "completed", label: "Completed", value: 1 },
              { id: "cancelled", label: "Cancelled", value: 0 },
            ],
            secondaryLayout: "stage_tiles",
            icon: "folder-open-outline",
            color: "bg-white",
            iconColor: "#08576E",
            textColor: "text-gray-900",
            density: "standard",
            structuralState: "stale",
            actionId: "projects",
            ctaLabel: "View all",
          },
          {
            id: "admin-stat:team",
            statId: "team",
            label: "Team Members",
            value: 4,
            hidePrimaryValue: true,
            secondaryStats: [
              { id: "pm", label: "PMs", value: 1 },
              { id: "worker", label: "Workers", value: 3 },
            ],
            secondaryLayout: "stage_tiles",
            icon: "people-outline",
            color: "bg-white",
            iconColor: "#08576E",
            textColor: "text-gray-900",
            density: "standard",
            structuralState: "stale",
            actionId: "user_management",
            ctaLabel: "Manage",
          },
        ],
        quickActions: [
          {
            id: "admin-action:dev_admin",
            actionId: "dev_admin",
            label: "Dev Admin Tools",
            description: "Database management, testing scripts, and environment control",
            icon: "code-slash-outline",
            color: "bg-white",
            iconColor: "#08576E",
            borderColor: "border-gray-200",
            isVisible: true,
            density: "standard",
            structuralState: "stale",
          },
        ],
        bannerSettings: {
          isModalVisible: false,
          isVisible: false,
          text: "",
          backgroundColor: "#3b82f6",
          textColor: "#ffffff",
          imageUri: "",
          colorPresets: [],
        },
        refreshState: {
          isRefreshing: false,
        },
        profileMenu: {
          isVisible: false,
          displayName: "Avery Admin",
          roleLabel: "admin",
          avatarInitial: "A",
        },
      },
      actions: {
        handleRefresh: jest.fn(),
        pressQuickAction: mockPressQuickAction,
        toggleProfileMenu: jest.fn(),
        openBannerSettings: jest.fn(),
        closeBannerSettings: jest.fn(),
        setBannerText: jest.fn(),
        selectBannerColorPreset: jest.fn(),
        toggleBannerVisibility: jest.fn(),
        pickBannerImage: jest.fn(),
        removeBannerImage: jest.fn(),
        saveBannerSettings: jest.fn(),
        navigateToProfile: jest.fn(),
        confirmLogout: jest.fn(),
      },
    });
  });

  it("renders three sections with project stage tiles, team PM/Worker tiles, and CTA navigation", () => {
    const screen = render(
      <AdminDashboardScreen
        onNavigateToProjects={jest.fn()}
        onNavigateToUserManagement={jest.fn()}
        onNavigateToCompanyPlan={jest.fn()}
        onNavigateToProfile={jest.fn()}
        onNavigateToDevAdmin={jest.fn()}
      />,
    );

    expect(screen.getAllByText("Projects").length).toBeGreaterThan(0);
    expect(screen.queryByText("Company Overview")).toBeNull();
    expect(screen.queryByTestId("admin-company-overview-scope")).toBeNull();
    expect(screen.queryByTestId("company-banner__pressable")).toBeNull();

    expect(screen.getByTestId("admin-stat-section-company_plan")).toBeTruthy();
    expect(screen.getByTestId("admin-stat-section-projects")).toBeTruthy();
    expect(screen.getByTestId("admin-stat-section-team")).toBeTruthy();
    expect(screen.queryByTestId("admin-stat-section-completed_tasks")).toBeNull();
    expect(screen.queryByTestId("admin-stat-section-admins")).toBeNull();
    expect(screen.queryByText("Admins")).toBeNull();
    expect(screen.queryByText("Completed Tasks")).toBeNull();
    expect(screen.queryByText("Completed tasks")).toBeNull();
    expect(screen.queryByText("Total tracked")).toBeNull();

    expect(screen.queryByText("All projects : 12")).toBeNull();
    expect(screen.queryByText("By stage")).toBeNull();

    expect(screen.getByTestId("admin-stat-secondary-projects")).toBeTruthy();
    expect(screen.getByTestId("admin-stat-secondary-projects-planning")).toBeTruthy();
    expect(screen.getByTestId("admin-stat-secondary-projects-active")).toBeTruthy();
    expect(screen.queryByTestId("admin-stat-secondary-projects-on_hold")).toBeNull();
    expect(screen.getByTestId("admin-stat-secondary-projects-completed")).toBeTruthy();
    expect(screen.getByTestId("admin-stat-secondary-projects-cancelled")).toBeTruthy();
    expect(screen.getByText("Planning")).toBeTruthy();
    expect(screen.getByText("On-going")).toBeTruthy();
    expect(screen.queryByText("On Hold")).toBeNull();

    expect(screen.getByTestId("admin-stat-secondary-team")).toBeTruthy();
    expect(screen.getByTestId("admin-stat-secondary-team-pm")).toBeTruthy();
    expect(screen.getByTestId("admin-stat-secondary-team-worker")).toBeTruthy();
    expect(screen.getByText("PMs")).toBeTruthy();
    expect(screen.getByText("Workers")).toBeTruthy();

    expect(screen.getAllByText("Manage").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("View all")).toBeTruthy();
    expect(screen.queryByText("Manage plan")).toBeNull();
    expect(screen.queryByText("View projects")).toBeNull();
    expect(screen.queryByText("Manage team")).toBeNull();

    fireEvent.press(screen.getByTestId("admin-stat-company_plan"));
    expect(mockPressQuickAction).toHaveBeenCalledWith("company_plan");

    fireEvent.press(screen.getByTestId("admin-stat-projects"));
    expect(mockPressQuickAction).toHaveBeenCalledWith("projects");

    fireEvent.press(screen.getByTestId("admin-stat-team"));
    expect(mockPressQuickAction).toHaveBeenCalledWith("user_management");

    expect(screen.getByText("Company Plan")).toBeTruthy();
    expect(screen.getByText("BuildCo")).toBeTruthy();
    expect(screen.getByText("Plan & seats")).toBeTruthy();

    expect(screen.queryByTestId("admin-company-overview-banner")).toBeNull();
    expect(screen.queryByText("Banner")).toBeNull();
    expect(screen.queryByText("Tap to edit the company banner")).toBeNull();
  });
});
