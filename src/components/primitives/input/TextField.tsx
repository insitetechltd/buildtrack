import React from "react";
import { TextInput, View } from "react-native";
import type { InputPrimitiveContract } from "@/ui/contracts/primitives";
import { cn } from "@/utils/cn";
import {
  INPUT_DENSITY_CLASS_MAP,
  INPUT_STRUCTURAL_STATE_CLASS_MAP,
  INPUT_VALIDATION_CLASS_MAP,
  resolveInputStructuralState,
} from "../tokens";
import InputAffixRow from "./InputAffixRow";
import InputHelperText from "./InputHelperText";
import InputLabel from "./InputLabel";

interface TextFieldProps {
  contract: InputPrimitiveContract;
  className?: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

function resolveHelperText(contract: InputPrimitiveContract): string {
  const validationMessage = contract.validation.message?.trim();
  if (contract.validation.severity !== "none" && validationMessage) {
    return validationMessage;
  }

  return contract.helperText?.trim() ?? "";
}

export default function TextField({
  contract,
  className,
  onChangeText,
  onFocus,
  onBlur,
}: TextFieldProps) {
  const structuralState = resolveInputStructuralState(contract);
  const densityClasses = INPUT_DENSITY_CLASS_MAP[contract.density];
  const stateClasses = INPUT_STRUCTURAL_STATE_CLASS_MAP[structuralState];
  const validationClasses = INPUT_VALIDATION_CLASS_MAP[contract.validation.severity];
  const resolvedTestId = contract.testId ?? contract.primitiveId;

  const helperText = resolveHelperText(contract);
  const isDisabled = structuralState === "disabled" || contract.interaction.isDisabled;
  const isReadOnly = contract.interaction.isReadOnly;
  const isLoading = structuralState === "loading";
  const editable = !(isDisabled || isReadOnly || isLoading);

  return (
    <View
      testID={resolvedTestId}
      className={cn("w-full", densityClasses.field, stateClasses.field, className)}
    >
      <InputLabel
        label={contract.label}
        density={contract.density}
        isRequired={contract.interaction.isRequired}
        className={stateClasses.label}
      />

      <InputAffixRow
        density={contract.density}
        prefixText={contract.content.prefixText}
        suffixText={contract.content.suffixText}
      />

      <View
        testID={`${resolvedTestId}__input-container`}
        className={cn(
          "border",
          densityClasses.inputContainer,
          stateClasses.inputContainer,
          validationClasses.inputContainer,
          isReadOnly && !isDisabled ? "bg-slate-50" : "",
        )}
      >
        <TextInput
          testID={`${resolvedTestId}__input`}
          value={contract.content.value}
          placeholder={contract.content.placeholder}
          editable={editable}
          accessibilityLabel={contract.accessibilityLabel}
          accessibilityHint={contract.accessibilityHint}
          className={cn("w-full", densityClasses.inputText, stateClasses.inputText)}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </View>

      <View
        testID={`${resolvedTestId}__helper-slot`}
        className={cn(densityClasses.helperSlot)}
      >
        <InputHelperText
          density={contract.density}
          text={helperText}
          className={cn(validationClasses.helperText)}
        />
      </View>
    </View>
  );
}

