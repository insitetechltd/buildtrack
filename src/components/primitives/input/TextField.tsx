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
  INPUT_DENSITY_FONT_SIZE,
  INPUT_DENSITY_INPUT_MIN_HEIGHT,
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
  textContentType?: TextInputProps["textContentType"];
  passwordRules?: TextInputProps["passwordRules"];
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
  textContentType,
  passwordRules,
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
  // When inputTestId equals the public testId, avoid `${testId}__field` wrappers that
  // unanchored Maestro `id: testId` selectors can match instead of the TextInput.
  const resolvedFieldTestId =
    fieldTestId ??
    (inputTestId
      ? inputTestId === resolvedTestId
        ? `${resolvedTestId}--field`
        : `${resolvedTestId}__field`
      : resolvedTestId);
  const resolvedInputTestId = inputTestId ?? `${resolvedTestId}__input`;

  const helperText = resolveHelperText(contract);
  const isDisabled = structuralState === "disabled" || contract.interaction.isDisabled;
  const isReadOnly = contract.interaction.isReadOnly;
  const isLoading = structuralState === "loading";
  const editable = !(isDisabled || isReadOnly || isLoading);
  const hasLabel = (contract.label ?? "").trim().length > 0;
  const hasAffixes = Boolean(contract.content.prefixText || contract.content.suffixText);
  const shouldRenderLabel = !collapseEmptyChrome || hasLabel;
  // Affix row is a no-op when empty — skip mounting it entirely.
  const shouldRenderAffixRow = hasAffixes;
  // collapseEmptyChrome: omit empty helper chrome (Login — keeps Sign In above keyboard).
  // Default: keep helper slot for stable form layout when validation appears.
  const shouldRenderHelperSlot = collapseEmptyChrome
    ? helperText.length > 0
    : true;

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
        {/*
          Padding/min-height live on this container. Without stretching the TextInput,
          taps on empty chrome miss the input (feels “dead”). pointerEvents box-none on
          the row lets touches fall through to the TextInput hit target.
        */}
        <View
          pointerEvents="box-none"
          className={cn(
            "flex-row",
            multiline ? "items-start" : "items-center",
            "min-h-[inherit] w-full",
          )}
        >
          {leftSlot ? (
            <View
              testID={`${resolvedFieldTestId}__left-slot`}
              className="mr-2"
              pointerEvents="box-none"
            >
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
              "min-w-0 flex-1 self-stretch",
              densityClasses.inputText,
              stateClasses.inputText,
              inputClassName,
            )}
            style={{
              flex: 1,
              minWidth: 0,
              // Single-line only: stretch hit target to density min-height.
              // Multiline must grow with content (Create Task Description).
              ...(multiline
                ? {}
                : { minHeight: INPUT_DENSITY_INPUT_MIN_HEIGHT[contract.density] }),
              // Pin native fontSize — iOS TextInput often ignores NativeWind text-* classes.
              fontSize: INPUT_DENSITY_FONT_SIZE[contract.density],
              lineHeight: INPUT_DENSITY_FONT_SIZE[contract.density] + 6,
            }}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyPress={onKeyPress}
            onSubmitEditing={onSubmitEditing}
            secureTextEntry={secureTextEntry}
            multiline={multiline}
            numberOfLines={numberOfLines}
            textAlignVertical={textAlignVertical ?? (multiline ? "top" : "center")}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
            autoCorrect={autoCorrect}
            spellCheck={spellCheck}
            textContentType={textContentType}
            passwordRules={passwordRules}
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
