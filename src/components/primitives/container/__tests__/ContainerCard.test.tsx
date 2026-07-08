import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import ContainerCard from "../ContainerCard";
import type { ContainerPrimitiveContract } from "@/ui/contracts/primitives";

describe("container/ContainerCard task-list layout", () => {
  const buildTaskCardContract = (
    overrides: Partial<ContainerPrimitiveContract> = {},
  ): ContainerPrimitiveContract => ({
    primitiveId: "tasks:row:task-1",
    family: "container",
    density: "standard",
    structuralState: "stale",
    accessibilityLabel: "Task Install guardrails",
    accessibilityHint: "Task summary card",
    analyticsId: "tasks:row:task-1",
    testId: "container-card:task-1",
    isLoading: false,
    isEmpty: false,
    isStale: true,
    isDisabled: false,
    chrome: {
      title: "Structural steel inspection — Level 12",
      subtitle: "Submitted for review",
      metadataRows: [
        {
          rowId: "task-card-status",
          label: "Status",
          value: "Submitted for review",
          semanticToken: "task_submitted_for_review",
        },
        {
          rowId: "task-card-context",
          label: "Context",
          value: "Level 12, Grid B–C",
        },
      ],
      actionSlots: [],
    },
    body: {
      shouldRenderBody: false,
      media: {
        mode: "hidden",
        items: [
          {
            id: "thumbnail",
            uri: "https://example.com/task-photo.jpg",
            accessibilityLabel: "Structural steel inspection — Level 12 thumbnail",
          },
        ],
      },
      empty: {
        title: "No task details",
        message: "This task has no additional details available.",
      },
      skeleton: {
        rowCount: 2,
        metadataColumnCount: 2,
        hasMediaPlaceholder: false,
      },
    },
    ...overrides,
  });

  it("renders a compact task card with a full-height media rail, status badge, and location line", () => {
    const { getByTestId, getByText, queryByText, queryByTestId } = render(
      <ContainerCard contract={buildTaskCardContract()} />,
    );

    expect(getByTestId("container-card:task-1:thumbnail")).toBeTruthy();
    expect(getByTestId("container-card:task-1").props.className).toContain("overflow-hidden");
    expect(getByTestId("container-card:task-1").props.className).toContain("h-28");
    expect(getByTestId("container-card:task-1:thumbnail").props.className).toContain("self-stretch");
    expect(getByTestId("container-card:task-1:thumbnail").props.className).not.toContain("rounded-2xl");
    expect(getByTestId("container-card:task-1:thumbnail-image")).toBeTruthy();
    expect(getByTestId("container-card:task-1:status-badge")).toBeTruthy();
    expect(getByText("Structural steel inspection — Level 12")).toBeTruthy();
    expect(getByText("Submitted for review")).toBeTruthy();
    expect(getByText("Level 12, Grid B–C")).toBeTruthy();
    expect(queryByText("REVIEW")).toBeNull();
    expect(queryByTestId("container-card:task-1__body")).toBeNull();
  });

  it("renders a quiet placeholder and preserves tap-through behavior when no photo exists", () => {
    const onPress = jest.fn();
    const contract = buildTaskCardContract({
      onPress,
      body: {
        shouldRenderBody: false,
        media: {
          mode: "hidden",
          items: [],
        },
        empty: {
          title: "No task details",
          message: "This task has no additional details available.",
        },
        skeleton: {
          rowCount: 2,
          metadataColumnCount: 2,
          hasMediaPlaceholder: false,
        },
      },
    });

    const { getByTestId, queryByTestId } = render(<ContainerCard contract={contract} />);

    fireEvent.press(getByTestId("container-card:task-1"));

    expect(getByTestId("container-card:task-1:thumbnail")).toBeTruthy();
    expect(getByTestId("container-card:task-1:thumbnail-placeholder")).toBeTruthy();
    expect(getByTestId("container-card:task-1:thumbnail").props.className).toContain("self-stretch");
    expect(getByTestId("container-card:task-1:thumbnail-placeholder").props.className).toContain("h-full");
    expect(getByTestId("container-card:task-1:thumbnail-placeholder").props.className).toContain("w-full");
    expect(queryByTestId("container-card:task-1:thumbnail-image")).toBeNull();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
