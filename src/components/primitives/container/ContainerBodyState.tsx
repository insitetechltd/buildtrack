import React from "react";
import { Text, View } from "react-native";
import type {
  ContainerBodyStateContract,
  PrimitiveDensityMode,
  PrimitiveStructuralState,
} from "@/ui/contracts/primitives";
import { cn } from "@/utils/cn";
import { CONTAINER_CARD_DENSITY_CLASS_MAP } from "../tokens";

interface ContainerBodyStateProps {
  cardTestId: string;
  body: ContainerBodyStateContract;
  density: PrimitiveDensityMode;
  structuralState: PrimitiveStructuralState;
}

export default function ContainerBodyState({
  cardTestId,
  body,
  density,
  structuralState,
}: ContainerBodyStateProps) {
  const densityClasses = CONTAINER_CARD_DENSITY_CLASS_MAP[density];

  if (structuralState === "loading") {
    const rowCount = body.skeleton?.rowCount ?? 3;
    const columnCount = body.skeleton?.metadataColumnCount ?? 2;

    return (
      <View
        testID={`${cardTestId}__body`}
        className={cn("justify-center", densityClasses.body)}
      >
        {body.skeleton?.hasMediaPlaceholder ? (
          <View
            testID={`${cardTestId}__media-placeholder`}
            className="h-20 rounded-xl bg-slate-200"
          />
        ) : null}

        <View className="gap-2">
          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <View
              key={`skeleton-row-${rowIndex}`}
              testID={`${cardTestId}__skeleton-row`}
              className={cn("bg-slate-200", densityClasses.skeletonRow)}
            >
              <View className="flex-row gap-2">
                {Array.from({ length: columnCount }).map((__, columnIndex) => (
                  <View
                    key={`skeleton-column-${columnIndex}`}
                    className={cn("flex-1 rounded-md bg-slate-200", densityClasses.skeletonRow)}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (structuralState === "empty") {
    return (
      <View
        testID={`${cardTestId}__body`}
        className={cn("items-start justify-center", densityClasses.body)}
      >
        <Text className={densityClasses.emptyTitle}>
          {body.empty?.title ?? "No content"}
        </Text>
        <Text className={densityClasses.emptyMessage}>
          {body.empty?.message ?? "There is nothing to display."}
        </Text>
        {body.empty?.actionLabel ? (
          <Text className={densityClasses.emptyAction}>{body.empty.actionLabel}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View
      testID={`${cardTestId}__body`}
      className={cn("justify-center", densityClasses.body)}
    >
      <Text className={densityClasses.bodyText}>
        {structuralState === "disabled"
          ? "Content is currently unavailable."
          : "Content is available and ready for composition."}
      </Text>
    </View>
  );
}
