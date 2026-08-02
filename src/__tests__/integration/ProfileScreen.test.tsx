import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import ProfileScreen from "@/screens/ProfileScreen";

jest.mock(
  "../../ui/viewAdapters/useProfileViewAdapter",
  () => ({
    useProfileViewAdapter: jest.fn(),
  }),
);

jest.mock("../../components/StandardHeader", () => ({
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
                id: "refresh-data",
                actionId: "refresh-data",
                title: "Refresh Data",
                icon: "refresh-outline",
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
  });

  it("renders profile content and delegates refresh through the profile adapter", () => {
    const screen = render(<ProfileScreen onNavigateBack={jest.fn()} />);

    expect(screen.getByTestId("profile-screen__root")).toBeTruthy();
    expect(screen.getByTestId("profile-screen__scroll")).toBeTruthy();
    expect(screen.getByTestId("profile-screen__profile_card")).toBeTruthy();
    expect(screen.getByTestId("profile-screen__section_settings")).toBeTruthy();
    expect(screen.getByText("Profile")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByText("Refresh Data")).toBeTruthy();

    fireEvent.press(screen.getByTestId("profile-screen__action_refresh-data"));

    expect(mockHandleRefreshData).toHaveBeenCalledWith("refresh-data");
  });
});
