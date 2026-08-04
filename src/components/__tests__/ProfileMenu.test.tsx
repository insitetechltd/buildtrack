import React from "react";
import TestRenderer from "react-test-renderer";

import ProfileMenu from "../ProfileMenu";

jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
  Modal: "Modal",
  Pressable: "Pressable",
  Text: "Text",
  View: "View",
}));

jest.mock("../../state/authStore", () => ({
  useAuthStore: () => ({
    user: { id: "user-1", name: "Casey", role: "manager" },
    logout: jest.fn(),
  }),
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

jest.mock("@expo/vector-icons", () => {
  return {
    Ionicons: "Ionicons",
  };
});

describe("ProfileMenu", () => {
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
});
