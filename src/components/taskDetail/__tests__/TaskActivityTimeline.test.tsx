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
  it("renders two metadata lines with actor and status above timestamp and progress", () => {
    const screen = render(
      <TaskActivityTimeline
        thread={[
          {
            id: "activity-1",
            actorLabel: "Herman",
            eventLabel: "Ceiling grid installed",
            timestampLabel: "Jul 11, 2026 4:12 PM",
            progressLabel: "40%",
            statusLabel: "Doing",
            photoUrls: [
              "https://example.com/photo-1.jpg",
            ],
            density: "standard",
            structuralState: "ready",
          },
        ]}
      />,
    );

    expect(screen.getByTestId("task-activity-timeline__metadata_line_1-activity-1")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__metadata_line_2-activity-1")).toBeTruthy();
    expect(screen.getByText("Herman")).toBeTruthy();
    expect(screen.getByText("Doing")).toBeTruthy();
    expect(screen.getByText("Jul 11, 2026 4:12 PM")).toBeTruthy();
    expect(screen.getByText("40% complete")).toBeTruthy();
  });

  it("renders the event headline above a full-width swipe surface without any photo-count caption", () => {
    const screen = render(
      <TaskActivityTimeline
        thread={[
          {
            id: "activity-1",
            actorLabel: "Herman",
            eventLabel: "Ceiling grid installed",
            timestampLabel: "Jul 11, 2026 4:12 PM",
            progressLabel: "40%",
            statusLabel: "Doing",
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

    expect(screen.getByTestId("task-activity-timeline__description-activity-1")).toBeTruthy();
    expect(screen.getByText("Ceiling grid installed")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__photo_swipe_surface-activity-1")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__gallery_pager-activity-1")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__photo_stack-activity-1")).toBeTruthy();
    expect(screen.queryByTestId("task-activity-timeline__photo_caption-activity-1")).toBeNull();
    expect(screen.queryByText("Added 3 photos")).toBeNull();
    expect(screen.queryByTestId("task-activity-timeline__gallery_previous-activity-1")).toBeNull();
    expect(screen.queryByTestId("task-activity-timeline__gallery_next-activity-1")).toBeNull();
  });

  it("shows the lead photo below the headline in a square shell with cover fit while keeping the modal viewer unchanged", async () => {
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
    expect(screen.getByTestId("task-activity-timeline__lead-photo-activity-2").props.contentFit).toBe(
      "cover",
    );
    expect(screen.getByTestId("task-activity-timeline__lead-photo-shell-activity-2").props.className).toContain(
      "rounded-2xl",
    );
    expect(screen.getByTestId("task-activity-timeline__photo_stack-activity-2")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__lead-photo-activity-2").props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }),
      ]),
    );
    await waitFor(() => {
      expect(screen.getByTestId("task-activity-timeline__lead-photo-shell-activity-2").props.style).toMatchObject({
        aspectRatio: 1,
      });
    });
    expect(screen.queryByTestId("task-activity-timeline__photo_caption-activity-2")).toBeNull();
    expect(screen.queryByText("Added 2 photos")).toBeNull();
    expect(screen.getByTestId("task-activity-timeline__photo_swipe_surface-activity-2")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__gallery_pager-activity-2")).toBeTruthy();
    expect(screen.queryByTestId("task-activity-timeline__gallery_previous-activity-2")).toBeNull();
    expect(screen.queryByTestId("task-activity-timeline__gallery_next-activity-2")).toBeNull();
    expect(
      getDirectChildTestIds(screen.getByTestId("task-activity-timeline__lead-photo-shell-activity-2")),
    ).toEqual(["task-activity-timeline__photo_swipe_surface-activity-2"]);

    fireEvent.press(screen.getByTestId("task-activity-timeline__lead-photo-pressable-activity-2"));

    expect(screen.getByTestId("task-activity-timeline__photo_viewer_image").props.contentFit).toBe(
      "contain",
    );
  });

  it("updates the in-entry gallery from swipe gestures and opens the full-screen viewer on the selected photo", () => {
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

    fireEvent(screen.getByTestId("task-activity-timeline__photo_swipe_surface-activity-2"), "momentumScrollEnd", {
      nativeEvent: {
        contentOffset: { x: 320, y: 0 },
        layoutMeasurement: { width: 320, height: 240 },
      },
    });

    expect(screen.getByTestId("task-activity-timeline__lead-photo-activity-2").props.source).toEqual({
      uri: "https://example.com/photo-2.jpg",
      cacheKey: "https://example.com/photo-2.jpg",
    });
    expect(screen.getByTestId("task-activity-timeline__gallery_pager-activity-2")).toBeTruthy();

    fireEvent(screen.getByTestId("task-activity-timeline__photo_swipe_surface-activity-2"), "momentumScrollEnd", {
      nativeEvent: {
        contentOffset: { x: 640, y: 0 },
        layoutMeasurement: { width: 320, height: 240 },
      },
    });

    expect(screen.getByTestId("task-activity-timeline__lead-photo-activity-2").props.source).toEqual({
      uri: "https://example.com/photo-3.jpg",
      cacheKey: "https://example.com/photo-3.jpg",
    });

    fireEvent.press(screen.getByTestId("task-activity-timeline__lead-photo-pressable-activity-2"));

    expect(screen.getByTestId("task-activity-timeline__photo_viewer")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__photo_viewer_image").props.source).toEqual({
      uri: "https://example.com/photo-3.jpg",
      cacheKey: "https://example.com/photo-3.jpg",
    });
    expect(screen.getByText("3 / 3")).toBeTruthy();

    fireEvent.press(screen.getByTestId("task-activity-timeline__photo_viewer_previous"));

    expect(screen.getByTestId("task-activity-timeline__photo_viewer_image").props.source).toEqual({
      uri: "https://example.com/photo-2.jpg",
      cacheKey: "https://example.com/photo-2.jpg",
    });
    expect(screen.getByText("2 / 3")).toBeTruthy();
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
    expect(screen.getByTestId("task-activity-timeline__metadata_line_1-activity-newer")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__metadata_line_1-activity-older")).toBeTruthy();
    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.getByText("Sam")).toBeTruthy();
    expect(screen.getByText("100% complete")).toBeTruthy();
    expect(screen.getByText("10% complete")).toBeTruthy();
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

  it("hides em-dash progress labels on report-style activity rows", () => {
    const screen = render(
      <TaskActivityTimeline
        thread={[
          {
            id: "activity-report",
            density: "standard",
            structuralState: "stale",
            actorLabel: "John",
            eventLabel: "Issue reported by John",
            timestampLabel: "Sep 4, 2026 at 10:31PM",
            progressLabel: "—",
            photoUrls: ["https://example.com/report.jpg"],
            statusLabel: "Reported",
          },
        ]}
      />,
    );

    expect(screen.getByText("Issue reported by John")).toBeTruthy();
    expect(screen.queryByText("— complete")).toBeNull();
    expect(screen.queryByText("0% complete")).toBeNull();
    expect(screen.getByTestId("task-activity-timeline__lead-photo-activity-report")).toBeTruthy();
  });
});
