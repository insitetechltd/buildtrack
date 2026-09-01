import React from "react";
import { Keyboard, Platform } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";

import PrimaryActionBar from "../PrimaryActionBar";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
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

  it("stays in document flow when absolute is false", () => {
    const screen = render(
      <PrimaryActionBar
        testID="action-bar"
        absolute={false}
        primaryLabel="Create Task"
        onPrimaryPress={jest.fn()}
      />,
    );

    expect(screen.getByTestId("action-bar").props.className).not.toContain("absolute");
    expect(screen.getByTestId("action-bar").props.style).toEqual(
      expect.objectContaining({ paddingBottom: 34 }),
    );
  });

  it("collapses the home-indicator inset on an in-flow bar when the keyboard opens", () => {
    const listeners: Record<string, () => void> = {};
    const addListenerSpy = jest.spyOn(Keyboard, "addListener").mockImplementation((event, cb) => {
      listeners[event] = cb as () => void;
      return { remove: jest.fn() } as ReturnType<typeof Keyboard.addListener>;
    });

    const screen = render(
      <PrimaryActionBar
        testID="action-bar"
        absolute={false}
        primaryLabel="Create Task"
        onPrimaryPress={jest.fn()}
      />,
    );

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    act(() => {
      listeners[showEvent]?.();
    });

    expect(screen.getByTestId("action-bar").props.style).toEqual(
      expect.objectContaining({ paddingBottom: 12 }),
    );

    addListenerSpy.mockRestore();
  });
});
