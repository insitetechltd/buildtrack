import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import TaskActivityTimeline from "../TaskActivityTimeline";

function getRailMetadataValues(node: { props: { children: React.ReactNode } }) {
  return React.Children.toArray(node.props.children).map((child) =>
    React.isValidElement<{ children?: React.ReactNode }>(child) ? child.props.children : child,
  );
}

const threadRows = [
  {
    id: "activity-newer",
    actorLabel: "Alex",
    eventLabel: "Submitted for review",
    timestampLabel: "Jul 5, 10:00",
    progressLabel: "100%",
    detailLabel: "Marked 100% complete",
    photoUrls: [],
    density: "standard" as const,
    structuralState: "ready" as const,
  },
  {
    id: "activity-older",
    actorLabel: "Sam",
    eventLabel: "Accepted the task",
    timestampLabel: "Jul 4, 08:00",
    progressLabel: "10%",
    detailLabel: "Started site setup",
    photoUrls: [],
    density: "standard" as const,
    structuralState: "ready" as const,
  },
];

describe("TaskActivityTimeline", () => {
  it("renders rail metadata in the order date, user, then progress", () => {
    const screen = render(
      <TaskActivityTimeline
        thread={[
          {
            id: "activity-1",
            actorLabel: "Tristan",
            eventLabel: "Updated progress to 40%",
            timestampLabel: "Jul 5, 09:30",
            progressLabel: "40%",
            detailLabel: "Waiting on supplier confirmation.",
            photoUrls: [],
            density: "standard",
            structuralState: "ready",
          },
        ]}
      />,
    );

    expect(screen.getByText("Work thread")).toBeTruthy();
    expect(screen.queryByTestId("task-activity-timeline__event-label")).toBeNull();

    const metadata = screen.getByTestId("task-activity-timeline__rail-metadata-activity-1");
    const metadataValues = getRailMetadataValues(metadata);

    expect(metadataValues).toEqual(["Jul 5, 09:30", "Tristan", "40%"]);
    expect(screen.getByTestId("task-activity-timeline__detail-label")).toBeTruthy();
    expect(screen.getByText("Waiting on supplier confirmation.")).toBeTruthy();
  });

  it("renders one large lead photo plus a compact thumbnail strip for remaining photos", () => {
    const screen = render(
      <TaskActivityTimeline
        thread={[
          {
            id: "activity-1",
            actorLabel: "Tristan",
            eventLabel: "Updated progress to 40%",
            timestampLabel: "Jul 5, 09:30",
            progressLabel: "40%",
            detailLabel: "Waiting on supplier confirmation.",
            photoUrls: [
              "https://example.com/photo-1.jpg",
              "https://example.com/photo-2.jpg",
              "https://example.com/photo-3.jpg",
            ],
            density: "standard",
            structuralState: "ready",
          },
        ]}
      />,
    );

    expect(screen.getByTestId("task-activity-timeline__lead-photo-activity-1")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__thumb-photo-activity-1-1")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__thumb-photo-activity-1-2")).toBeTruthy();
    expect(screen.queryByTestId("task-activity-timeline__photo-evidence")).toBeNull();
    expect(screen.queryByText("Photo evidence")).toBeNull();
  });

  it("keeps legacy activities compatible, sorts them newest first, and derives progress labels", () => {
    const screen = render(
      <TaskActivityTimeline
        activities={[
          {
            id: "activity-older",
            userId: "user-1",
            userName: "Sam",
            timestamp: "2026-07-02T09:00:00.000Z",
            description: "Accepted the task",
            activityType: "status_change",
            density: "standard",
            structuralState: "stale",
            accessibilityLabel: "Accepted the task",
            isEmpty: false,
            isLoading: false,
            isStale: true,
            isDisabled: false,
            completionPercentage: 10,
            photos: [],
          },
          {
            id: "activity-newer",
            userId: "user-2",
            userName: "Alex",
            timestamp: "2026-07-02T10:00:00.000Z",
            description: "Submitted for review",
            activityType: "status_change",
            density: "standard",
            structuralState: "stale",
            accessibilityLabel: "Submitted for review",
            isEmpty: false,
            isLoading: false,
            isStale: true,
            isDisabled: false,
            completionPercentage: 100,
            photos: [],
          },
        ]}
      />,
    );

    const newerMetadata = screen.getByTestId("task-activity-timeline__rail-metadata-activity-newer");
    const olderMetadata = screen.getByTestId("task-activity-timeline__rail-metadata-activity-older");

    expect(screen.queryByTestId("task-activity-timeline__event-label")).toBeNull();
    expect(getRailMetadataValues(newerMetadata)).toEqual([
      expect.stringMatching(/2026/),
      "Alex",
      "100%",
    ]);
    expect(getRailMetadataValues(olderMetadata)).toEqual([
      expect.stringMatching(/2026/),
      "Sam",
      "10%",
    ]);
  });

  it("renders entry rows with stable testIDs", () => {
    const screen = render(<TaskActivityTimeline thread={threadRows} activeEntryId="activity-newer" />);

    expect(screen.getByTestId("task-activity-timeline__entry-activity-newer")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__entry-activity-older")).toBeTruthy();
  });

  it("marks the active row selected when activeEntryId changes", () => {
    const screen = render(<TaskActivityTimeline thread={threadRows} activeEntryId="activity-newer" />);

    expect(
      screen.getByTestId("task-activity-timeline__entry-activity-newer").props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      screen.getByTestId("task-activity-timeline__entry-activity-older").props.accessibilityState,
    ).toMatchObject({ selected: false });

    screen.rerender(<TaskActivityTimeline thread={threadRows} activeEntryId="activity-older" />);

    expect(
      screen.getByTestId("task-activity-timeline__entry-activity-newer").props.accessibilityState,
    ).toMatchObject({ selected: false });
    expect(
      screen.getByTestId("task-activity-timeline__entry-activity-older").props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it("reports measured row layout upward when an entry lays out", () => {
    const onEntryLayout = jest.fn();
    const onVisibleEntryChange = jest.fn();
    const screen = render(
      <TaskActivityTimeline
        thread={threadRows}
        activeEntryId="activity-newer"
        onVisibleEntryChange={onVisibleEntryChange}
        onEntryLayout={onEntryLayout}
      />,
    );

    fireEvent(screen.getByTestId("task-activity-timeline__entry-activity-newer"), "layout", {
      nativeEvent: {
        layout: {
          x: 0,
          y: 24,
          width: 320,
          height: 92,
        },
      },
    });

    expect(onVisibleEntryChange).toHaveBeenCalledWith("activity-newer");
    expect(onEntryLayout).toHaveBeenCalledWith("activity-newer", 24, 92);
  });
});
