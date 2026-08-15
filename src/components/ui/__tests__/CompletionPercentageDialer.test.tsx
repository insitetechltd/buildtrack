import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import CompletionPercentageDialer from "../CompletionPercentageDialer";

describe("CompletionPercentageDialer", () => {
  it("steps by 5 percent and clamps at 0 and 100", () => {
    const onChange = jest.fn();
    const screen = render(
      <CompletionPercentageDialer value={25} onChange={onChange} previousPercentage={10} />,
    );

    expect(screen.getByTestId("update-progress__completion-value").props.children).toEqual([
      25,
      "%",
    ]);
    fireEvent.press(screen.getByTestId("update-progress__completion-plus"));
    expect(onChange).toHaveBeenCalledWith(30);
    fireEvent.press(screen.getByTestId("update-progress__completion-minus"));
    expect(onChange).toHaveBeenCalledWith(20);
    fireEvent.press(screen.getByTestId("update-progress__completion-preset-100"));
    expect(onChange).toHaveBeenCalledWith(100);
  });
});
