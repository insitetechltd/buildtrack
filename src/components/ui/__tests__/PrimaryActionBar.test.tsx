import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import PrimaryActionBar from "../PrimaryActionBar";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 12, left: 0, right: 0 }),
}));

describe("PrimaryActionBar", () => {
  it("renders the primary action and optional secondary action", () => {
    const onPrimaryPress = jest.fn();
    const onSecondaryPress = jest.fn();
    const screen = render(
      <PrimaryActionBar
        primaryLabel="Create Task"
        onPrimaryPress={onPrimaryPress}
        secondaryLabel="Back to Dashboard"
        onSecondaryPress={onSecondaryPress}
      />,
    );

    fireEvent.press(screen.getByText("Create Task"));
    fireEvent.press(screen.getByText("Back to Dashboard"));

    expect(onPrimaryPress).toHaveBeenCalledTimes(1);
    expect(onSecondaryPress).toHaveBeenCalledTimes(1);
  });
});
