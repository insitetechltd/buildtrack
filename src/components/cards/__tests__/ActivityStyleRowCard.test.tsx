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
    expect(screen.getByTestId("shared-card:task-1:no-photo-icon").props.name).toBe("image-outline");
    expect(screen.getByTestId("shared-card:task-1:thumbnail-placeholder").props.className).toContain(
      "bg-[#E7F4F8]",
    );
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

  it("opens the row action when the title is pressed", () => {
    const onPress = jest.fn();
    const screen = render(
      <ActivityStyleRowCard
        testID="shared-card:task-expand"
        title="Electrical Wiring Phase 1"
        subtitle="North Tower"
        metaLabel="Due this week"
        badgeLabel="Aug 17"
        imageUri={undefined}
        onPress={onPress}
      />,
    );

    fireEvent.press(screen.getByTestId("shared-card:task-expand:title"));

    expect(onPress).toHaveBeenCalledTimes(1);
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

  it("applies critical recipe chrome without a left accent bar", () => {
    const screen = render(
      <ActivityStyleRowCard
        testID="shared-card:critical"
        variant="critical"
        title="Facade inspection"
        subtitle="In Progress · High"
        metaLabel="Due this week"
        badgeLabel="Aug 18"
        imageUri={undefined}
      />,
    );

    expect(screen.getByTestId("shared-card:critical:variant-critical")).toBeTruthy();
    expect(screen.getByTestId("shared-card:critical:badge-pill")).toBeTruthy();
    expect(screen.queryByTestId("shared-card:critical:accent-bar")).toBeNull();
    expect(screen.getByText("Aug 18")).toBeTruthy();
    expect(screen.getByTestId("shared-card:critical:title").props.className).toContain("text-lg");
  });

  it("uses family activity typography on rail without a left accent bar", () => {
    const screen = render(
      <ActivityStyleRowCard
        testID="shared-card:activity"
        variant="activity"
        title="In Progress"
        subtitle="Facade inspection"
        metaLabel="2h ago"
        badgeLabel="In Progress"
        imageUri={undefined}
      />,
    );

    expect(screen.getByTestId("shared-card:activity:variant-activity")).toBeTruthy();
    expect(screen.queryByTestId("shared-card:activity:accent-bar")).toBeNull();
    expect(screen.getByTestId("shared-card:activity:title").props.className).toContain("text-lg");
    expect(screen.getByTestId("shared-card:activity:subtitle").props.className).toContain("text-base");
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

  it("renders compact post layout without a photo placeholder rail", () => {
    const screen = render(
      <ActivityStyleRowCard
        testID="shared-card:compact"
        variant="activity"
        layout="compact"
        title="Task Accepted"
        subtitle="Install corridor lighting"
        actorLabel="Bob Worker"
        metaLabel="Jul 4, 9:12 AM"
        badgeLabel="Accepted"
        badgeVariant="pill"
      />,
    );

    expect(screen.getByTestId("shared-card:compact:layout-compact")).toBeTruthy();
    expect(screen.getByTestId("shared-card:compact:post-header")).toBeTruthy();
    expect(screen.getByTestId("shared-card:compact:hero-actor-label")).toHaveTextContent(
      "Bob Worker",
    );
    expect(screen.queryByTestId("shared-card:compact:thumbnail")).toBeNull();
    expect(screen.queryByTestId("shared-card:compact:thumbnail-placeholder")).toBeNull();
    expect(screen.queryByTestId("shared-card:compact:hero")).toBeNull();
    expect(screen.getByText("Task Accepted")).toBeTruthy();
    expect(screen.getByText("Install corridor lighting")).toBeTruthy();
  });

  it("renders post photo layout with change primary, task secondary, photo below, actor in header", () => {
    const screen = render(
      <ActivityStyleRowCard
        testID="shared-card:hero"
        variant="activity"
        layout="post"
        title="Progress photo added — fixture row B complete"
        subtitle="Install corridor lighting — Level 3"
        actorLabel="Alex Chen"
        metaLabel="Jul 4, 9:40 AM"
        badgeLabel="In Progress"
        badgeVariant="pill"
        imageUri="https://example.com/progress.jpg"
      />,
    );

    expect(screen.getByTestId("shared-card:hero:layout-photo-hero")).toBeTruthy();
    expect(screen.getByTestId("shared-card:hero:post-header")).toBeTruthy();
    expect(screen.getByTestId("shared-card:hero:hero-actor-label")).toHaveTextContent(
      "Alex Chen",
    );
    expect(screen.getByTestId("shared-card:hero:title")).toHaveTextContent(
      "Progress photo added — fixture row B complete",
    );
    expect(screen.getByTestId("shared-card:hero:title").props.className).toContain("text-lg");
    expect(screen.getByTestId("shared-card:hero:subtitle")).toHaveTextContent(
      "Install corridor lighting — Level 3",
    );
    expect(screen.getByTestId("shared-card:hero:hero-image")).toBeTruthy();
    expect(screen.queryByTestId("shared-card:hero:overlay-title")).toBeNull();
    expect(screen.queryByTestId("shared-card:hero:thumbnail-placeholder")).toBeNull();
  });

  it("hides post photo when the hero image errors (text shell remains)", () => {
    const screen = render(
      <ActivityStyleRowCard
        testID="shared-card:hero-fail"
        variant="activity"
        layout="photoHero"
        title="Progress photo added"
        subtitle="Install corridor lighting"
        actorLabel="Alex Chen"
        metaLabel="Jul 4, 9:40 AM"
        badgeLabel="In Progress"
        imageUri="https://example.com/broken.jpg"
      />,
    );

    fireEvent(screen.getByTestId("shared-card:hero-fail:hero-image"), "error");

    expect(screen.getByTestId("shared-card:hero-fail:layout-compact")).toBeTruthy();
    expect(screen.queryByTestId("shared-card:hero-fail:hero")).toBeNull();
    expect(screen.getByText("Progress photo added")).toBeTruthy();
    expect(screen.getByText("Install corridor lighting")).toBeTruthy();
    expect(screen.getByText("Alex Chen")).toBeTruthy();
  });

  it("renders a swipeable multi-photo hero with pager dots", () => {
    const screen = render(
      <ActivityStyleRowCard
        testID="shared-card:multi"
        variant="activity"
        layout="post"
        title="Progress photos added"
        subtitle="Install corridor lighting"
        actorLabel="Alex Chen"
        metaLabel="Jul 4, 9:40 AM"
        imageUris={[
          "https://example.com/progress-1.jpg",
          "https://example.com/progress-2.jpg",
        ]}
      />,
    );

    const hero = screen.getByTestId("shared-card:multi:hero");
    fireEvent(hero, "layout", {
      nativeEvent: { layout: { width: 320, height: 240, x: 0, y: 0 } },
    });

    expect(screen.getByTestId("shared-card:multi:hero-swipe")).toBeTruthy();
    expect(screen.getByTestId("shared-card:multi:hero-pager")).toBeTruthy();
    expect(screen.getByTestId("shared-card:multi:hero-image")).toBeTruthy();
    expect(screen.getByTestId("shared-card:multi:hero-image-1")).toBeTruthy();
  });
});
