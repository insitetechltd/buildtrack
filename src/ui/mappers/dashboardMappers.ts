import type { DashboardProjectSummaryItem } from "@/ui/contracts/viewAdapters";
import type { ContainerPrimitiveContract } from "@/ui/contracts/primitives";

function derivePrimitiveFlags(structuralState: DashboardProjectSummaryItem["structuralState"]) {
  return {
    isLoading: structuralState === "loading",
    isEmpty: structuralState === "empty",
    isStale: structuralState === "stale",
    isDisabled: structuralState === "disabled",
  };
}

export function mapDashboardProjectToContainerCardProps(
  data: DashboardProjectSummaryItem,
): ContainerPrimitiveContract {
  const flags = derivePrimitiveFlags(data.structuralState);
  const primitiveId = `dashboard:project:${data.projectId}`;

  return {
    primitiveId,
    family: "container",
    density: data.density,
    structuralState: data.structuralState,
    accessibilityLabel: `Project ${data.title}`,
    accessibilityHint: "Project summary card",
    analyticsId: primitiveId,
    testId: `container-card:${data.projectId}`,
    ...flags,
    chrome: {
      title: data.title,
      subtitle: data.subtitle,
      metadataRows: [
        {
          rowId: "status",
          label: "Status",
          value: data.statusLabel,
          semanticToken: data.statusToken,
        },
        {
          rowId: "open_tasks",
          label: "Open Tasks",
          value: String(data.openTaskCount),
        },
        {
          rowId: "overdue_tasks",
          label: "Overdue",
          value: String(data.overdueTaskCount),
        },
      ],
      actionSlots: [
        {
          actionId: "open",
          label: "Open",
          isDisabled: flags.isDisabled,
          accessibilityLabel: `Open project ${data.title}`,
        },
      ],
    },
    body: {
      empty: {
        title: "No summary",
        message: "No project summary is available.",
      },
      skeleton: {
        rowCount: 2,
        metadataColumnCount: 2,
        hasMediaPlaceholder: false,
      },
    },
  };
}

