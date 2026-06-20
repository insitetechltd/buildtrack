import React from "react";
import { Text, View } from "react-native";
import type { PrimitiveDensityMode } from "@/ui/contracts/primitives";
import { cn } from "@/utils/cn";
import { INPUT_DENSITY_CLASS_MAP } from "../tokens";

interface InputLabelProps {
  label: string;
  density: PrimitiveDensityMode;
  isRequired: boolean;
  className?: string;
}

export default function InputLabel({
  label,
  density,
  isRequired,
  className,
}: InputLabelProps) {
  const densityClasses = INPUT_DENSITY_CLASS_MAP[density];

  return (
    <View className={cn("flex-row items-center gap-1", className)}>
      <Text className={densityClasses.label}>{label}</Text>
      {isRequired ? <Text className={densityClasses.requiredMarker}>*</Text> : null}
    </View>
  );
}

