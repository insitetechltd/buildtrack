import { act, renderHook } from "@testing-library/react-native";

import { useProfileViewAdapter } from "../useProfileViewAdapter";

const mockAuthUser = {
  id: "henry-company-admin",
  name: "Henry",
  role: "company_admin",
  systemPermission: "company_admin",
  email: "henry@example.com",
  phone: "",
  companyId: "company-1",
};

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: mockAuthUser,
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

describe("useProfileViewAdapter owner console gate", () => {
  it("hides Owner Console for company admin who is not platform superuser", () => {
    mockAuthUser.id = "henry-company-admin";
    const { result } = renderHook(() =>
      useProfileViewAdapter({
        onNavigateBack: jest.fn(),
        onNavigateToOwnerConsole: jest.fn(),
      }),
    );

    const settings = result.current.output.sections.find(
      (s) => s.id === "profile-section:settings",
    );
    expect(
      settings?.items.some((item) => item.actionId === "owner-console"),
    ).toBe(false);
  });

  it("shows Owner Console and navigates for allowlisted Tristan", () => {
    mockAuthUser.id = "006fe339-c4c6-456f-965a-2a9ff47d35de";
    const onNavigateToOwnerConsole = jest.fn();
    const { result } = renderHook(() =>
      useProfileViewAdapter({
        onNavigateBack: jest.fn(),
        onNavigateToOwnerConsole,
      }),
    );

    const settings = result.current.output.sections.find(
      (s) => s.id === "profile-section:settings",
    );
    expect(
      settings?.items.some((item) => item.actionId === "owner-console"),
    ).toBe(true);

    act(() => {
      result.current.actions.handleMenuAction("owner-console");
    });
    expect(onNavigateToOwnerConsole).toHaveBeenCalledTimes(1);
  });
});
