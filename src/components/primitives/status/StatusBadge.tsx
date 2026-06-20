import React from "react";
import { Text, View } from "react-native";
import type { StatusPrimitiveContract, StatusSemanticToken } from "@/ui/contracts/primitives";
import { cn } from "@/utils/cn";
import {
  STATUS_BADGE_DENSITY_CLASS_MAP,
  STATUS_BADGE_STRUCTURAL_STATE_CLASS_MAP,
  getStatusToneClassSet,
  resolveStatusStructuralState,
} from "../tokens";

interface StatusBadgeProps {
  contract: StatusPrimitiveContract;
  className?: string;
}

function buildFallbackLabelFromToken(token: StatusSemanticToken): string {
  return token
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function resolveStatusBadgeLabel(
  contract: StatusPrimitiveContract,
  structuralState: ReturnType<typeof resolveStatusStructuralState>,
): string {
  const trimmedLabel = contract.label.trim();
  const semanticFallback = buildFallbackLabelFromToken(contract.semanticToken);

  switch (structuralState) {
    case "loading":
      return "Loading";
    case "empty":
      return trimmedLabel || "Empty";
    case "stale":
      return trimmedLabel ? `${trimmedLabel} · Stale` : "Stale";
    case "disabled":
      return trimmedLabel || "Unavailable";
    default:
      return trimmedLabel || semanticFallback;
  }
}

export default function StatusBadge({ contract, className }: StatusBadgeProps) {
  const structuralState = resolveStatusStructuralState(contract);
  const densityClasses = STATUS_BADGE_DENSITY_CLASS_MAP[contract.density];
  const structuralStateClasses =
    STATUS_BADGE_STRUCTURAL_STATE_CLASS_MAP[structuralState];
  const toneClasses = getStatusToneClassSet(
    contract.semanticToken,
    contract.category,
    contract.emphasis,
  );
  const resolvedLabel = resolveStatusBadgeLabel(contract, structuralState);
  const accessibilityHint = contract.accessibilityHint ?? contract.tooltip;

  return (
    <View
      testID={contract.testId ?? contract.primitiveId}
      accessible
      accessibilityRole="text"
      accessibilityLabel={contract.accessibilityLabel}
      accessibilityHint={accessibilityHint}
      className={cn(
        "self-start flex-row items-center border",
        densityClasses.container,
        toneClasses.container,
        structuralStateClasses.container,
        className,
      )}
    >
      <View className={cn("flex-row items-center", densityClasses.content)}>
        {contract.icon ? (
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className={cn(
              densityClasses.icon,
              toneClasses.icon,
              structuralStateClasses.icon,
            )}
          >
            •
          </Text>
        ) : null}

        <Text
          className={cn(
            densityClasses.label,
            toneClasses.label,
            structuralStateClasses.label,
          )}
          numberOfLines={1}
        >
          {resolvedLabel}
        </Text>
      </View>
    </View>
  );
}
