import {
  mapDashboardProjectToContainerCardProps,
} from "../dashboardMappers";
import {
  mapTaskInputToTextFieldProps,
  mapTaskRowToContainerCardProps,
  mapTaskRowToStatusBadgeProps,
} from "../tasksMappers";
import type {
  DashboardProjectSummaryItem,
  TasksScreenRowItem,
} from "@/ui/contracts/viewAdapters";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    Object.getOwnPropertyNames(value).forEach((key) => {
      const nested = (value as Record<string, unknown>)[key];
      if (nested && typeof nested === "object" && !Object.isFrozen(nested)) {
        deepFreeze(nested);
      }
    });
  }
  return value;
}

describe("ui mappers", () => {
  it("maps dashboard project items into ContainerPrimitiveContract with correct state flags", () => {
    const item: DashboardProjectSummaryItem = deepFreeze({
      id: "dash-project-1",
      projectId: "project-1",
      title: "North Tower",
      subtitle: "Inspection Package A",
      statusToken: "project_active",
      statusLabel: "Active",
      openTaskCount: 12,
      overdueTaskCount: 2,
      density: "standard",
      structuralState: "stale",
    });

    const contract = mapDashboardProjectToContainerCardProps(item);

    expect(contract.family).toBe("container");
    expect(contract.density).toBe("standard");
    expect(contract.structuralState).toBe("stale");
    expect(contract.isLoading).toBe(false);
    expect(contract.isEmpty).toBe(false);
    expect(contract.isStale).toBe(true);
    expect(contract.isDisabled).toBe(false);
    expect(contract.chrome.title).toBe("North Tower");
    expect(contract.chrome.metadataRows[0].semanticToken).toBe("project_active");
  });

  it("maps tasks row items into StatusPrimitiveContract with correct state flags", () => {
    const row: TasksScreenRowItem = deepFreeze({
      id: "task-row-1",
      taskId: "task-1",
      title: "Install guardrails",
      statusToken: "task_in_progress",
      statusLabel: "In progress",
      responsibilityToken: "OTHER_OPEN",
      priorityLabel: "High",
      dueDateLabel: "Tomorrow",
      assigneeSummary: "Sam +1",
      projectName: "North Tower",
      isOverdue: false,
      density: "compact",
      structuralState: "loading",
    });

    const contract = mapTaskRowToStatusBadgeProps(row);

    expect(contract.family).toBe("status");
    expect(contract.density).toBe("compact");
    expect(contract.structuralState).toBe("loading");
    expect(contract.isLoading).toBe(true);
    expect(contract.isEmpty).toBe(false);
    expect(contract.isStale).toBe(false);
    expect(contract.isDisabled).toBe(false);
    expect(contract.semanticToken).toBe("task_in_progress");
    expect(contract.label).toBe("In progress");
  });

  it("maps task rows into ContainerPrimitiveContract without mutating source data", () => {
    const row: TasksScreenRowItem = deepFreeze({
      id: "task-row-2",
      taskId: "task-2",
      title: "Verify anchor points",
      statusToken: "task_new",
      statusLabel: "New",
      responsibilityToken: "ACTION_REQUIRED",
      priorityLabel: "Critical",
      dueDateLabel: "Today",
      assigneeSummary: "Alex",
      projectName: "North Tower",
      isOverdue: true,
      density: "standard",
      structuralState: "disabled",
    });

    const contract = mapTaskRowToContainerCardProps(row);

    expect(contract.family).toBe("container");
    expect(contract.structuralState).toBe("disabled");
    expect(contract.isDisabled).toBe(true);
    expect(contract.chrome.title).toBe("Verify anchor points");
    expect(contract.chrome.metadataRows.find((entry) => entry.rowId === "status")?.semanticToken).toBe(
      "task_new",
    );
  });

  it("maps task input models into InputPrimitiveContract without mutating source data", () => {
    const input = deepFreeze({
      id: "tasks-search",
      label: "Search",
      value: "tower",
      placeholder: "Search tasks",
      density: "expanded" as const,
      structuralState: "disabled" as const,
    });

    const contract = mapTaskInputToTextFieldProps(input);

    expect(contract.family).toBe("input");
    expect(contract.density).toBe("expanded");
    expect(contract.structuralState).toBe("disabled");
    expect(contract.isDisabled).toBe(true);
    expect(contract.interaction.isDisabled).toBe(true);
    expect(contract.content.value).toBe("tower");
  });
});
