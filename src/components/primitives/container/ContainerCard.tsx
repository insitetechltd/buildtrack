import React from "react";
import { Pressable, View } from "react-native";
import type { ContainerPrimitiveContract } from "@/ui/contracts/primitives";
import { cn } from "@/utils/cn";
import {
  CONTAINER_CARD_DENSITY_CLASS_MAP,
  CONTAINER_CARD_STRUCTURAL_STATE_CLASS_MAP,
  resolveContainerStructuralState,
} from "../tokens";
import ContainerBodyState from "./ContainerBodyState";
import ContainerHeader from "./ContainerHeader";
import ContainerMetadataRow from "./ContainerMetadataRow";

interface ContainerCardProps {
  contract: ContainerPrimitiveContract;
  className?: string;
}

export default function ContainerCard({ contract, className }: ContainerCardProps) {
  const structuralState = resolveContainerStructuralState(contract);
  const densityClasses = CONTAINER_CARD_DENSITY_CLASS_MAP[contract.density];
  const stateClasses = CONTAINER_CARD_STRUCTURAL_STATE_CLASS_MAP[structuralState];
  const resolvedTestId = contract.testId ?? contract.primitiveId;

  const marginClass = contract.indentationLevel === 1 ? 'ml-6' : contract.indentationLevel === 2 ? 'ml-10' : '';
  const CardView = contract.onPress ? Pressable : View;

  return (
    <CardView
      testID={resolvedTestId}
      onPress={contract.onPress}
      accessible
      accessibilityRole="text"
      accessibilityLabel={contract.accessibilityLabel}
      accessibilityHint={contract.accessibilityHint}
      className={cn(
        "border bg-white",
        densityClasses.shell,
        stateClasses.shell,
        marginClass,
        className,
      )}
    >
      <ContainerHeader
        cardTestId={resolvedTestId}
        title={contract.chrome.title}
        subtitle={contract.chrome.subtitle}
        actionSlots={contract.chrome.actionSlots}
        density={contract.density}
        isDisabled={structuralState === "disabled"}
      />

      <View className={densityClasses.metadataList}>
        {contract.chrome.metadataRows.map((row) => (
          <ContainerMetadataRow
            key={row.rowId}
            cardPrimitiveId={contract.primitiveId}
            cardTestId={resolvedTestId}
            row={row}
            density={contract.density}
            structuralState={structuralState}
            isDisabled={structuralState === "disabled"}
          />
        ))}
      </View>

      <ContainerBodyState
        cardTestId={resolvedTestId}
        body={contract.body}
        density={contract.density}
        structuralState={structuralState}
      />
    </CardView>
  );
}
