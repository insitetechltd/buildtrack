import React from "react";
import { Text, View } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import ActivityStyleRowCard from "../ActivityStyleRowCard";

describe("ActivityStyleRowCard", () => {
  it("renders the shared activity-style card with a balanced left rail and a no-photo placeholder icon", () => {
    const screen = render(
      <ActivityStyleRowCard
        testID="shared-card:task-1"
        title="Test critical date"
        subtitle="Task accepted by Herman"
        metaLabel="Jul 7 at 6:48 PM"
        badgeLabel="In Progress"
        imageUri={undefined}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByTestId("shared-card:task-1")).toBeTruthy();
    expect(screen.getByTestId("shared-card:task-1:thumbnail")).toBeTruthy();
    expect(screen.getByTestId("shared-card:task-1:thumbnail-placeholder")).toBeTruthy();
    expect(screen.getByTestId("shared-card:task-1:no-photo-icon")).toBeTruthy();
    expect(screen.queryByTestId("shared-card:task-1:thumbnail-image")).toBeNull();
    expect(screen.getByText("Test critical date")).toBeTruthy();
    expect(screen.getByText("Task accepted by Herman")).toBeTruthy();
    expect(screen.getByText("Jul 7 at 6:48 PM")).toBeTruthy();
    expect(screen.getByText("In Progress")).toBeTruthy();
  });

  it("renders a real thumbnail, preserves tap-through, and falls back to the placeholder rail after an image error", () => {
    const onPress = jest.fn();
    const screen = render(
      <ActivityStyleRowCard
        testID="shared-card:task-2"
        title="Concrete inspection"
        subtitle="North Tower"
        metaLabel="Jul 8 at 9:15 AM"
        badgeLabel="Review"
        imageUri="https://example.com/preview.jpg"
        onPress={onPress}
      />,
    );

    fireEvent.press(screen.getByTestId("shared-card:task-2"));
    fireEvent(screen.getByTestId("shared-card:task-2:thumbnail-image"), "error");

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("shared-card:task-2:thumbnail")).toBeTruthy();
    expect(screen.getByTestId("shared-card:task-2:thumbnail-placeholder")).toBeTruthy();
    expect(screen.getByTestId("shared-card:task-2:no-photo-icon")).toBeTruthy();
    expect(screen.queryByTestId("shared-card:task-2:thumbnail-image")).toBeNull();
  });

  it("toggles the title inline without triggering the row press when the title text is pressed", () => {
    const onPress = jest.fn();
    const screen = render(
      <ActivityStyleRowCard
        testID="shared-card:task-expand"
        title="A very long task title that should expand inline when pressed from inside the row card"
        subtitle="North Tower"
        metaLabel="Jul 8 at 9:15 AM"
        badgeLabel="Review"
        imageUri={undefined}
        onPress={onPress}
      />,
    );

    const title = screen.getByTestId("shared-card:task-expand:title");

    expect(title.props.numberOfLines).toBe(2);

    fireEvent.press(title);

    expect(screen.getByTestId("shared-card:task-expand:title").props.numberOfLines).toBeUndefined();
    expect(onPress).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("shared-card:task-expand:title"));

    expect(screen.getByTestId("shared-card:task-expand:title").props.numberOfLines).toBe(2);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("renders a labeled floating top-left badge when provided", () => {
    const screen = render(
      <ActivityStyleRowCard
        testID="shared-card:task-overdue"
        title="Overdue inspection"
        subtitle="North Tower"
        metaLabel="Due: 2026-07-01"
        badgeLabel="Review"
        imageUri={undefined}
        badgeVariant="pill"
        topLeftMarker={
          <View
            testID="shared-card:task-overdue:overdue-badge"
            className="rounded-full bg-red-500 px-2.5 py-1"
          >
            <Text className="text-xs font-semibold text-white">Overdue</Text>
          </View>
        }
      />,
    );

    expect(screen.getByTestId("shared-card:task-overdue:top-left-marker")).toBeTruthy();
    expect(screen.getByTestId("shared-card:task-overdue:overdue-badge")).toBeTruthy();
    expect(screen.getByText("Overdue")).toBeTruthy();
    expect(screen.getByTestId("shared-card:task-overdue:badge-pill")).toBeTruthy();
  });

  it("does not render the top-left marker when none is provided", () => {
    const screen = render(
      <ActivityStyleRowCard
        testID="shared-card:task-4"
        title="Concrete inspection"
        subtitle="North Tower"
        metaLabel="Modified: 2026-07-12"
        badgeLabel="Review"
        imageUri={undefined}
        onPress={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("shared-card:task-4:top-left-marker")).toBeNull();
  });
});
