import React from "react";
import { render } from "@testing-library/react-native";
import ContainerCard from "../container/ContainerCard";
import type { ContainerPrimitiveContract } from "@/ui/contracts/primitives";
import { mapDashboardProjectToContainerCardProps } from "@/ui/mappers/dashboardMappers";
import type { DashboardProjectSummaryItem } from "@/ui/contracts/viewAdapters";

describe("ContainerCard", () => {
  const baseContract: ContainerPrimitiveContract = {
    primitiveId: "container-project-summary",
    family: "container",
    density: "standard",
    structuralState: "stale",
    accessibilityLabel: "Project summary card",
    accessibilityHint: "Shows summary information for the selected project",
    analyticsId: "project-summary-card",
    testId: "container-card",
    isLoading: false,
    isEmpty: false,
    isStale: true,
    isDisabled: false,
    chrome: {
      title: "North Tower",
      subtitle: "Level 04 inspection package",
      metadataRows: [
        {
          rowId: "status",
          label: "Status",
          value: "Active",
          semanticToken: "project_active",
        },
        {
          rowId: "open-tasks",
          label: "Open Tasks",
          value: "14",
        },
      ],
      actionSlots: [
        {
          actionId: "open",
          label: "Open",
          isDisabled: false,
          accessibilityLabel: "Open project summary",
        },
      ],
    },
    body: {
      empty: {
        title: "No items",
        message: "There is no summary content to display.",
        actionLabel: "Refresh",
      },
      skeleton: {
        rowCount: 2,
        metadataColumnCount: 2,
        hasMediaPlaceholder: true,
      },
    },
  };

  it("keeps the same shell geometry for a density while switching structural states", () => {
    const states: Array<ContainerPrimitiveContract> = [
      {
        ...baseContract,
        structuralState: "loading",
        isLoading: true,
        isStale: false,
      },
      {
        ...baseContract,
        structuralState: "empty",
        isEmpty: true,
        isStale: false,
      },
      {
        ...baseContract,
        structuralState: "stale",
        isStale: true,
      },
      {
        ...baseContract,
        structuralState: "disabled",
        isDisabled: true,
        isStale: false,
      },
    ];

    const classNames = states.map((contract) => {
      const view = render(<ContainerCard contract={contract} />);
      return view.getByTestId("container-card").props.className as string;
    });

    classNames.forEach((className) => {
      expect(className).toContain("min-h-44");
      expect(className).toContain("rounded-xl");
    });
  });

  it("renders semantic metadata rows with composed StatusBadge content", () => {
    const { getByText, getByTestId } = render(<ContainerCard contract={baseContract} />);

    expect(getByText("North Tower")).toBeTruthy();
    expect(getByText("Level 04 inspection package")).toBeTruthy();
    expect(getByText("Status")).toBeTruthy();
    expect(getByText("Active · Stale")).toBeTruthy();
    expect(getByText("Open Tasks")).toBeTruthy();
    expect(getByText("14")).toBeTruthy();
    expect(getByText("Open")).toBeTruthy();
    expect(getByTestId("container-card__metadata-row__status")).toBeTruthy();
  });

  it("renders skeleton placeholders without collapsing the content region", () => {
    const loadingContract: ContainerPrimitiveContract = {
      ...baseContract,
      structuralState: "loading",
      isLoading: true,
      isStale: false,
    };

    const { getAllByTestId, getByTestId } = render(
      <ContainerCard contract={loadingContract} />,
    );

    expect(getAllByTestId("container-card__skeleton-row")).toHaveLength(2);
    expect(getByTestId("container-card__media-placeholder")).toBeTruthy();
    expect(getByTestId("container-card__body").props.className).toContain("min-h-24");
  });

  it("renders the empty body state with its configured copy and action label", () => {
    const emptyContract: ContainerPrimitiveContract = {
      ...baseContract,
      structuralState: "empty",
      isEmpty: true,
      isStale: false,
    };

    const { getByText, getByTestId } = render(<ContainerCard contract={emptyContract} />);

    expect(getByText("No items")).toBeTruthy();
    expect(getByText("There is no summary content to display.")).toBeTruthy();
    expect(getByText("Refresh")).toBeTruthy();
    expect(getByTestId("container-card__body").props.className).toContain("justify-center");
  });

  it("renders disabled action slots as non-interactive visual affordances", () => {
    const disabledContract: ContainerPrimitiveContract = {
      ...baseContract,
      structuralState: "disabled",
      isDisabled: true,
      isStale: false,
      chrome: {
        ...baseContract.chrome,
        actionSlots: [
          {
            actionId: "open",
            label: "Open",
            isDisabled: true,
            accessibilityLabel: "Open project summary",
          },
        ],
      },
    };

    const { getByTestId, getByText } = render(
      <ContainerCard contract={disabledContract} />,
    );

    expect(getByText("Open")).toBeTruthy();
    expect(getByTestId("container-card__action__open").props.accessibilityState).toEqual({
      disabled: true,
    });
    expect(getByTestId("container-card").props.className).toContain("opacity-60");
  });

  it("collapses the body region when no meaningful content is available", () => {
    const { queryByTestId } = render(<ContainerCard contract={baseContract} />);

    expect(queryByTestId("container-card__body")).toBeNull();
  });

  it("allows dashboard summary cards to remain metadata-first without a body region", () => {
    const dashboardItem: DashboardProjectSummaryItem = {
      id: "dashboard-project-1",
      projectId: "project-1",
      title: "North Tower",
      subtitle: "Inspection Package A",
      statusToken: "project_active",
      statusLabel: "On-going",
      openTaskCount: 12,
      overdueTaskCount: 2,
      density: "standard",
      structuralState: "stale",
    };

    const contract = mapDashboardProjectToContainerCardProps(dashboardItem);
    const { queryByTestId } = render(<ContainerCard contract={contract} />);

    expect(contract.body.shouldRenderBody).toBe(false);
    expect(contract.body.media).toEqual({
      mode: "hidden",
      items: [],
    });
    expect(queryByTestId("container-card:project-1__body")).toBeNull();
  });

  it("switches shell geometry with density while preserving the per-density contract", () => {
    const compact = render(
      <ContainerCard contract={{ ...baseContract, density: "compact" }} />,
    );
    const expanded = render(
      <ContainerCard contract={{ ...baseContract, density: "expanded" }} />,
    );

    expect(compact.getByTestId("container-card").props.className).toContain("min-h-36");
    expect(expanded.getByTestId("container-card").props.className).toContain("min-h-52");
  });

  
});
