import React from "react";
import { Pressable, Text, View } from "react-native";
import type {
  ContainerActionSlotContract,
  PrimitiveDensityMode,
} from "@/ui/contracts/primitives";
import { cn } from "@/utils/cn";
import { CONTAINER_CARD_DENSITY_CLASS_MAP } from "../tokens";

interface ContainerHeaderProps {
  cardTestId: string;
  title: string;
  subtitle?: string;
  actionSlots: ContainerActionSlotContract[];
  density: PrimitiveDensityMode;
  isDisabled: boolean;
}

export default function ContainerHeader({
  cardTestId,
  title,
  subtitle,
  actionSlots,
  density,
  isDisabled,
}: ContainerHeaderProps) {
  const densityClasses = CONTAINER_CARD_DENSITY_CLASS_MAP[density];

  return (
    <View className={cn("flex-row items-start justify-between", densityClasses.header)}>
      <View className="flex-1">
        <Text className={densityClasses.title}>{title}</Text>
        {subtitle ? (
          <Text className={densityClasses.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {actionSlots.length > 0 ? (
        <View className="ml-3 flex-row flex-wrap justify-end gap-2">
          {actionSlots.map((actionSlot) => {
            const disabled = isDisabled || actionSlot.isDisabled;

            return (
              <Pressable
                key={actionSlot.actionId}
                testID={`${cardTestId}__action__${actionSlot.actionId}`}
                accessibilityRole="button"
                accessibilityLabel={actionSlot.accessibilityLabel ?? actionSlot.label}
                accessibilityState={{ disabled }}
                disabled={disabled}
                className={cn(
                  "items-center justify-center border border-slate-300 bg-slate-100",
                  densityClasses.actionSlot,
                  disabled ? "opacity-60" : "bg-white",
                )}
              >
                <Text
                  className={cn(
                    "font-semibold text-slate-800",
                    density === "expanded" ? "text-sm" : "text-xs",
                  )}
                >
                  {actionSlot.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
