import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import ArchiveConfirmSheet from "../ArchiveConfirmSheet";

describe("ArchiveConfirmSheet", () => {
  it("confirms archive through prefixed testIDs", () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();

    const screen = render(
      <ArchiveConfirmSheet
        visible
        testIDPrefix="task-detail"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByTestId("task-detail__archive-confirm")).toBeTruthy();
    expect(screen.getByText("Archive task?")).toBeTruthy();
    expect(screen.getByText("This task will move to the Archived queue.")).toBeTruthy();

    fireEvent.press(screen.getByTestId("task-detail__archive-confirm-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("task-detail__archive-confirm-archive"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
