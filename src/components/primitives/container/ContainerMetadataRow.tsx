import React from "react";
import { Text, View } from "react-native";
import type {
  ContainerMetadataRowContract,
  PrimitiveDensityMode,
  PrimitiveStructuralState,
  StatusPrimitiveCategory,
} from "@/ui/contracts/primitives";
import { cn } from "@/utils/cn";
import StatusBadge from "../status/StatusBadge";
import { CONTAINER_CARD_DENSITY_CLASS_MAP } from "../tokens";

interface ContainerMetadataRowProps {
  cardPrimitiveId: string;
  cardTestId: string;
  row: ContainerMetadataRowContract;
  density: PrimitiveDensityMode;
  structuralState: PrimitiveStructuralState;
  isDisabled: boolean;
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

export default function ContainerMetadataRow({
  cardPrimitiveId,
  cardTestId,
  row,
  density,
  structuralState,
  isDisabled,
}: ContainerMetadataRowProps) {
  const densityClasses = CONTAINER_CARD_DENSITY_CLASS_MAP[density];
  const label = row.label.trim();
  const value = row.value.trim();

  return (
    <View
      testID={`${cardTestId}__metadata-row__${row.rowId}`}
      className={cn(
        "flex-row items-center justify-between border-b border-dashed border-slate-200 pb-2",
        densityClasses.metadataRow,
      )}
    >
      <Text className={densityClasses.metadataLabel}>{label}</Text>

      {row.semanticToken ? (
        <StatusBadge
          contract={{
            primitiveId: `${cardPrimitiveId}__metadata-status__${row.rowId}`,
            family: "status",
            density,
            structuralState,
            accessibilityLabel: `${label} status`,
            testId: `${cardTestId}__status-badge__${row.rowId}`,
            isLoading: false,
            isEmpty: false,
            isStale: structuralState === "stale",
            isDisabled,
            semanticToken: row.semanticToken,
            category: inferStatusCategory(row.semanticToken),
            emphasis: "standard",
            label: value,
          }}
        />
      ) : (
        <Text className={densityClasses.metadataValue}>{value}</Text>
      )}
    </View>
  );
}
