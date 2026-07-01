import React from "react";
import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import ModernScreenHeader from "../ModernScreenHeader";

const mockNavigate = jest.fn();
const mockProfileMenu = jest.fn(
  ({
    visible,
    onNavigateToProfile,
    onNavigateToProjectPicker,
  }: {
    visible: boolean;
    onNavigateToProfile?: () => void;
    onNavigateToProjectPicker?: (allowBack?: boolean) => void;
  }) =>
    visible ? (
      <>
        <Text>Profile Menu</Text>
        <Text onPress={() => onNavigateToProjectPicker?.(true)}>Change Project</Text>
        <Text onPress={() => onNavigateToProfile?.()}>Profile & Settings</Text>
      </>
    ) : null,
);

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({ user: { id: "user-1", name: "Casey", companyId: "company-1" } }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    getParent: () => ({
      navigate: mockNavigate,
    }),
  }),
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

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: unknown) => <View {...(props as object)} />,
  };
});

jest.mock("../ProfileMenu", () => ({
  __esModule: true,
  default: (props: unknown) => mockProfileMenu(props as never),
}));

describe("ModernScreenHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it("uses the shared arrow-style back affordance instead of a Back label", () => {
    const screen = render(<ModernScreenHeader title="Task Details" showBackButton onBackPress={jest.fn()} />);

    expect(screen.queryByText("Back")).toBeNull();
    expect(screen.getByTestId("modernHeader-back-icon")).toBeTruthy();
  });

  it("preserves the legacy header top padding footprint", () => {
    const screen = render(<ModernScreenHeader title="Task Details" />);

    expect(screen.getByTestId("modernHeader-root").props.style).toEqual(
      expect.objectContaining({ paddingTop: 16 }),
    );
  });

  it("opens the profile menu and routes profile actions through the provided callbacks", () => {
    const onNavigateToProfile = jest.fn();
    const onNavigateToProjectPicker = jest.fn();
    const screen = render(
      <ModernScreenHeader
        title="Task Details"
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToProjectPicker={onNavigateToProjectPicker}
      />,
    );

    fireEvent.press(screen.getByTestId("modernHeader-profile-trigger"));

    expect(screen.getByText("Profile Menu")).toBeTruthy();

    fireEvent.press(screen.getByText("Change Project"));
    fireEvent.press(screen.getByText("Profile & Settings"));

    expect(onNavigateToProjectPicker).toHaveBeenCalledWith(true);
    expect(onNavigateToProfile).toHaveBeenCalledTimes(1);
  });
});
