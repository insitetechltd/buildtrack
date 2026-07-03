import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import ScreenSection from "../ScreenSection";

describe("ScreenSection", () => {
  it("renders title, subtitle, and children", () => {
    const screen = render(
      <ScreenSection title="Overview" subtitle="Daily summary">
        <Text>Section Body</Text>
      </ScreenSection>,
    );

    expect(screen.getByText("Overview")).toBeTruthy();
    expect(screen.getByText("Daily summary")).toBeTruthy();
    expect(screen.getByText("Section Body")).toBeTruthy();
  });
});
