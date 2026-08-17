import { act, renderHook } from "@testing-library/react-native";
import { Alert, Linking } from "react-native";

import {
  PRIVACY_POLICY_URL,
  SUPPORT_URL,
  TERMS_OF_SERVICE_URL,
} from "@/legal/legalLinks";
import { useProfileViewAdapter } from "../useProfileViewAdapter";

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: {
      id: "user-1",
      name: "Alex Mason",
      role: "worker",
      email: "alex@example.com",
      phone: "",
      companyId: "company-1",
    },
    changePassword: jest.fn(),
  }),
}));

jest.mock("@/state/languageStore", () => ({
  useLanguageStore: () => ({ language: "en", setLanguage: jest.fn() }),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    common: { cancel: "Cancel" },
    phrases: { comingSoon: "Coming Soon", comingSoonMessage: "Soon msg" },
    profile: {
      deleteAccount: "Delete Account",
      helpSupport: "Help & Support",
      language: "Language",
      english: "English",
      traditionalChinese: "繁體中文",
      englishUS: "English (United States)",
      theme: "Theme",
      darkMode: "Dark Mode",
      lightMode: "Light Mode",
      notifications: "Notifications",
      privacySecurity: "Privacy & Security",
      editProfile: "Edit Profile",
      reloadData: "Reload Data",
      settings: "Settings",
      companyPlan: "Company plan",
      continueToCheckout: "Continue to checkout",
      companyPlan: "Company plan",
      continueToCheckout: "Continue to checkout",
    },
  }),
}));

jest.mock("@/state/themeStore", () => ({
  useThemeStore: () => ({ isDarkMode: false, toggleDarkMode: jest.fn() }),
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: () => ({ fetchTasks: jest.fn() }),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithInit: () => ({ fetchProjects: jest.fn() }),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStore: () => ({ getPendingUsersByCompany: () => [] }),
}));

jest.mock("@/api/supabase", () => ({
  checkSupabaseConnection: jest.fn().mockResolvedValue(true),
}));

describe("useProfileViewAdapter legal / support links", () => {
  const openURL = jest.spyOn(Linking, "openURL");
  const alertSpy = jest.spyOn(Alert, "alert");

  beforeEach(() => {
    jest.clearAllMocks();
    openURL.mockResolvedValue(undefined as never);
  });

  afterAll(() => {
    openURL.mockRestore();
    alertSpy.mockRestore();
  });

  it("opens the privacy policy URL instead of Coming Soon", () => {
    const { result } = renderHook(() =>
      useProfileViewAdapter({ onNavigateBack: jest.fn() }),
    );

    act(() => {
      result.current.actions.handleMenuAction("privacy-policy");
    });

    expect(openURL).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
    expect(alertSpy).not.toHaveBeenCalledWith(
      "Coming Soon",
      expect.any(String),
    );
  });

  it("opens the terms of service URL instead of Coming Soon", () => {
    const { result } = renderHook(() =>
      useProfileViewAdapter({ onNavigateBack: jest.fn() }),
    );

    act(() => {
      result.current.actions.handleMenuAction("terms-of-service");
    });

    expect(openURL).toHaveBeenCalledWith(TERMS_OF_SERVICE_URL);
    expect(alertSpy).not.toHaveBeenCalledWith(
      "Coming Soon",
      expect.any(String),
    );
  });

  it("opens the public support page instead of Coming Soon", () => {
    const { result } = renderHook(() =>
      useProfileViewAdapter({ onNavigateBack: jest.fn() }),
    );

    act(() => {
      result.current.actions.handleMenuAction("help-support");
    });

    expect(openURL).toHaveBeenCalledWith(SUPPORT_URL);
    expect(alertSpy).not.toHaveBeenCalledWith(
      "Help & Support",
      expect.stringMatching(/system administrator/i),
    );
  });
});
