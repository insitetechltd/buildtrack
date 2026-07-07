import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { ContainerPrimitiveContract, StatusPrimitiveCategory } from "@/ui/contracts/primitives";
import { cn } from "@/utils/cn";
import {
  CONTAINER_CARD_DENSITY_CLASS_MAP,
  CONTAINER_CARD_STRUCTURAL_STATE_CLASS_MAP,
  STATUS_BADGE_DENSITY_CLASS_MAP,
  getStatusToneClassSet,
  resolveContainerStructuralState,
} from "../tokens";
import ContainerBodyState from "./ContainerBodyState";
import ContainerHeader from "./ContainerHeader";
import ContainerMetadataRow from "./ContainerMetadataRow";

interface ContainerCardProps {
  contract: ContainerPrimitiveContract;
  className?: string;
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

export default function ContainerCard({ contract, className }: ContainerCardProps) {
  const structuralState = resolveContainerStructuralState(contract);
  const densityClasses = CONTAINER_CARD_DENSITY_CLASS_MAP[contract.density];
  const stateClasses = CONTAINER_CARD_STRUCTURAL_STATE_CLASS_MAP[structuralState];
  const statusBadgeDensityClasses = STATUS_BADGE_DENSITY_CLASS_MAP[contract.density];
  const resolvedTestId = contract.testId ?? contract.primitiveId;
  const hasVisibleMedia =
    !!contract.body.media &&
    contract.body.media.mode !== "hidden" &&
    contract.body.media.items.length > 0;
  const shouldRenderBodyState =
    structuralState === "loading" ||
    structuralState === "empty" ||
    contract.body.shouldRenderBody ||
    hasVisibleMedia;
  const statusRow = contract.chrome.metadataRows.find((row) => row.rowId === "task-card-status");
  const contextRow = contract.chrome.metadataRows.find((row) => row.rowId === "task-card-context");
  const isTaskThumbnailCard = Boolean(statusRow);

  const marginClass = contract.indentationLevel === 1 ? 'ml-6' : contract.indentationLevel === 2 ? 'ml-10' : '';
  const CardView = contract.onPress ? Pressable : View;

  if (isTaskThumbnailCard && structuralState !== "loading" && structuralState !== "empty") {
    const thumbnailItem = contract.body.media?.items[0];
    const statusToken = statusRow?.semanticToken ?? "custom";
    const statusToneClasses = getStatusToneClassSet(
      statusToken,
      inferStatusCategory(statusToken),
      "subtle",
    );

    return (
      <CardView
        testID={resolvedTestId}
        onPress={contract.onPress}
        accessible
        accessibilityRole="text"
        accessibilityLabel={contract.accessibilityLabel}
        accessibilityHint={contract.accessibilityHint}
        className={cn(
          "h-28 overflow-hidden border bg-white",
          stateClasses.shell,
          marginClass,
          className,
        )}
      >
        <View className="flex-row items-stretch">
          <View
            testID={`${resolvedTestId}:thumbnail`}
            className="w-28 self-stretch overflow-hidden bg-slate-100"
          >
            {thumbnailItem ? (
              <Image
                testID={`${resolvedTestId}:thumbnail-image`}
                source={{ uri: thumbnailItem.uri }}
                accessibilityLabel={thumbnailItem.accessibilityLabel}
                resizeMode="cover"
                className="h-full w-full"
              />
            ) : (
              <View
                testID={`${resolvedTestId}:thumbnail-placeholder`}
                className="h-full w-full bg-slate-100"
              />
            )}
          </View>

          <View
            testID={`${resolvedTestId}:content`}
            className="min-w-0 flex-1 justify-center px-3 py-3"
          >
            <Text
              testID={`${resolvedTestId}:title`}
              className={cn(
                "text-base font-semibold text-slate-900",
                contract.density === "compact" ? "leading-5" : "leading-6",
                "pr-1",
              )}
              numberOfLines={2}
            >
              {contract.chrome.title}
            </Text>
            <View
              testID={`${resolvedTestId}:status-line`}
              className="mt-1 flex-row items-center gap-2"
            >
              <View
                testID={`${resolvedTestId}:status-badge`}
                className={cn(
                  "self-start rounded-full border px-2 py-1",
                  statusBadgeDensityClasses.container,
                  statusToneClasses.container,
                )}
              >
                <Text
                  className={cn(
                    statusBadgeDensityClasses.label,
                    "uppercase tracking-[0.08em]",
                    statusToneClasses.label,
                  )}
                  numberOfLines={1}
                >
                  {statusRow?.value ?? contract.chrome.subtitle}
                </Text>
              </View>
            </View>
            {contextRow?.value ? (
              <Text className="mt-1 text-sm text-slate-500" numberOfLines={2}>
                {contextRow.value}
              </Text>
            ) : null}
          </View>
        </View>
      </CardView>
    );
  }

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

      {shouldRenderBodyState ? (
        <ContainerBodyState
          cardTestId={resolvedTestId}
          body={contract.body}
          density={contract.density}
          structuralState={structuralState}
        />
      ) : null}
    </CardView>
  );
}
