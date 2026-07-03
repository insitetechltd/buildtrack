import type { TasksScreenRowItem } from "@/ui/contracts/viewAdapters";
import type {
  ContainerPrimitiveContract,
  InputPrimitiveContract,
  StatusPrimitiveCategory,
  StatusPrimitiveContract,
} from "@/ui/contracts/primitives";

function derivePrimitiveFlags(structuralState: TasksScreenRowItem["structuralState"]) {
  return {
    isLoading: structuralState === "loading",
    isEmpty: structuralState === "empty",
    isStale: structuralState === "stale",
    isDisabled: structuralState === "disabled",
  };
}

function inferStatusCategory(token: string): StatusPrimitiveCategory {
  if (token.startsWith("task_")) {
    return "task";
  }

  if (token.startsWith("project_")) {
    return "project";
  }

  if (token.startsWith("workspace_")) {
    return "workspace";
  }

  if (token.startsWith("validation_")) {
    return "validation";
  }

  return "custom";
}

export function mapTaskRowToStatusBadgeProps(
  data: TasksScreenRowItem,
): StatusPrimitiveContract {
  const flags = derivePrimitiveFlags(data.structuralState);
  const primitiveId = `tasks:row:${data.taskId}:status`;

  return {
    primitiveId,
    family: "status",
    density: data.density,
    structuralState: data.structuralState,
    accessibilityLabel: `Task status ${data.statusLabel}`,
    accessibilityHint: "Task status badge",
    analyticsId: primitiveId,
    testId: `status-badge:${data.taskId}`,
    ...flags,
    semanticToken: data.statusToken,
    category: inferStatusCategory(data.statusToken),
    emphasis: data.structuralState === "stale" ? "strong" : "standard",
    label: data.statusLabel,
  };
}

export type TasksSearchInputData = Readonly<{
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  density: "compact" | "standard" | "expanded";
  structuralState: "loading" | "empty" | "stale" | "disabled";
}>;

export function mapTaskInputToTextFieldProps(
  data: TasksSearchInputData,
): InputPrimitiveContract {
  const isLoading = data.structuralState === "loading";
  const isEmpty = data.structuralState === "empty";
  const isStale = data.structuralState === "stale";
  const isDisabled = data.structuralState === "disabled";
  const primitiveId = `tasks:input:${data.id}`;

  return {
    primitiveId,
    family: "input",
    density: data.density,
    structuralState: data.structuralState,
    accessibilityLabel: data.label,
    accessibilityHint: `Input ${data.label}`,
    analyticsId: primitiveId,
    testId: `text-field:${data.id}`,
    isLoading,
    isEmpty,
    isStale,
    isDisabled,
    label: data.label,
    helperText: undefined,
    validation: {
      status: "none",
      severity: "none",
    },
    interaction: {
      isDisabled,
      isReadOnly: false,
      isRequired: false,
    },
    content: {
      value: data.value,
      placeholder: data.placeholder,
    },
  };
}

export function mapTaskRowToContainerCardProps(
  data: TasksScreenRowItem,
): ContainerPrimitiveContract {
  const flags = derivePrimitiveFlags(data.structuralState);
  const primitiveId = `tasks:row:${data.taskId}`;
  const status = mapTaskRowToStatusBadgeProps(data);
  const photoCount = data.attachmentUris.length;

  return {
    primitiveId,
    family: "container",
    density: data.density,
    structuralState: data.structuralState,
    indentationLevel: data.indentationLevel,
    onPress: data.onPress,
    accessibilityLabel: `Task ${data.title}`,
    accessibilityHint: "Task summary card",
    analyticsId: primitiveId,
    testId: `container-card:${data.taskId}`,
    ...flags,
    chrome: {
      title: data.title,
      subtitle: data.projectName,
      metadataRows: [
        {
          rowId: "status",
          label: "Status",
          value: status.label,
          semanticToken: status.semanticToken,
        },
        {
          rowId: "priority",
          label: "Priority",
          value: data.priorityLabel,
        },
        {
          rowId: "due",
          label: "Due",
          value: data.dueDateLabel ?? "—",
        },
        {
          rowId: "assignees",
          label: "Assigned",
          value: data.assigneeSummary,
        },
      ],
      actionSlots: [],
    },
    body: {
      shouldRenderBody: photoCount > 0,
      media:
        photoCount > 0
          ? {
              mode: "collapsible",
              collapsedLabel: `Photos (${photoCount})`,
              items: data.attachmentUris.map((uri, index) => ({
                id: `photo-${index}`,
                uri,
                accessibilityLabel: `${data.title} attachment ${index + 1}`,
              })),
            }
          : {
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
  };
}
