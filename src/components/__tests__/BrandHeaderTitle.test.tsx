import React from "react";
import { render } from "@testing-library/react-native";

import BrandHeaderTitle from "../BrandHeaderTitle";

describe("BrandHeaderTitle", () => {
  it("renders the branded taskr title in uppercase with the provided subtitle", () => {
    const screen = render(<BrandHeaderTitle subtitle="Site activity" />);

    expect(screen.getByTestId("brand-header-title")).toBeTruthy();
    expect(screen.getByText("TASKR")).toBeTruthy();
    expect(screen.getByText("Site activity")).toBeTruthy();
  });

  it("supports overriding the brand label", () => {
    const screen = render(<BrandHeaderTitle label="Insite" />);

    expect(screen.getByText("INSITE")).toBeTruthy();
  });
});
