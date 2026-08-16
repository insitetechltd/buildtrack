import React from "react";
import { render } from "@testing-library/react-native";

import AppScreenHeader from "../AppScreenHeader";
import BrandHeaderTitle from "../BrandHeaderTitle";
import { HeaderChromeProvider } from "../headerChrome";

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({ user: { id: "user-1", name: "Casey", companyId: "company-1" } }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: unknown) => <View {...(props as object)} />,
  };
});

jest.mock("@/components/ProfileMenu", () => ({
  __esModule: true,
  default: () => null,
}));

describe("BrandHeaderTitle", () => {
  it("renders the branded taskr title with the provided subtitle", () => {
    const screen = render(<BrandHeaderTitle subtitle="Site activity" />);

    expect(screen.getByTestId("brand-header-title")).toBeTruthy();
    expect(screen.getByTestId("brand-header-title__mark")).toBeTruthy();
    expect(screen.getByText("TASKR")).toBeTruthy();
    expect(screen.getByText("Site activity")).toBeTruthy();
  });

  it("renders a two-line title without the brand mark", () => {
    const screen = render(
      <BrandHeaderTitle label="Test Upload 1" subtitle="Task details" showMark={false} />,
    );

    expect(screen.getByText("TEST UPLOAD 1")).toBeTruthy();
    expect(screen.queryByTestId("brand-header-title__mark")).toBeNull();
    expect(screen.getByText("Task details").props.className).toContain("text-xs");
    expect(screen.getByText("TEST UPLOAD 1").props.className).toContain("text-[24px]");
  });

  it("hides the brand mark when header chrome disallows it (back-button screens)", () => {
    const screen = render(
      <HeaderChromeProvider allowBrandMark={false}>
        <BrandHeaderTitle label="Task title" subtitle="Task details" />
      </HeaderChromeProvider>,
    );

    expect(screen.queryByTestId("brand-header-title__mark")).toBeNull();
    expect(screen.getByText("TASK TITLE")).toBeTruthy();
  });
});

describe("AppScreenHeader brand XOR back", () => {
  it("shows the brand mark without a back button on root screens", () => {
    const screen = render(
      <AppScreenHeader
        title="Activity"
        titleNode={<BrandHeaderTitle subtitle="Site activity" />}
        showBackButton={false}
      />,
    );

    expect(screen.getByTestId("brand-header-title__mark")).toBeTruthy();
    expect(screen.queryByTestId("app-screen-header__back")).toBeNull();
  });

  it("shows the back button and hides the brand mark on push screens", () => {
    const screen = render(
      <AppScreenHeader
        title="Detail"
        titleNode={<BrandHeaderTitle label="Some Task" subtitle="Task details" />}
        showBackButton
        onBackPress={jest.fn()}
      />,
    );

    expect(screen.getByTestId("app-screen-header__back")).toBeTruthy();
    expect(screen.queryByTestId("brand-header-title__mark")).toBeNull();
    expect(screen.getByText("SOME TASK")).toBeTruthy();
  });
});
