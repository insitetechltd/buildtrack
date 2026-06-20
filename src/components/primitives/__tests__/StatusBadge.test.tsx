import React from "react";
import { render } from "@testing-library/react-native";
import StatusBadge from "../status/StatusBadge";
import {
  STATUS_BADGE_DENSITY_CLASS_MAP,
  STATUS_BADGE_STRUCTURAL_STATE_CLASS_MAP,
  STATUS_SEMANTIC_TONE_MAP,
} from "../tokens";
import type { StatusPrimitiveContract } from "@/ui/contracts/primitives";

describe("StatusBadge", () => {
  const baseContract: StatusPrimitiveContract = {
    primitiveId: "status-badge-task-approved",
    family: "status",
    density: "standard",
    structuralState: "stale",
    accessibilityLabel: "Task status",
    accessibilityHint: "Shows the current task status",
    analyticsId: "task-status-approved",
    testId: "status-badge",
    isLoading: false,
    isEmpty: false,
    isStale: true,
    isDisabled: false,
    semanticToken: "task_approved",
    category: "task",
    emphasis: "strong",
    label: "Approved",
    icon: "checkmark-circle",
    tooltip: "Task has been approved",
  };

  it("exports deterministic token maps for density, structural state, and semantic status", () => {
    expect(STATUS_BADGE_DENSITY_CLASS_MAP.compact.container).toContain("px-2");
    expect(STATUS_BADGE_DENSITY_CLASS_MAP.expanded.label).toContain("text-sm");
    expect(STATUS_BADGE_STRUCTURAL_STATE_CLASS_MAP.loading.container).toContain("bg-slate-200");
    expect(STATUS_BADGE_STRUCTURAL_STATE_CLASS_MAP.disabled.container).toContain("opacity-60");
    expect(STATUS_SEMANTIC_TONE_MAP.task_approved.strong.container).toContain("bg-green-600");
    expect(STATUS_SEMANTIC_TONE_MAP.validation_error.standard.container).toContain("bg-red-100");
  });

  it("renders the semantic status styling for the provided token, emphasis, and density", () => {
    const { getByTestId, getByText } = render(<StatusBadge contract={baseContract} />);

    const badge = getByTestId("status-badge");

    expect(getByText("Approved · Stale")).toBeTruthy();
    expect(badge.props.className).toContain("px-2.5");
    expect(badge.props.className).toContain("bg-green-600");
    expect(badge.props.className).toContain("border-green-700");
    expect(badge.props.accessibilityLabel).toBe("Task status");
    expect(badge.props.accessibilityHint).toBe("Shows the current task status");
  });

  it("renders a deterministic loading badge without leaking the resolved label", () => {
    const loadingContract: StatusPrimitiveContract = {
      ...baseContract,
      structuralState: "loading",
      isLoading: true,
      isStale: false,
      label: "Approved",
    };

    const { getByTestId, getByText, queryByText } = render(
      <StatusBadge contract={loadingContract} />,
    );

    const badge = getByTestId("status-badge");

    expect(getByText("Loading")).toBeTruthy();
    expect(queryByText("Approved")).toBeNull();
    expect(badge.props.className).toContain("bg-slate-200");
    expect(badge.props.className).toContain("border-slate-300");
  });

  it("renders an intentional empty-state badge when the contract resolves to empty", () => {
    const emptyContract: StatusPrimitiveContract = {
      ...baseContract,
      structuralState: "empty",
      isEmpty: true,
      isStale: false,
      label: "",
      semanticToken: "workspace_empty",
      category: "workspace",
      emphasis: "standard",
    };

    const { getByTestId, getByText } = render(<StatusBadge contract={emptyContract} />);

    const badge = getByTestId("status-badge");

    expect(getByText("Empty")).toBeTruthy();
    expect(badge.props.className).toContain("bg-slate-100");
    expect(badge.props.className).toContain("border-slate-300");
  });

  it("renders a disabled badge with reduced emphasis while keeping the text readable", () => {
    const disabledContract: StatusPrimitiveContract = {
      ...baseContract,
      structuralState: "disabled",
      isDisabled: true,
      isStale: false,
      density: "expanded",
      semanticToken: "validation_warning",
      category: "validation",
      emphasis: "subtle",
      label: "Attention Required",
    };

    const { getByTestId, getByText } = render(
      <StatusBadge contract={disabledContract} />,
    );

    const badge = getByTestId("status-badge");

    expect(getByText("Attention Required")).toBeTruthy();
    expect(badge.props.className).toContain("opacity-60");
    expect(badge.props.className).toContain("px-3");
    expect(badge.props.className).toContain("bg-amber-50");
  });
});
