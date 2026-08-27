import { act, renderHook } from "@testing-library/react-native";

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
    phrases: { comingSoon: "Soon", comingSoonMessage: "Soon msg" },
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

describe("useProfileViewAdapter corp account model", () => {
  it("does not expose Delete Account (org-managed seats)", () => {
    const { result } = renderHook(() => useProfileViewAdapter({}));
    const settingsItems =
      result.current.output.sections.find((s) => s.id === "profile-section:settings")
        ?.items ?? [];
    expect(
      settingsItems.some((item) => item.actionId === "delete-account"),
    ).toBe(false);
  });

  it("exposes help support in the About section", () => {
    const { result } = renderHook(() => useProfileViewAdapter({}));
    act(() => {
      // no-op: ensure hook remains stable
    });
    const aboutItems =
      result.current.output.sections.find((s) => s.id === "profile-section:about")
        ?.items ?? [];
    expect(aboutItems.some((item) => item.actionId === "help-support")).toBe(true);
    const settingsItems =
      result.current.output.sections.find((s) => s.id === "profile-section:settings")
        ?.items ?? [];
    expect(settingsItems.some((item) => item.actionId === "help-support")).toBe(
      false,
    );
  });
});
