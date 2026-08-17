import type {
  InputPrimitiveContract,
  InputValidationSeverity,
  PrimitiveDensityMode,
  PrimitiveStructuralState,
} from "@/ui/contracts/primitives";

export interface InputDensityClassSet {
  field: string;
  label: string;
  requiredMarker: string;
  affixRow: string;
  affixText: string;
  inputContainer: string;
  inputText: string;
  helperSlot: string;
  helperText: string;
}

export interface InputValidationClassSet {
  inputContainer: string;
  helperText: string;
}

export interface InputStructuralStateClassSet {
  field: string;
  inputContainer: string;
  inputText: string;
  label: string;
}

export const INPUT_DENSITY_CLASS_MAP: Record<PrimitiveDensityMode, InputDensityClassSet> =
  {
    compact: {
      field: "gap-1.5",
      label: "text-xs leading-4 font-semibold text-slate-900",
      requiredMarker: "text-xs leading-4 font-semibold text-red-600",
      affixRow: "min-h-5",
      affixText: "text-xs leading-4 text-slate-600",
      inputContainer: "min-h-11 rounded-md px-3 py-2",
      inputText: "text-sm leading-5 text-slate-900",
      helperSlot: "min-h-5",
      helperText: "text-xs leading-4 text-slate-600",
    },
    // Form-adjacent / general fields: readable on jobsite (was text-sm / text-base).
    standard: {
      field: "gap-2",
      label: "text-base leading-6 font-semibold text-slate-900",
      requiredMarker: "text-base leading-6 font-semibold text-red-600",
      affixRow: "min-h-5",
      affixText: "text-sm leading-5 text-slate-600",
      inputContainer: "min-h-12 rounded-lg px-3.5 py-2.5",
      inputText: "text-base leading-6 text-slate-900",
      helperSlot: "min-h-5",
      helperText: "text-sm leading-5 text-slate-600",
    },
    // Default for buildFormTextFieldContract — matches Create/Project row values (text-lg).
    expanded: {
      field: "gap-2.5",
      label: "text-lg leading-7 font-semibold text-slate-900",
      requiredMarker: "text-lg leading-7 font-semibold text-red-600",
      affixRow: "min-h-6",
      affixText: "text-base leading-6 text-slate-600",
      inputContainer: "min-h-14 rounded-xl px-4 py-3",
      inputText: "text-lg leading-7 text-slate-900",
      helperSlot: "min-h-6",
      helperText: "text-base leading-6 text-slate-600",
    },
  };

/** Native fontSize fallback — TextInput className font sizes are unreliable on iOS. */
export const INPUT_DENSITY_FONT_SIZE: Record<PrimitiveDensityMode, number> = {
  compact: 14,
  standard: 16,
  expanded: 18,
};

export const INPUT_DENSITY_INPUT_MIN_HEIGHT: Record<PrimitiveDensityMode, number> = {
  compact: 28,
  standard: 32,
  expanded: 40,
};

export const INPUT_VALIDATION_CLASS_MAP: Record<
  InputValidationSeverity,
  InputValidationClassSet
> = {
  none: {
    inputContainer: "border-slate-300",
    helperText: "text-slate-600",
  },
  info: {
    inputContainer: "border-blue-300",
    helperText: "text-blue-700",
  },
  warning: {
    inputContainer: "border-amber-300",
    helperText: "text-amber-700",
  },
  error: {
    inputContainer: "border-red-300",
    helperText: "text-red-700",
  },
};

export const INPUT_STRUCTURAL_STATE_CLASS_MAP: Record<
  PrimitiveStructuralState,
  InputStructuralStateClassSet
> = {
  loading: {
    field: "",
    inputContainer: "bg-slate-200 border-slate-300",
    inputText: "text-slate-500",
    label: "text-slate-700",
  },
  empty: {
    field: "",
    inputContainer: "bg-white border-slate-300",
    inputText: "text-slate-900",
    label: "text-slate-900",
  },
  stale: {
    field: "",
    inputContainer: "bg-white border-slate-300 ring-1 ring-inset ring-amber-400/70",
    inputText: "text-slate-900",
    label: "text-slate-900",
  },
  disabled: {
    field: "opacity-60",
    inputContainer: "bg-slate-100 border-slate-200",
    inputText: "text-slate-700",
    label: "text-slate-700",
  },
};

export function resolveInputStructuralState(
  contract: Pick<
    InputPrimitiveContract,
    "structuralState" | "isLoading" | "isEmpty" | "isStale" | "isDisabled"
  >,
): PrimitiveStructuralState {
  if (contract.isLoading) {
    return "loading";
  }

  if (contract.isEmpty) {
    return "empty";
  }

  if (contract.isStale) {
    return "stale";
  }

  if (contract.isDisabled) {
    return "disabled";
  }

  return contract.structuralState;
}

