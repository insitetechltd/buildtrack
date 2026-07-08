import React from "react";
import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import AppScreenHeader from "../AppScreenHeader";

const mockSafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };

const mockProfileMenu = jest.fn(
  ({
    visible,
    onNavigateToProfile,
    onNavigateToProjectPicker,
    onNavigateToDeveloperSettings,
  }: {
    visible: boolean;
    onNavigateToProfile?: () => void;
    onNavigateToProjectPicker?: (allowBack?: boolean) => void;
    onNavigateToDeveloperSettings?: () => void;
  }) =>
    visible ? (
      <>
        <Text>Profile Menu</Text>
        <Text onPress={() => onNavigateToProjectPicker?.(true)}>Change Project</Text>
        <Text onPress={() => onNavigateToProfile?.()}>Profile & Settings</Text>
        <Text onPress={() => onNavigateToDeveloperSettings?.()}>Developer Settings</Text>
      </>
    ) : null,
);

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({ user: { id: "user-1", name: "Casey", companyId: "company-1" } }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => mockSafeAreaInsets,
}));

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: unknown) => <View {...(props as object)} />,
  };
});

jest.mock("@/components/ProfileMenu", () => ({
  __esModule: true,
  default: (props: unknown) => mockProfileMenu(props as never),
}));

describe("AppScreenHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSafeAreaInsets.top = 0;
    mockSafeAreaInsets.bottom = 0;
    mockSafeAreaInsets.left = 0;
    mockSafeAreaInsets.right = 0;
  });

  it("renders title, subtitle, back affordance, and action slot", () => {
    const onBackPress = jest.fn();
    const screen = render(
      <AppScreenHeader
        title="Projects"
        subtitle="12 active"
        showBackButton
        onBackPress={onBackPress}
        rightSlot={<Text>Action Slot</Text>}
      />,
    );

    expect(screen.getByText("Projects")).toBeTruthy();
    expect(screen.getByText("12 active")).toBeTruthy();
    expect(screen.getByText("Action Slot")).toBeTruthy();
    expect(screen.getByText("Projects").props.numberOfLines).toBe(1);
    expect(screen.getByText("Projects").props.ellipsizeMode).toBe("tail");
    expect(screen.getByText("Projects").props.className).toContain("text-[28px]");
    expect(screen.getByText("Projects").props.className).toContain("leading-8");
    expect(screen.getByText("12 active").props.className).toContain("text-base");
    expect(screen.getByTestId("app-screen-header__root").props.className).toContain("pb-3");
    expect(screen.getByTestId("app-screen-header__root").props.style).toMatchObject({ paddingTop: 12 });

    fireEvent.press(screen.getByTestId("app-screen-header__back"));
    expect(onBackPress).toHaveBeenCalledTimes(1);
  });

  it("adds the device top inset once through the shared header shell", () => {
    mockSafeAreaInsets.top = 18;

    const screen = render(<AppScreenHeader title="Projects" />);

    expect(screen.getByTestId("app-screen-header__root").props.style).toMatchObject({ paddingTop: 22 });
  });

  it("keeps long header titles on a single line", () => {
    const screen = render(
      <AppScreenHeader
        title="Recent Activity"
        rightSlot={<Text>Action Slot</Text>}
      />,
    );

    const title = screen.getByText("Recent Activity");

    expect(title.props.numberOfLines).toBe(1);
    expect(title.props.ellipsizeMode).toBe("tail");
    expect(title.props.adjustsFontSizeToFit).toBe(true);
    expect(title.props.minimumFontScale).toBe(0.9);
  });

  it("renders the canonical shared back icon when back is enabled", () => {
    const screen = render(
      <AppScreenHeader title="Projects" showBackButton onBackPress={jest.fn()} />,
    );

    const backButton = screen.getByTestId("app-screen-header__back");
    const backIcon = screen.getByTestId("app-screen-header__back-icon");

    expect(backButton).toBeTruthy();
    expect(backButton.props.accessibilityLabel).toBe("Go back");
    expect(backButton.props.className).toContain("h-10");
    expect(backButton.props.className).toContain("w-10");
    expect(backIcon).toBeTruthy();
    expect(backIcon.props.name).toBe("arrow-back");
  });

  it("opens the profile menu and routes shared menu callbacks", () => {
    const onNavigateToProfile = jest.fn();
    const onNavigateToProjectPicker = jest.fn();
    const onNavigateToDeveloperSettings = jest.fn();
    const screen = render(
      <AppScreenHeader
        title="Projects"
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToProjectPicker={onNavigateToProjectPicker}
        onNavigateToDeveloperSettings={onNavigateToDeveloperSettings}
      />,
    );

    fireEvent.press(screen.getByTestId("app-screen-header__profile-trigger"));

    expect(screen.getByText("Profile Menu")).toBeTruthy();

    fireEvent.press(screen.getByText("Change Project"));
    fireEvent.press(screen.getByText("Profile & Settings"));
    fireEvent.press(screen.getByText("Developer Settings"));

    expect(onNavigateToProjectPicker).toHaveBeenCalledWith(true);
    expect(onNavigateToProfile).toHaveBeenCalledTimes(1);
    expect(onNavigateToDeveloperSettings).toHaveBeenCalledTimes(1);
  });
});
