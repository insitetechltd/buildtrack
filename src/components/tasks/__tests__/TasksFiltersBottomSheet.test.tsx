import React from "react";
import { Text, View } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import TasksFiltersBottomSheet from "../TasksFiltersBottomSheet";

jest.mock("react-native-modal", () => {
  const React = require("react");
  const { View } = require("react-native");

  return function MockModal({ children, isVisible }: any) {
    if (!isVisible) {
      return null;
    }

    return <View testID="mock-modal">{children}</View>;
  };
});

jest.mock("@/components/ModalHandle", () => {
  const React = require("react");
  const { View } = require("react-native");

  return function MockModalHandle() {
    return <View testID="modal-handle" />;
  };
});

describe("TasksFiltersBottomSheet", () => {
  it("renders queue, status, and overdue window sections with reset and apply actions", () => {
    const screen = render(
      <TasksFiltersBottomSheet
        visible={true}
        stagedQueue="inbox"
        stagedStatus="overdue"
        stagedOverdueWindow="one_week"
        onClose={jest.fn()}
        onResetAll={jest.fn()}
        onApply={jest.fn()}
        onStageQueue={jest.fn()}
        onStageStatus={jest.fn()}
        onStageOverdueWindow={jest.fn()}
      />,
    );

    expect(screen.getByText("Filters")).toBeTruthy();
    expect(screen.getByText("QUEUE")).toBeTruthy();
    expect(screen.getByText("Inbox")).toBeTruthy();
    expect(screen.getByText("Outbox")).toBeTruthy();
    expect(screen.getByText("Archived")).toBeTruthy();
    expect(screen.getByText("STATUS")).toBeTruthy();
    expect(screen.getByText("Overdue")).toBeTruthy();
    expect(screen.getByText("OVERDUE WINDOW")).toBeTruthy();
    expect(screen.getByText("3 active")).toBeTruthy();
    expect(screen.getByText("1 week")).toBeTruthy();
    expect(screen.getByText("1 month")).toBeTruthy();
    expect(screen.getByText("Apply Filters")).toBeTruthy();
    expect(screen.getByText("Reset all")).toBeTruthy();
    expect(screen.getByText("OVERDUE WINDOW").props.className).toContain("font-mono");
  });

  it("uses navy queue selection styling and distinct active status colors", () => {
    const { rerender, getByTestId } = render(
      <TasksFiltersBottomSheet
        visible={true}
        stagedQueue="inbox"
        stagedStatus="any_status"
        stagedOverdueWindow="show_all"
        onClose={jest.fn()}
        onResetAll={jest.fn()}
        onApply={jest.fn()}
        onStageQueue={jest.fn()}
        onStageStatus={jest.fn()}
        onStageOverdueWindow={jest.fn()}
      />,
    );

    expect(getByTestId("tasks-filters-sheet__queue_inbox").props.className).toContain("bg-[#07111E]");
    expect(getByTestId("tasks-filters-sheet__status_any_status").props.className).toContain("bg-[#07111E]");

    rerender(
      <TasksFiltersBottomSheet
        visible={true}
        stagedQueue="all_queues"
        stagedStatus="new"
        stagedOverdueWindow="show_all"
        onClose={jest.fn()}
        onResetAll={jest.fn()}
        onApply={jest.fn()}
        onStageQueue={jest.fn()}
        onStageStatus={jest.fn()}
        onStageOverdueWindow={jest.fn()}
      />,
    );
    expect(getByTestId("tasks-filters-sheet__status_new").props.className).toContain("bg-[#EFF6FF]");

    rerender(
      <TasksFiltersBottomSheet
        visible={true}
        stagedQueue="all_queues"
        stagedStatus="doing"
        stagedOverdueWindow="show_all"
        onClose={jest.fn()}
        onResetAll={jest.fn()}
        onApply={jest.fn()}
        onStageQueue={jest.fn()}
        onStageStatus={jest.fn()}
        onStageOverdueWindow={jest.fn()}
      />,
    );
    expect(getByTestId("tasks-filters-sheet__status_doing").props.className).toContain("bg-[#FFF7ED]");

    rerender(
      <TasksFiltersBottomSheet
        visible={true}
        stagedQueue="all_queues"
        stagedStatus="review"
        stagedOverdueWindow="show_all"
        onClose={jest.fn()}
        onResetAll={jest.fn()}
        onApply={jest.fn()}
        onStageQueue={jest.fn()}
        onStageStatus={jest.fn()}
        onStageOverdueWindow={jest.fn()}
      />,
    );
    expect(getByTestId("tasks-filters-sheet__status_review").props.className).toContain("bg-[#FAF5FF]");

    rerender(
      <TasksFiltersBottomSheet
        visible={true}
        stagedQueue="all_queues"
        stagedStatus="overdue"
        stagedOverdueWindow="show_all"
        onClose={jest.fn()}
        onResetAll={jest.fn()}
        onApply={jest.fn()}
        onStageQueue={jest.fn()}
        onStageStatus={jest.fn()}
        onStageOverdueWindow={jest.fn()}
      />,
    );
    expect(getByTestId("tasks-filters-sheet__status_overdue").props.className).toContain("bg-[#FEF2F2]");
  });

  it("stages queue, status, and overdue selections before applying", () => {
    const onStageQueue = jest.fn();
    const onStageStatus = jest.fn();
    const onStageOverdueWindow = jest.fn();
    const onApply = jest.fn();
    const onResetAll = jest.fn();
    const onClose = jest.fn();

    const screen = render(
      <TasksFiltersBottomSheet
        visible={true}
        stagedQueue="all_queues"
        stagedStatus="any_status"
        stagedOverdueWindow="show_all"
        onClose={onClose}
        onResetAll={onResetAll}
        onApply={onApply}
        onStageQueue={onStageQueue}
        onStageStatus={onStageStatus}
        onStageOverdueWindow={onStageOverdueWindow}
      />,
    );

    fireEvent.press(screen.getByTestId("tasks-filters-sheet__queue_outbox"));
    fireEvent.press(screen.getByTestId("tasks-filters-sheet__status_review"));
    fireEvent.press(screen.getByTestId("tasks-filters-sheet__overdue_window_three_active"));
    fireEvent.press(screen.getByTestId("tasks-filters-sheet__overdue_window_one_week"));
    fireEvent.press(screen.getByTestId("tasks-filters-sheet__reset"));
    fireEvent.press(screen.getByTestId("tasks-filters-sheet__apply"));
    fireEvent.press(screen.getByTestId("tasks-filters-sheet__close"));

    expect(onStageQueue).toHaveBeenCalledWith("outbox");
    expect(onStageStatus).toHaveBeenCalledWith("review");
    expect(onStageOverdueWindow).toHaveBeenCalledWith("three_active");
    expect(onStageOverdueWindow).toHaveBeenCalledWith("one_week");
    expect(onResetAll).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
