import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import TextField from "../input/TextField";
import type { InputPrimitiveContract } from "@/ui/contracts/primitives";

describe("Input primitives", () => {
  const baseContract: InputPrimitiveContract = {
    primitiveId: "input-title",
    family: "input",
    density: "standard",
    structuralState: "stale",
    accessibilityLabel: "Task title",
    accessibilityHint: "Enter the task title",
    analyticsId: "task-title",
    testId: "text-field",
    isLoading: false,
    isEmpty: false,
    isStale: true,
    isDisabled: false,
    label: "Title",
    helperText: "This will be visible to assignees.",
    validation: {
      status: "none",
      severity: "none",
    },
    interaction: {
      isDisabled: false,
      isReadOnly: false,
      isRequired: true,
    },
    content: {
      value: "Scaffold level 4 inspection",
      placeholder: "Enter task title",
      prefixText: "#",
      suffixText: "REQ",
    },
  };

  it("passes accessibility labels through to the underlying TextInput", () => {
    const view = render(<TextField contract={baseContract} onChangeText={jest.fn()} />);
    const input = view.getByTestId("text-field__input");

    expect(input.props.accessibilityLabel).toBe("Task title");
    expect(input.props.accessibilityHint).toBe("Enter the task title");
  });

  it("calls onChangeText with the updated value", () => {
    const onChangeText = jest.fn();
    const view = render(<TextField contract={baseContract} onChangeText={onChangeText} />);
    const input = view.getByTestId("text-field__input");

    fireEvent.changeText(input, "Updated title");

    expect(onChangeText).toHaveBeenCalledWith("Updated title");
  });

  it("surfaces onFocus and onBlur from the underlying TextInput", () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const view = render(
      <TextField contract={baseContract} onChangeText={jest.fn()} onFocus={onFocus} onBlur={onBlur} />,
    );
    const input = view.getByTestId("text-field__input");

    fireEvent(input, "focus");
    fireEvent(input, "blur");

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("renders the validation message in the persistent helper slot without layout collapse", () => {
    const invalidContract: InputPrimitiveContract = {
      ...baseContract,
      validation: {
        status: "invalid",
        severity: "error",
        message: "Title is required.",
      },
    };

    const view = render(<TextField contract={invalidContract} onChangeText={jest.fn()} />);

    expect(view.getByText("Title is required.")).toBeTruthy();
    expect(view.getByTestId("text-field__helper-slot").props.className).toContain("min-h-5");
  });

  it("keeps the helper slot mounted even when there is no helper text or validation message", () => {
    const minimalContract: InputPrimitiveContract = {
      ...baseContract,
      helperText: undefined,
      validation: {
        status: "none",
        severity: "none",
      },
    };

    const view = render(<TextField contract={minimalContract} onChangeText={jest.fn()} />);

    expect(view.getByTestId("text-field__helper-slot").props.className).toContain("min-h-5");
  });

  it("renders disabled and read-only states distinctly while keeping the control non-editable", () => {
    const disabledContract: InputPrimitiveContract = {
      ...baseContract,
      interaction: { ...baseContract.interaction, isDisabled: true, isReadOnly: false },
      structuralState: "disabled",
      isDisabled: true,
      isStale: false,
    };

    const readOnlyContract: InputPrimitiveContract = {
      ...baseContract,
      interaction: { ...baseContract.interaction, isDisabled: false, isReadOnly: true },
    };

    const disabledView = render(
      <TextField contract={disabledContract} onChangeText={jest.fn()} />,
    );
    const readOnlyView = render(
      <TextField contract={readOnlyContract} onChangeText={jest.fn()} />,
    );

    expect(disabledView.getByTestId("text-field__input").props.editable).toBe(false);
    expect(readOnlyView.getByTestId("text-field__input").props.editable).toBe(false);
    expect(disabledView.getByTestId("text-field").props.className).toContain("opacity-60");
    expect(readOnlyView.getByTestId("text-field__input-container").props.className).toContain(
      "bg-slate-50",
    );
  });

  it("renders a loading skeleton state while keeping the input footprint stable", () => {
    const loadingContract: InputPrimitiveContract = {
      ...baseContract,
      structuralState: "loading",
      isLoading: true,
      isStale: false,
    };

    const view = render(<TextField contract={loadingContract} onChangeText={jest.fn()} />);

    expect(view.getByTestId("text-field__input-container").props.className).toContain(
      "min-h-12",
    );
    expect(view.getByTestId("text-field__input-container").props.className).toContain(
      "bg-slate-200",
    );
  });
});

