import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import TaskActivityTimeline from "../TaskActivityTimeline";

const threadRows = [
  {
    id: "activity-newer",
    actorLabel: "Alex",
    eventLabel: "Submitted for review",
    timestampLabel: "Jul 5, 10:00",
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
    detailLabel: "Started site setup",
    photoUrls: [],
    density: "standard" as const,
    structuralState: "ready" as const,
  },
];

describe("TaskActivityTimeline", () => {
  it("renders work-thread rows with clear event, actor, timestamp, and detail text", () => {
    const screen = render(
      <TaskActivityTimeline
        thread={[
          {
            id: "activity-1",
            actorLabel: "Tristan",
            eventLabel: "Submitted task for review",
            timestampLabel: "Jul 5, 09:30",
            detailLabel: "Marked 100% complete",
            photoUrls: ["https://example.com/photo-1.jpg"],
            density: "standard",
            structuralState: "ready",
          },
        ]}
      />,
    );

    expect(screen.getByText("Work thread")).toBeTruthy();
    expect(screen.getByText("Submitted task for review")).toBeTruthy();
    expect(screen.getByText("Tristan")).toBeTruthy();
    expect(screen.getByText("Jul 5, 09:30")).toBeTruthy();
    expect(screen.getByText("Marked 100% complete")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__event-label")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__actor-label")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__timestamp")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__detail-label")).toBeTruthy();
  });

  it("renders photo evidence rows when thread photos are present", () => {
    const screen = render(
      <TaskActivityTimeline
        thread={[
          {
            id: "activity-1",
            actorLabel: "Tristan",
            eventLabel: "Submitted task for review",
            timestampLabel: "Jul 5, 09:30",
            photoUrls: ["https://example.com/photo-1.jpg", "https://example.com/photo-2.jpg"],
            density: "standard",
            structuralState: "ready",
          },
        ]}
      />,
    );

    expect(screen.getByTestId("task-activity-timeline__photo-evidence")).toBeTruthy();
    expect(screen.getByText("Photo evidence")).toBeTruthy();
    expect(screen.getByText("2 photos")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__photo-activity-1-0")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__photo-activity-1-1")).toBeTruthy();
  });

  it("keeps legacy activities compatible and sorts them newest first", () => {
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
            photos: [],
          },
        ]}
      />,
    );

    const eventLabels = screen.getAllByTestId("task-activity-timeline__event-label");
    const actorLabels = screen.getAllByTestId("task-activity-timeline__actor-label");

    expect(eventLabels[0].props.children).toBe("Submitted for review");
    expect(eventLabels[1].props.children).toBe("Accepted the task");
    expect(actorLabels[0].props.children).toBe("Alex");
    expect(actorLabels[1].props.children).toBe("Sam");
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
