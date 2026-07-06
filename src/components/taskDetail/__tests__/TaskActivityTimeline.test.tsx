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
  it("renders rail metadata in the order date, user, progress, then status", () => {
    const screen = render(
      <TaskActivityTimeline
        thread={[
          {
            id: "activity-1",
            actorLabel: "Tristan",
            eventLabel: "Waiting on supplier confirmation.",
            timestampLabel: "Jul 5, 09:30",
            progressLabel: "40%",
            statusLabel: "In Progress",
            photoUrls: [],
            density: "standard",
            structuralState: "ready",
          },
        ]}
      />,
    );

    expect(screen.getByText("Work thread")).toBeTruthy();
    expect(screen.getByText("Waiting on supplier confirmation.")).toBeTruthy();

    const metadata = screen.getByTestId("task-activity-timeline__rail-metadata-activity-1");
    const metadataValues = getRailMetadataValues(metadata);

    expect(metadataValues).toEqual(["Jul 5, 09:30", "Tristan", "40%", "In Progress"]);
    expect(screen.queryByTestId("task-activity-timeline__detail-label")).toBeNull();
  });

  it("renders subtask updates as normal thread entries with lightweight subtask context", () => {
    const screen = render(
      <TaskActivityTimeline
        thread={[
          {
            id: "activity-2",
            actorLabel: "Tristan",
            eventLabel: "Marked 40% complete",
            timestampLabel: "Jul 5, 09:30",
            progressLabel: "40%",
            detailLabel: "Ceiling grid installed.",
            photoUrls: [],
            subtaskBadgeLabel: "Subtask",
            subtaskTitleLabel: "Install ceiling grid",
            density: "standard",
            structuralState: "ready",
          },
        ]}
      />,
    );

    expect(screen.getByText("Subtask")).toBeTruthy();
    expect(screen.getByText("Install ceiling grid")).toBeTruthy();
    expect(getRailMetadataValues(screen.getByTestId("task-activity-timeline__rail-metadata-activity-2"))).toEqual([
      "Jul 5, 09:30",
      "Tristan",
      "40%",
    ]);
  });

  it("shows the lead photo at full usable card width with contain fit behavior", () => {
    const screen = render(
      <TaskActivityTimeline
        thread={[
          {
            id: "activity-2",
            actorLabel: "Tristan",
            eventLabel: "Marked 40% complete",
            timestampLabel: "Jul 5, 09:30",
            progressLabel: "40%",
            detailLabel: "Ceiling grid installed.",
            photoUrls: [
              "https://example.com/photo-1.jpg",
              "https://example.com/photo-2.jpg",
            ],
            subtaskBadgeLabel: "Subtask",
            subtaskTitleLabel: "Install ceiling grid",
            density: "standard",
            structuralState: "ready",
          },
        ]}
      />,
    );

    expect(screen.getByText("Subtask")).toBeTruthy();
    expect(screen.getByText("Install ceiling grid")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__lead-photo-activity-2").props.resizeMode).toBe(
      "contain",
    );
    expect(
      screen.getByTestId("task-activity-timeline__lead-photo-shell-activity-2").props.className,
    ).toContain("-mx-4");
    expect(screen.getByTestId("task-activity-timeline__thumb-photo-activity-2-1")).toBeTruthy();
  });

  it("opens the full-screen photo viewer on the selected image and supports next/previous photo navigation within the same entry", () => {
    const screen = render(
      <TaskActivityTimeline
        thread={[
          {
            id: "activity-2",
            actorLabel: "Tristan",
            eventLabel: "Marked 40% complete",
            timestampLabel: "Jul 5, 09:30",
            progressLabel: "40%",
            detailLabel: "Ceiling grid installed.",
            photoUrls: [
              "https://example.com/photo-1.jpg",
              "https://example.com/photo-2.jpg",
            ],
            subtaskBadgeLabel: "Subtask",
            subtaskTitleLabel: "Install ceiling grid",
            density: "standard",
            structuralState: "ready",
          },
        ]}
      />,
    );

    fireEvent.press(screen.getByTestId("task-activity-timeline__thumb-photo-pressable-activity-2-1"));

    expect(screen.getByTestId("task-activity-timeline__photo_viewer")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__photo_viewer_image").props.source).toEqual({
      uri: "https://example.com/photo-2.jpg",
    });

    fireEvent.press(screen.getByTestId("task-activity-timeline__photo_viewer_previous"));

    expect(screen.getByTestId("task-activity-timeline__photo_viewer_image").props.source).toEqual({
      uri: "https://example.com/photo-1.jpg",
    });

    fireEvent.press(screen.getByTestId("task-activity-timeline__photo_viewer_next"));

    expect(screen.getByTestId("task-activity-timeline__photo_viewer_image").props.source).toEqual({
      uri: "https://example.com/photo-2.jpg",
    });
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

    expect(screen.getByText("Submitted for review")).toBeTruthy();
    expect(screen.getByText("Accepted the task")).toBeTruthy();
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
