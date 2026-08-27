import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import CreateTaskInputField from "../CreateTaskInputField";

describe("CreateTaskInputField", () => {
  it("shows a required asterisk by default", () => {
    const screen = render(
      <CreateTaskInputField label="Assign To">
        <Text>picker</Text>
      </CreateTaskInputField>,
    );

    expect(screen.getByText(/Assign To/)).toBeTruthy();
    expect(screen.getByText("*")).toBeTruthy();
  });

  it("hides the required asterisk when required is false", () => {
    const screen = render(
      <CreateTaskInputField label="Location on Site" required={false}>
        <Text>picker</Text>
      </CreateTaskInputField>,
    );

    expect(screen.getByText(/Location on Site/)).toBeTruthy();
    expect(screen.queryByText("*")).toBeNull();
  });
});
