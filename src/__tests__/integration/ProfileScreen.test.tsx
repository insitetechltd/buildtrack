import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import ProfileScreen from "@/screens/ProfileScreen";

jest.mock(
  "../../ui/viewAdapters/useProfileViewAdapter",
  () => ({
    useProfileViewAdapter: jest.fn(),
  }),
);

jest.mock("../../components/ModernScreenHeader", () => ({
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

jest.mock("../../components/ModalHandle", () => ({
  __esModule: true,
  default: function MockModalHandle() {
    return null;
  },
}));

jest.mock("../../components/ExpandableUtilityFAB", () => ({
  __esModule: true,
  default: function MockExpandableUtilityFAB() {
    return null;
  },
}));

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: {
      id: "user-1",
      name: "Alex Mason",
      role: "admin",
      email: "alex@example.com",
      phone: "+1 555 0100",
      companyId: "company-1",
    },
    changePassword: jest.fn(),
  }),
}));

jest.mock("@/state/languageStore", () => ({
  useLanguageStore: () => ({
    language: "en",
    setLanguage: jest.fn(),
  }),
}));

jest.mock("@/state/themeStore", () => ({
  useThemeStore: () => ({
    isDarkMode: false,
    toggleDarkMode: jest.fn(),
  }),
}));

jest.mock("@/state/companyStore", () => ({
  useCompanyStore: () => ({
    getCompanyBanner: jest.fn(),
  }),
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: () => ({
    fetchTasks: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithInit: () => ({
    fetchProjects: jest.fn().mockResolvedValue(undefined),
    fetchUserProjectAssignments: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStore: () => ({
    fetchUsers: jest.fn().mockResolvedValue(undefined),
    getPendingUsersByCompany: () => [{ id: "pending-1" }],
  }),
}));

jest.mock("@/api/supabase", () => ({
  checkSupabaseConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/utils/environmentDetector", () => ({
  detectEnvironment: () => ({
    type: "local",
    isEAS: false,
    isLocal: true,
    isDevelopment: true,
    displayName: "Local",
    description: "Local Development",
  }),
  getEnvironmentStyles: () => ({
    backgroundColor: "#3b82f6",
  }),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    profile: {
      profile: "Profile",
      settings: "Settings",
      language: "Language",
      english: "English",
      traditionalChinese: "Traditional Chinese",
      theme: "Theme",
      darkMode: "Dark Mode",
      lightMode: "Light Mode",
      reloadData: "Refresh Data",
      editProfile: "Edit Profile",
      notifications: "Notifications",
      privacySecurity: "Privacy & Security",
      helpSupport: "Help & Support",
      selectLanguage: "Select Language",
      languageChanged: "Language Changed",
      languageChangedMessage: "Reload now?",
      reloadNow: "Reload Now",
      later: "Later",
      pleaseRestart: "Please Restart",
      pleaseRestartMessage: "Please restart the app.",
    },
    phrases: {
      comingSoon: "Coming Soon",
      comingSoonMessage: "This feature is coming soon.",
    },
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

describe("ProfileScreen", () => {
  const mockHandleRefreshData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const { useProfileViewAdapter } = require("../../ui/viewAdapters/useProfileViewAdapter");

    useProfileViewAdapter.mockReturnValue({
      output: {
        screenId: "ProfileScreen",
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
        profileCard: {
          initial: "A",
          name: "Alex Mason",
          roleLabel: "admin",
          email: "alex@example.com",
          phone: "+1 555 0100",
        },
        sections: [
          {
            id: "settings",
            title: "Settings",
            items: [
              {
                id: "theme",
                actionId: "theme",
                title: "Theme",
                icon: "sunny-outline",
                showChevron: true,
                density: "standard",
                structuralState: "stale",
              },
            ],
          },
          {
            id: "about",
            title: "About",
            items: [
              {
                id: "help-support",
                actionId: "help-support",
                title: "Help & Support",
                icon: "help-circle-outline",
                showChevron: true,
                density: "standard",
                structuralState: "stale",
              },
            ],
          },
        ],
        languagePicker: {
          visible: false,
          selectedLanguage: "en",
          options: [],
        },
        passwordChange: {
          visible: false,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          isSubmitting: false,
          isValid: false,
        },
        systemStatusItems: [],
      },
      actions: {
        handleMenuAction: mockHandleRefreshData,
        closeLanguagePicker: jest.fn(),
        handleLanguageSelection: jest.fn(),
        closePasswordChange: jest.fn(),
        setCurrentPassword: jest.fn(),
        setNewPassword: jest.fn(),
        setConfirmPassword: jest.fn(),
        submitPasswordChange: jest.fn(),
      },
    });

jest.mock("../../components/BrandHeaderTitle", () => ({
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

  });

  it("renders profile content and delegates menu actions through the profile adapter", () => {
    const screen = render(<ProfileScreen onNavigateBack={jest.fn()} />);

    expect(screen.getByText("Profile")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByText("Theme")).toBeTruthy();
    expect(screen.getByText("Help & Support")).toBeTruthy();
    expect(screen.queryByText("System Status")).toBeNull();
    expect(screen.queryByText("Refresh Data")).toBeNull();

    fireEvent.press(screen.getByText("Theme"));

    expect(mockHandleRefreshData).toHaveBeenCalledWith("theme");
  });
});
