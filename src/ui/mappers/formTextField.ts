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
  const isEmpty = input.value.trim().length === 0;
  const primitiveId = `form:input:${input.id}`;
  // Do NOT mark normal editable fields as stale — that forces amber "stale" chrome
  // (and was applied to every Login/CreateTask field after C2).
  const structuralState: InputPrimitiveContract["structuralState"] = isDisabled
    ? "disabled"
    : "empty";

  return {
    primitiveId,
    family: "input",
    density: input.density ?? "expanded",
    structuralState,
    accessibilityLabel: input.label,
    accessibilityHint: `Input ${input.label}`,
    analyticsId: primitiveId,
    testId: input.testId ?? primitiveId,
    isLoading: false,
    isEmpty,
    isStale: false,
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
