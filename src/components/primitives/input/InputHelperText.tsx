import React from "react";
import { Text, View } from "react-native";
import type { PrimitiveDensityMode } from "@/ui/contracts/primitives";
import { cn } from "@/utils/cn";
import { INPUT_DENSITY_CLASS_MAP } from "../tokens";

interface InputHelperTextProps {
  density: PrimitiveDensityMode;
  text?: string;
  className?: string;
}

export default function InputHelperText({
  density,
  text,
  className,
}: InputHelperTextProps) {
  const densityClasses = INPUT_DENSITY_CLASS_MAP[density];

  return (
    <View className={cn(densityClasses.helperSlot, className)}>
      <Text className={densityClasses.helperText}>{text ?? ""}</Text>
    </View>
  );
}

