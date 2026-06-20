import React from "react";
import { Text, View } from "react-native";
import type { PrimitiveDensityMode } from "@/ui/contracts/primitives";
import { cn } from "@/utils/cn";
import { INPUT_DENSITY_CLASS_MAP } from "../tokens";

interface InputAffixRowProps {
  density: PrimitiveDensityMode;
  prefixText?: string;
  suffixText?: string;
  className?: string;
}

export default function InputAffixRow({
  density,
  prefixText,
  suffixText,
  className,
}: InputAffixRowProps) {
  const densityClasses = INPUT_DENSITY_CLASS_MAP[density];
  const prefix = prefixText?.trim() ?? "";
  const suffix = suffixText?.trim() ?? "";

  if (!prefix && !suffix) {
    return null;
  }

  return (
    <View className={cn("flex-row items-center justify-between", densityClasses.affixRow, className)}>
      <Text className={densityClasses.affixText}>{prefix}</Text>
      <Text className={densityClasses.affixText}>{suffix}</Text>
    </View>
  );
}

