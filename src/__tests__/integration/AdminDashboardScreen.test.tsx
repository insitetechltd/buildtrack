import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import AdminDashboardScreen from "@/screens/AdminDashboardScreen";

jest.mock("../../ui/viewAdapters/useAdminDashboardViewAdapter", () => ({
  useAdminDashboardViewAdapter: jest.fn(),
}));

jest.mock("@/components/StandardHeader", () => ({
  __esModule: true,
  default: function MockStandardHeader({
    title,
    rightElement,
  }: {
    title: string;
    rightElement?: React.ReactNode;
  }) {
    const { View, Text } = require("react-native");

    return (
      <View>
        <Text>{title}</Text>
        {rightElement}
      </View>
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
          companyName: "BuildCo",
          subtitle: "Showing data for your company only",
        },
        topLevelStats: [
          {
            id: "admin-stat:projects",
            statId: "projects",
            label: "Projects",
            value: 12,
            subtitle: "8 active",
            icon: "folder-open-outline",
            color: "bg-blue-50",
            iconColor: "#3b82f6",
            textColor: "text-blue-600",
            density: "standard",
            structuralState: "stale",
          },
        ],
        quickActions: [
          {
            id: "admin-action:projects",
            actionId: "projects",
            label: "Projects",
            description: "Create, edit, and oversee all construction projects",
            icon: "folder-open-outline",
            color: "bg-blue-50",
            iconColor: "#3b82f6",
            borderColor: "border-blue-300",
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

  it("renders admin dashboard stats and delegates project navigation through the admin adapter", () => {
    const screen = render(
      <AdminDashboardScreen
        onNavigateToProjects={jest.fn()}
        onNavigateToUserManagement={jest.fn()}
        onNavigateToProfile={jest.fn()}
        onNavigateToDevAdmin={jest.fn()}
      />,
    );

    expect(screen.getAllByText("Admin Dashboard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("BuildCo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Projects").length).toBeGreaterThan(0);

    screen.getByTestId("admin-quick-action-trigger-projects").props.onPress();

    expect(mockPressQuickAction).toHaveBeenCalledWith("projects");
  });
});
