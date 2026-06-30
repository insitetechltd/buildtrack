import React from "react";
import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import ModernScreenHeader from "../ModernScreenHeader";

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({ user: { id: "user-1", name: "Casey", companyId: "company-1" } }),
}));

jest.mock("@/state/companyStore", () => ({
  useCompanyStore: () => ({ getCompanyBanner: () => null }),
}));

jest.mock("@/state/themeStore", () => ({
  useThemeStore: () => ({ isDarkMode: false }),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({ common: { back: "Back" } }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

describe("ModernScreenHeader", () => {
  it("renders title and right element", () => {
    const screen = render(
      <ModernScreenHeader title="Task Details" rightElement={<Text>Modern UI</Text>} />,
    );

    expect(screen.getByText("Task Details")).toBeTruthy();
    expect(screen.getByText("Modern UI")).toBeTruthy();
  });

  it("renders a back button only when showBackButton is true", () => {
    const onBackPress = jest.fn();
    const screen = render(
      <ModernScreenHeader title="Task Details" showBackButton onBackPress={onBackPress} />,
    );

    fireEvent.press(screen.getByTestId("modernHeader-back"));

    expect(onBackPress).toHaveBeenCalledTimes(1);
  });
});

