import type { PrimitiveDensityMode } from "@/ui/contracts/primitives";

export interface StatusBadgeDensityClassSet {
  container: string;
  label: string;
  icon: string;
  content: string;
}

export const STATUS_BADGE_DENSITY_CLASS_MAP: Record<
  PrimitiveDensityMode,
  StatusBadgeDensityClassSet
> = {
  compact: {
    container: "min-h-5 px-2 py-0.5 rounded-md",
    label: "text-[10px] leading-4 font-semibold tracking-wide",
    icon: "text-[10px] leading-4",
    content: "gap-1",
  },
  standard: {
    container: "min-h-6 px-2.5 py-1 rounded-md",
    label: "text-xs leading-4 font-semibold",
    icon: "text-xs leading-4",
    content: "gap-1",
  },
  expanded: {
    container: "min-h-7 px-3 py-1.5 rounded-lg",
    label: "text-sm leading-5 font-semibold",
    icon: "text-sm leading-5",
    content: "gap-1.5",
  },
};
