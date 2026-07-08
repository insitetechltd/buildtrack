import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import TaskActivityTimeline from "../TaskActivityTimeline";

function getDirectChildTestIds(node: { props: { children: React.ReactNode } }) {
  return React.Children.toArray(node.props.children)
    .map((child) =>
      React.isValidElement<{ testID?: string }>(child) ? child.props.testID : undefined,
    )
    .filter(Boolean);
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
  const getSizeSpy = jest.spyOn(require("react-native").Image, "getSize");

  beforeEach(() => {
    getSizeSpy.mockImplementation((_uri: string, onSuccess: (width: number, height: number) => void) => {
      onSuccess(1200, 900);
    });
  });

  afterAll(() => {
    getSizeSpy.mockRestore();
  });

  it("renders the actor and timestamp in a top metadata row above the dominant event photo", () => {
    const screen = render(
      <TaskActivityTimeline
        thread={[
          {
            id: "activity-1",
            actorLabel: "Jake M.",
            eventLabel: "Initial site condition — grid B marked off, awaiting structural sign-off.",
            timestampLabel: "Jul 1, 10:24 AM",
            progressLabel: "0%",
            photoUrls: [
              "https://example.com/photo-1.jpg",
              "https://example.com/photo-2.jpg",
            ],
            density: "standard",
            structuralState: "ready",
          },
        ]}
      />,
    );

    expect(screen.getByTestId("task-activity-timeline__entry-header-activity-1")).toBeTruthy();
    expect(screen.getByText("Jake M.")).toBeTruthy();
    expect(screen.getByText("Jul 1, 10:24 AM")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__lead-photo-shell-activity-1")).toBeTruthy();
  });

  it("places the event description below the dominant photo area", () => {
    const screen = render(
      <TaskActivityTimeline
        thread={[
          {
            id: "activity-1",
            actorLabel: "Jake M.",
            eventLabel: "Initial site condition — grid B marked off, awaiting structural sign-off.",
            timestampLabel: "Jul 1, 10:24 AM",
            progressLabel: "0%",
            photoUrls: ["https://example.com/photo-1.jpg"],
            density: "standard",
            structuralState: "ready",
          },
        ]}
      />,
    );

    expect(screen.getByTestId("task-activity-timeline__description-activity-1")).toBeTruthy();
  });

  it("shows the lead photo in an aspect-ratio-aware shell at full usable card width with contain fit behavior", async () => {
    getSizeSpy.mockImplementation((_uri: string, onSuccess: (width: number, height: number) => void) => {
      onSuccess(900, 1200);
    });

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
            photoAspectRatio: 0.75,
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
    expect(screen.getByTestId("task-activity-timeline__lead-photo-shell-activity-2").props.className).toContain(
      "-mx-4",
    );
    expect(screen.getByTestId("task-activity-timeline__lead-photo-activity-2").props.className).not.toContain(
      "h-44",
    );
    await waitFor(() => {
      expect(screen.getByTestId("task-activity-timeline__lead-photo-shell-activity-2").props.style).toMatchObject({
        aspectRatio: 0.75,
      });
    });
    expect(screen.getByTestId("task-activity-timeline__thumb-photo-activity-2-1")).toBeTruthy();
    expect(
      getDirectChildTestIds(screen.getByTestId("task-activity-timeline__lead-photo-shell-activity-2")),
    ).toEqual(["task-activity-timeline__lead-photo-pressable-activity-2"]);
  });

  it("opens the full-screen photo viewer on the selected image, keeps navigation within the same entry, and shows the gallery index", () => {
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
              "https://example.com/photo-3.jpg",
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
    expect(screen.getByText("2 / 3")).toBeTruthy();

    fireEvent.press(screen.getByTestId("task-activity-timeline__photo_viewer_previous"));

    expect(screen.getByTestId("task-activity-timeline__photo_viewer_image").props.source).toEqual({
      uri: "https://example.com/photo-1.jpg",
    });
    expect(screen.getByText("1 / 3")).toBeTruthy();

    fireEvent.press(screen.getByTestId("task-activity-timeline__photo_viewer_next"));

    expect(screen.getByTestId("task-activity-timeline__photo_viewer_image").props.source).toEqual({
      uri: "https://example.com/photo-2.jpg",
    });
    expect(screen.getByText("2 / 3")).toBeTruthy();

    fireEvent.press(screen.getByTestId("task-activity-timeline__photo_viewer_next"));

    expect(screen.getByTestId("task-activity-timeline__photo_viewer_image").props.source).toEqual({
      uri: "https://example.com/photo-3.jpg",
    });
    expect(screen.getByText("3 / 3")).toBeTruthy();
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

    expect(screen.getByText("Submitted for review")).toBeTruthy();
    expect(screen.getByText("Accepted the task")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__entry-header-activity-newer")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__entry-header-activity-older")).toBeTruthy();
    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.getByText("Sam")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText("10%")).toBeTruthy();
    expect(screen.getAllByText(/2026/).length).toBeGreaterThan(0);
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
