import React from "react";
import { render } from "@testing-library/react-native";

import BrandHeaderTitle from "../BrandHeaderTitle";

describe("BrandHeaderTitle", () => {
  it("renders the branded taskr title with the provided subtitle", () => {
    const screen = render(<BrandHeaderTitle subtitle="Site activity" />);

    expect(screen.getByTestId("brand-header-title")).toBeTruthy();
    expect(screen.getByText("TASKR")).toBeTruthy();
    expect(screen.getByText("Site activity")).toBeTruthy();
  });

  it("renders a two-line title without the brand mark", () => {
    const screen = render(
      <BrandHeaderTitle label="Test Upload 1" subtitle="Task details" showMark={false} />,
    );

    expect(screen.getByText("TEST UPLOAD 1")).toBeTruthy();
    expect(screen.getByText("Task details").props.className).toContain("text-xs");
    expect(screen.getByText("TEST UPLOAD 1").props.className).toContain("text-[24px]");
  });
});
