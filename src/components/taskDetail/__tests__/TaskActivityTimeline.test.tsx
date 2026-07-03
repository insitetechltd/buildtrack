import React from "react";
import { render } from "@testing-library/react-native";

import TaskActivityTimeline from "../TaskActivityTimeline";

describe("TaskActivityTimeline", () => {
  it("renders the activity title, newest-first affordance, and newest activity first", () => {
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

    expect(screen.getByText("Activity")).toBeTruthy();
    expect(screen.getByText("Newest first")).toBeTruthy();

    const descriptions = screen.getAllByTestId("task-activity-timeline__description");
    expect(descriptions[0].props.children).toBe("Submitted for review");
    expect(descriptions[1].props.children).toBe("Accepted the task");
  });
});
