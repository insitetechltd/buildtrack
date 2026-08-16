import type { InputPrimitiveContract } from "@/ui/contracts/primitives";

export type FormTextFieldBuildInput = Readonly<{
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  density?: InputPrimitiveContract["density"];
  testId?: string;
  disabled?: boolean;
}>;

/** Shared InputPrimitiveContract builder for form TextField adoption (S-UX-01Q C2). */
export function buildFormTextFieldContract(
  input: FormTextFieldBuildInput,
): InputPrimitiveContract {
  const isDisabled = Boolean(input.disabled);
  const hasError = Boolean(input.error?.trim());
  const primitiveId = `form:input:${input.id}`;

  return {
    primitiveId,
    family: "input",
    density: input.density ?? "standard",
    structuralState: isDisabled ? "disabled" : "stale",
    accessibilityLabel: input.label,
    accessibilityHint: `Input ${input.label}`,
    analyticsId: primitiveId,
    testId: input.testId ?? primitiveId,
    isLoading: false,
    isEmpty: input.value.trim().length === 0,
    isStale: !isDisabled,
    isDisabled,
    label: input.label,
    helperText: undefined,
    validation: hasError
      ? {
          status: "invalid",
          severity: "error",
          message: input.error,
        }
      : {
          status: "none",
          severity: "none",
        },
    interaction: {
      isDisabled,
      isReadOnly: false,
      isRequired: Boolean(input.required),
    },
    content: {
      value: input.value,
      placeholder: input.placeholder,
    },
  };
}
