import type {
  PrimitiveStructuralState,
  StatusPrimitiveContract,
} from "@/ui/contracts/primitives";

export interface StatusBadgeStructuralStateClassSet {
  container: string;
  label: string;
  icon: string;
}

export const STATUS_BADGE_STRUCTURAL_STATE_CLASS_MAP: Record<
  PrimitiveStructuralState,
  StatusBadgeStructuralStateClassSet
> = {
  loading: {
    container: "bg-slate-200 border-slate-300",
    label: "text-slate-600",
    icon: "text-slate-500",
  },
  empty: {
    container: "bg-slate-100 border-slate-300",
    label: "text-slate-700",
    icon: "text-slate-600",
  },
  stale: {
    container: "ring-1 ring-inset ring-amber-400/70",
    label: "",
    icon: "",
  },
  disabled: {
    container: "opacity-60",
    label: "text-slate-900",
    icon: "text-slate-700",
  },
};

export function resolveStatusStructuralState(
  contract: Pick<
    StatusPrimitiveContract,
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
