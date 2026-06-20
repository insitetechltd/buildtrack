import type {
  ContainerPrimitiveContract,
  PrimitiveDensityMode,
  PrimitiveStructuralState,
} from "@/ui/contracts/primitives";

export interface ContainerCardDensityClassSet {
  shell: string;
  header: string;
  title: string;
  subtitle: string;
  actionSlot: string;
  metadataList: string;
  metadataRow: string;
  metadataLabel: string;
  metadataValue: string;
  body: string;
  bodyText: string;
  skeletonRow: string;
  emptyTitle: string;
  emptyMessage: string;
  emptyAction: string;
}

export interface ContainerCardStructuralStateClassSet {
  shell: string;
  header: string;
  body: string;
}

export const CONTAINER_CARD_DENSITY_CLASS_MAP: Record<
  PrimitiveDensityMode,
  ContainerCardDensityClassSet
> = {
  compact: {
    shell: "min-h-36 rounded-lg p-3 gap-3",
    header: "gap-2",
    title: "text-base leading-5 font-semibold text-slate-900",
    subtitle: "text-xs leading-4 text-slate-600",
    actionSlot: "min-h-8 px-2 py-1 rounded-md text-xs",
    metadataList: "gap-2",
    metadataRow: "min-h-8 gap-2",
    metadataLabel: "text-xs leading-4 font-medium text-slate-600",
    metadataValue: "text-xs leading-4 font-semibold text-slate-900",
    body: "min-h-20 gap-2",
    bodyText: "text-xs leading-4 text-slate-600",
    skeletonRow: "h-4 rounded-md",
    emptyTitle: "text-sm leading-5 font-semibold text-slate-900",
    emptyMessage: "text-xs leading-4 text-slate-600",
    emptyAction: "text-xs leading-4 font-semibold text-blue-700",
  },
  standard: {
    shell: "min-h-44 rounded-xl p-4 gap-4",
    header: "gap-2",
    title: "text-lg leading-6 font-semibold text-slate-900",
    subtitle: "text-sm leading-5 text-slate-600",
    actionSlot: "min-h-9 px-2.5 py-1.5 rounded-md text-xs",
    metadataList: "gap-2.5",
    metadataRow: "min-h-9 gap-2.5",
    metadataLabel: "text-sm leading-5 font-medium text-slate-600",
    metadataValue: "text-sm leading-5 font-semibold text-slate-900",
    body: "min-h-24 gap-3",
    bodyText: "text-sm leading-5 text-slate-600",
    skeletonRow: "h-5 rounded-md",
    emptyTitle: "text-base leading-6 font-semibold text-slate-900",
    emptyMessage: "text-sm leading-5 text-slate-600",
    emptyAction: "text-sm leading-5 font-semibold text-blue-700",
  },
  expanded: {
    shell: "min-h-52 rounded-2xl p-5 gap-5",
    header: "gap-3",
    title: "text-xl leading-7 font-semibold text-slate-900",
    subtitle: "text-base leading-6 text-slate-600",
    actionSlot: "min-h-10 px-3 py-2 rounded-lg text-sm",
    metadataList: "gap-3",
    metadataRow: "min-h-10 gap-3",
    metadataLabel: "text-base leading-6 font-medium text-slate-600",
    metadataValue: "text-base leading-6 font-semibold text-slate-900",
    body: "min-h-28 gap-3",
    bodyText: "text-base leading-6 text-slate-600",
    skeletonRow: "h-6 rounded-md",
    emptyTitle: "text-lg leading-6 font-semibold text-slate-900",
    emptyMessage: "text-base leading-6 text-slate-600",
    emptyAction: "text-base leading-6 font-semibold text-blue-700",
  },
};

export const CONTAINER_CARD_STRUCTURAL_STATE_CLASS_MAP: Record<
  PrimitiveStructuralState,
  ContainerCardStructuralStateClassSet
> = {
  loading: {
    shell: "bg-white border-slate-200",
    header: "",
    body: "",
  },
  empty: {
    shell: "bg-white border-slate-200",
    header: "",
    body: "",
  },
  stale: {
    shell: "bg-white border-slate-200 ring-1 ring-inset ring-amber-400/70",
    header: "",
    body: "",
  },
  disabled: {
    shell: "bg-slate-50 border-slate-200 opacity-60",
    header: "",
    body: "",
  },
};

export function resolveContainerStructuralState(
  contract: Pick<
    ContainerPrimitiveContract,
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
