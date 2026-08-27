import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import ProjectForm from "../ProjectForm";

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: { id: "user-1", name: "Casey", companyId: "company-1", role: "admin" },
  }),
}));

jest.mock("@/utils/dateFormatter", () => ({
  useDateFormatter: () => ({
    formatDateShort: (date: Date) => date.toISOString().slice(0, 10),
  }),
}));

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: unknown) => <View {...(props as object)} />,
  };
});

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: unknown) => <View {...(props as object)} />,
  };
});

describe("ProjectForm status dropdown stacking", () => {
  it("elevates the Project Information card above Location while the status menu is open", () => {
    const screen = render(
      <ProjectForm
        mode="create"
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        submitButtonText="Create Project"
      />,
    );

    const infoCardClosed = screen.getByTestId("project-form-info-card");
    const locationCard = screen.getByTestId("project-form-location-card");

    expect(infoCardClosed.props.style).toEqual(
      expect.objectContaining({ zIndex: 1, elevation: 0, overflow: "visible" }),
    );
    expect(locationCard.props.style).toEqual(
      expect.objectContaining({ zIndex: 1, elevation: 1 }),
    );
    expect(screen.queryByTestId("project-form-status-menu")).toBeNull();

    fireEvent.press(screen.getByTestId("project-form-status-trigger"));

    const infoCardOpen = screen.getByTestId("project-form-info-card");
    expect(infoCardOpen.props.style).toEqual(
      expect.objectContaining({ zIndex: 20, elevation: 20, overflow: "visible" }),
    );
    expect(screen.getByTestId("project-form-status-menu")).toBeTruthy();
    expect(screen.getByTestId("project-form-status-option-active")).toBeTruthy();
    expect(screen.queryByTestId("project-form-status-option-on_hold")).toBeNull();

    fireEvent.press(screen.getByTestId("project-form-status-option-active"));

    expect(screen.queryByTestId("project-form-status-menu")).toBeNull();
    expect(screen.getByText("On-going")).toBeTruthy();
    expect(screen.queryByText("On Hold")).toBeNull();
    expect(screen.getByTestId("project-form-info-card").props.style).toEqual(
      expect.objectContaining({ zIndex: 1, elevation: 0 }),
    );
  });
});
