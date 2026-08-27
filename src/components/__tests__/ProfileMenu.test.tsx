import React from "react";
import TestRenderer from "react-test-renderer";

import ProfileMenu, { getAvatarMenuSeatLabel } from "../ProfileMenu";

jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
  Modal: "Modal",
  Pressable: "Pressable",
  Text: "Text",
  View: "View",
}));

const mockUseAuthStore = jest.fn();

jest.mock("../../state/authStore", () => ({
  useAuthStore: (selector?: (state: unknown) => unknown) => {
    const state = mockUseAuthStore();
    return typeof selector === "function" ? selector(state) : state;
  },
}));

jest.mock("../../utils/useTranslation", () => ({
  useTranslation: () => ({
    dashboard: {
      profileAndSettings: "Profile & Settings",
      changeProject: "Change Project",
      logout: "Logout",
      logoutConfirm: "Are you sure you want to logout?",
    },
    common: {
      cancel: "Cancel",
    },
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

describe("ProfileMenu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseAuthStore.mockReturnValue({
      user: {
        id: "user-1",
        name: "Casey",
        role: "admin",
        systemPermission: "admin",
      },
      logout: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("exposes a stable testID for the change project action", () => {
    let screen: TestRenderer.ReactTestRenderer;

    TestRenderer.act(() => {
      screen = TestRenderer.create(
        <ProfileMenu
          visible
          onClose={jest.fn()}
          onNavigateToProjectPicker={jest.fn()}
        />,
      );
    });

    expect(() => screen.root.findByProps({ testID: "profile-menu-project_picker" })).not.toThrow();
  });

  it("shows Company management for admins when a navigation callback is provided", () => {
    const onNavigateToCompanyManagement = jest.fn();
    let screen: TestRenderer.ReactTestRenderer;

    TestRenderer.act(() => {
      screen = TestRenderer.create(
        <ProfileMenu
          visible
          onClose={jest.fn()}
          onNavigateToCompanyManagement={onNavigateToCompanyManagement}
        />,
      );
    });

    const managementItem = screen.root.findByProps({
      testID: "profile-menu-company_admin",
    });
    expect(managementItem.findByType("Text").props.children).toBe("Company management");
    TestRenderer.act(() => {
      managementItem.props.onPress();
      jest.runAllTimers();
    });

    expect(onNavigateToCompanyManagement).toHaveBeenCalledTimes(1);
  });

  it("hides Company management for workers even when a navigation callback is provided", () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: "worker-1",
        name: "Sam",
        role: "member",
        systemPermission: "member",
      },
      logout: jest.fn(),
    });

    let screen: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      screen = TestRenderer.create(
        <ProfileMenu
          visible
          onClose={jest.fn()}
          onNavigateToCompanyManagement={jest.fn()}
          onNavigateToTaskDashboard={jest.fn()}
          onNavigateToProjectPicker={jest.fn()}
        />,
      );
    });

    expect(() =>
      screen.root.findByProps({ testID: "profile-menu-company_admin" }),
    ).toThrow();

    const actionTestIds = screen.root
      .findAllByType("Pressable")
      .map((node) => node.props.testID)
      .filter((id): id is string => typeof id === "string" && id.startsWith("profile-menu-"));
    expect(actionTestIds).toEqual([
      "profile-menu-task_dashboard",
      "profile-menu-project_picker",
      "profile-menu-profile_settings",
      "profile-menu-logout",
    ]);
  });

  it("shows Tasks Dashboard when a navigation callback is provided", () => {
    const onNavigateToTaskDashboard = jest.fn();
    let screen: TestRenderer.ReactTestRenderer;

    TestRenderer.act(() => {
      screen = TestRenderer.create(
        <ProfileMenu
          visible
          onClose={jest.fn()}
          onNavigateToTaskDashboard={onNavigateToTaskDashboard}
        />,
      );
    });

    const item = screen.root.findByProps({
      testID: "profile-menu-task_dashboard",
    });
    expect(item.findByType("Text").props.children).toBe("Tasks Dashboard");
    TestRenderer.act(() => {
      item.props.onPress();
      jest.runAllTimers();
    });

    expect(onNavigateToTaskDashboard).toHaveBeenCalledTimes(1);
  });

  it("orders menu actions: Tasks Dashboard → Company management → Change Project → Profile & Settings → Logout", () => {
    let screen: TestRenderer.ReactTestRenderer;

    TestRenderer.act(() => {
      screen = TestRenderer.create(
        <ProfileMenu
          visible
          onClose={jest.fn()}
          onNavigateToProfile={jest.fn()}
          onNavigateToProjectPicker={jest.fn()}
          onNavigateToCompanyManagement={jest.fn()}
          onNavigateToTaskDashboard={jest.fn()}
        />,
      );
    });

    const actionTestIds = screen.root
      .findAllByType("Pressable")
      .map((node) => node.props.testID)
      .filter((id): id is string => typeof id === "string" && id.startsWith("profile-menu-"));
    expect(actionTestIds).toEqual([
      "profile-menu-task_dashboard",
      "profile-menu-company_admin",
      "profile-menu-project_picker",
      "profile-menu-profile_settings",
      "profile-menu-logout",
    ]);
  });

  it("labels seats by privilege (CA / manager / worker)", () => {
    expect(
      getAvatarMenuSeatLabel({
        id: "a",
        name: "A",
        email: "a@x.com",
        role: "admin",
        systemPermission: "admin",
        companyId: "c",
        createdAt: "",
      } as never),
    ).toBe("Company Admin");
    expect(
      getAvatarMenuSeatLabel({
        id: "m",
        name: "M",
        email: "m@x.com",
        role: "manager",
        systemPermission: "manager",
        companyId: "c",
        createdAt: "",
      } as never),
    ).toBe("Manager");
    expect(
      getAvatarMenuSeatLabel({
        id: "w",
        name: "W",
        email: "w@x.com",
        role: "member",
        systemPermission: "member",
        companyId: "c",
        createdAt: "",
      } as never),
    ).toBe("Worker");
  });
});
