import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import ContainerBodyMedia from "../ContainerBodyMedia";

describe("ContainerBodyMedia", () => {
  it("renders a collapsed affordance and expands thumbnail content on demand", () => {
    const screen = render(
      <ContainerBodyMedia
        cardTestId="container-card:test"
        media={{
          mode: "collapsible",
          collapsedLabel: "Photos (2)",
          items: [
            { id: "photo-1", uri: "https://example.com/1.jpg" },
            { id: "photo-2", uri: "https://example.com/2.jpg" },
          ],
        }}
      />,
    );

    expect(screen.getByText("Photos (2)")).toBeTruthy();
    expect(screen.queryByTestId("container-card:test__media-item__photo-1")).toBeNull();

    fireEvent.press(screen.getByTestId("container-card:test__media-toggle"));

    expect(screen.getByTestId("container-card:test__media-item__photo-1")).toBeTruthy();
    expect(screen.getByTestId("container-card:test__media-item__photo-2")).toBeTruthy();
  });
});
