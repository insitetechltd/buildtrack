import React from "react";
import {
  NativeSyntheticEvent,
  TextInput,
  TextInputKeyPressEventData,
  TextInputProps,
  View,
} from "react-native";
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
  inputClassName?: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  collapseEmptyChrome?: boolean;
  /** Defaults to `${testId}__field` when `inputTestId` is set; otherwise `testId` on the wrapper. */
  fieldTestId?: string;
  /** Prefer this on the TextInput so legacy Maestro/Jest IDs stay stable. */
  inputTestId?: string;
  inputRef?: React.RefObject<TextInput | null>;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyPress?: (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  textAlignVertical?: TextInputProps["textAlignVertical"];
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoComplete?: TextInputProps["autoComplete"];
  autoCorrect?: boolean;
  spellCheck?: boolean;
  returnKeyType?: TextInputProps["returnKeyType"];
  blurOnSubmit?: boolean;
  maxLength?: number;
  accessibilityState?: TextInputProps["accessibilityState"];
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
  inputClassName,
  leftSlot,
  rightSlot,
  collapseEmptyChrome = false,
  fieldTestId,
  inputTestId,
  inputRef,
  onChangeText,
  onFocus,
  onBlur,
  onKeyPress,
  onSubmitEditing,
  secureTextEntry,
  multiline,
  numberOfLines,
  textAlignVertical,
  keyboardType,
  autoCapitalize,
  autoComplete,
  autoCorrect,
  spellCheck,
  returnKeyType,
  blurOnSubmit,
  maxLength,
  accessibilityState,
}: TextFieldProps) {
  const structuralState = resolveInputStructuralState(contract);
  const densityClasses = INPUT_DENSITY_CLASS_MAP[contract.density];
  const stateClasses = INPUT_STRUCTURAL_STATE_CLASS_MAP[structuralState];
  const validationClasses = INPUT_VALIDATION_CLASS_MAP[contract.validation.severity];
  const resolvedTestId = contract.testId ?? contract.primitiveId;
  const resolvedFieldTestId =
    fieldTestId ?? (inputTestId ? `${resolvedTestId}__field` : resolvedTestId);
  const resolvedInputTestId = inputTestId ?? `${resolvedTestId}__input`;

  const helperText = resolveHelperText(contract);
  const isDisabled = structuralState === "disabled" || contract.interaction.isDisabled;
  const isReadOnly = contract.interaction.isReadOnly;
  const isLoading = structuralState === "loading";
  const editable = !(isDisabled || isReadOnly || isLoading);
  const hasLabel = (contract.label ?? "").trim().length > 0;
  const hasAffixes = Boolean(contract.content.prefixText || contract.content.suffixText);
  const shouldRenderLabel = !collapseEmptyChrome || hasLabel;
  const shouldRenderAffixRow = !collapseEmptyChrome || hasAffixes;
  const shouldRenderHelperSlot = !collapseEmptyChrome || helperText.length > 0;

  return (
    <View
      testID={resolvedFieldTestId}
      className={cn("w-full", densityClasses.field, stateClasses.field, className)}
    >
      {shouldRenderLabel ? (
        <InputLabel
          label={contract.label ?? ""}
          density={contract.density}
          isRequired={contract.interaction.isRequired}
          className={stateClasses.label}
        />
      ) : null}

      {shouldRenderAffixRow ? (
        <InputAffixRow
          density={contract.density}
          prefixText={contract.content.prefixText}
          suffixText={contract.content.suffixText}
        />
      ) : null}

      <View
        testID={`${resolvedFieldTestId}__input-container`}
        className={cn(
          "border",
          densityClasses.inputContainer,
          stateClasses.inputContainer,
          validationClasses.inputContainer,
          isReadOnly && !isDisabled ? "bg-slate-50" : "",
          multiline ? "items-start" : "",
        )}
      >
        <View className={cn("flex-row", multiline ? "items-start" : "items-center")}>
          {leftSlot ? (
            <View testID={`${resolvedFieldTestId}__left-slot`} className="mr-2">
              {leftSlot}
            </View>
          ) : null}
          <TextInput
            testID={resolvedInputTestId}
            ref={inputRef}
            value={contract.content.value}
            placeholder={contract.content.placeholder}
            editable={editable}
            accessibilityLabel={contract.accessibilityLabel}
            accessibilityHint={contract.accessibilityHint}
            accessibilityState={accessibilityState}
            className={cn(
              "min-w-0 flex-1",
              densityClasses.inputText,
              stateClasses.inputText,
              inputClassName,
            )}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyPress={onKeyPress}
            onSubmitEditing={onSubmitEditing}
            secureTextEntry={secureTextEntry}
            multiline={multiline}
            numberOfLines={numberOfLines}
            textAlignVertical={textAlignVertical}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
            autoCorrect={autoCorrect}
            spellCheck={spellCheck}
            returnKeyType={returnKeyType}
            blurOnSubmit={blurOnSubmit}
            maxLength={maxLength}
          />
          {rightSlot ? (
            <View testID={`${resolvedFieldTestId}__right-slot`} className="ml-2">
              {rightSlot}
            </View>
          ) : null}
        </View>
      </View>

      {shouldRenderHelperSlot ? (
        <View
          testID={`${resolvedFieldTestId}__helper-slot`}
          className={cn(densityClasses.helperSlot)}
        >
          <InputHelperText
            density={contract.density}
            text={helperText}
            className={cn(validationClasses.helperText)}
          />
        </View>
      ) : null}
    </View>
  );
}
