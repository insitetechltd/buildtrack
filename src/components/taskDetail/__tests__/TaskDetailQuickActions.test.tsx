import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import TaskDetailQuickActions from "../TaskDetailQuickActions";

describe("TaskDetailQuickActions", () => {
  it("renders the contextual quick actions row with pre-acceptance labels", () => {
    const screen = render(
      <TaskDetailQuickActions
        model={{
          id: "task-quick-actions",
          density: "standard",
          structuralState: "ready",
          actions: [
            {
              id: "action-accept",
              actionId: "accept_task",
              label: "Accept",
              isDisabled: false,
              density: "standard",
              structuralState: "ready",
            },
            {
              id: "action-decline",
              actionId: "decline_task",
              label: "Decline",
              isDisabled: false,
              density: "standard",
              structuralState: "ready",
            },
          ],
        }}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByTestId("task-detail__quick-actions")).toBeTruthy();
    expect(screen.getByText("Quick Actions")).toBeTruthy();
    expect(screen.getByText("Accept")).toBeTruthy();
    expect(screen.getByText("Decline")).toBeTruthy();
  });

  it("calls onPress with the tapped action id", () => {
    const onPress = jest.fn();
    const screen = render(
      <TaskDetailQuickActions
        model={{
          id: "task-quick-actions",
          density: "standard",
          structuralState: "ready",
          actions: [
            {
              id: "action-accept",
              actionId: "accept_task",
              label: "Accept",
              isDisabled: false,
              density: "standard",
              structuralState: "ready",
            },
          ],
        }}
        onPress={onPress}
      />,
    );

    fireEvent.press(screen.getByTestId("task-detail__quick-action-accept_task"));

    expect(onPress).toHaveBeenCalledWith("accept_task");
  });
});
