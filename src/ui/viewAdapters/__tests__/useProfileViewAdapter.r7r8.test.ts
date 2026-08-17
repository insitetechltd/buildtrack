import { act, renderHook } from "@testing-library/react-native";
import { Alert, Linking } from "react-native";

import { resolveOrgCheckoutUrl } from "@/billing/orgPlans";
import { useProfileViewAdapter } from "../useProfileViewAdapter";

jest.mock("@/types/buildtrack", () => ({
  isAdmin: () => true,
}));

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: {
      id: "admin-1",
      name: "Henry",
      role: "admin",
      email: "henry@example.com",
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
      helpSupport: "Help & Support",
      language: "Language",
      english: "English",
      traditionalChinese: "繁體中文",
      englishUS: "English (United States)",
      theme: "Theme",
      darkMode: "Dark Mode",
      lightMode: "Light Mode",
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
  useUserStore: () => ({
    getPendingUsersByCompany: () => [{ id: "p1" }],
    fetchUsers: jest.fn(),
  }),
}));

jest.mock("@/api/supabase", () => ({
  checkSupabaseConnection: jest.fn().mockResolvedValue(true),
}));

describe("useProfileViewAdapter R7/R8", () => {
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

  function settingsItems() {
    const { result } = renderHook(() =>
      useProfileViewAdapter({ onNavigateBack: jest.fn() }),
    );
    return (
      result.current.output.sections.find((s) => s.id === "profile-section:settings")
        ?.items ?? []
    );
  }

  it("shows Company plan for admins and opens checkout", () => {
    const { result } = renderHook(() =>
      useProfileViewAdapter({ onNavigateBack: jest.fn() }),
    );
    const items =
      result.current.output.sections.find((s) => s.id === "profile-section:settings")
        ?.items ?? [];
    expect(items.some((item) => item.actionId === "company-plan")).toBe(true);

    act(() => {
      result.current.actions.handleMenuAction("company-plan");
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "Company plan",
      expect.stringContaining("US$19.99/mo"),
      expect.any(Array),
    );
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    act(() => {
      buttons.find((b) => b.text === "Continue to checkout")?.onPress?.();
    });
    expect(openURL).toHaveBeenCalledWith(resolveOrgCheckoutUrl());
  });

  it("hides Coming Soon and duplicate pending-approvals rows", () => {
    const items = settingsItems();
    const ids = items.map((item) => item.actionId);
    expect(ids).not.toContain("edit-profile");
    expect(ids).not.toContain("notifications");
    expect(ids).not.toContain("privacy-security");
    expect(ids).not.toContain("pending-approvals");
  });
});
