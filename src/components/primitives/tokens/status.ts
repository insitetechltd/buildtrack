import type {
  StatusPrimitiveCategory,
  StatusPrimitiveEmphasis,
  StatusSemanticToken,
} from "@/ui/contracts/primitives";

export interface StatusToneClassSet {
  container: string;
  label: string;
  icon: string;
}

type StatusToneScale = Record<StatusPrimitiveEmphasis, StatusToneClassSet>;
type StatusToneName =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "review";

function buildToneScale(
  subtle: StatusToneClassSet,
  standard: StatusToneClassSet,
  strong: StatusToneClassSet,
): StatusToneScale {
  return {
    subtle,
    standard,
    strong,
  };
}

const STATUS_TONE_SCALE_MAP: Record<StatusToneName, StatusToneScale> = {
  neutral: buildToneScale(
    {
      container: "bg-slate-50 border-slate-200",
      label: "text-slate-700",
      icon: "text-slate-600",
    },
    {
      container: "bg-slate-100 border-slate-300",
      label: "text-slate-800",
      icon: "text-slate-700",
    },
    {
      container: "bg-slate-700 border-slate-800",
      label: "text-white",
      icon: "text-white",
    },
  ),
  info: buildToneScale(
    {
      container: "bg-blue-50 border-blue-200",
      label: "text-blue-700",
      icon: "text-blue-600",
    },
    {
      container: "bg-blue-100 border-blue-300",
      label: "text-blue-800",
      icon: "text-blue-700",
    },
    {
      container: "bg-blue-600 border-blue-700",
      label: "text-white",
      icon: "text-white",
    },
  ),
  success: buildToneScale(
    {
      container: "bg-green-50 border-green-200",
      label: "text-green-700",
      icon: "text-green-600",
    },
    {
      container: "bg-green-100 border-green-300",
      label: "text-green-800",
      icon: "text-green-700",
    },
    {
      container: "bg-green-600 border-green-700",
      label: "text-white",
      icon: "text-white",
    },
  ),
  warning: buildToneScale(
    {
      container: "bg-amber-50 border-amber-200",
      label: "text-amber-700",
      icon: "text-amber-600",
    },
    {
      container: "bg-amber-100 border-amber-300",
      label: "text-amber-800",
      icon: "text-amber-700",
    },
    {
      container: "bg-amber-500 border-amber-600",
      label: "text-slate-950",
      icon: "text-slate-950",
    },
  ),
  danger: buildToneScale(
    {
      container: "bg-red-50 border-red-200",
      label: "text-red-700",
      icon: "text-red-600",
    },
    {
      container: "bg-red-100 border-red-300",
      label: "text-red-800",
      icon: "text-red-700",
    },
    {
      container: "bg-red-600 border-red-700",
      label: "text-white",
      icon: "text-white",
    },
  ),
  review: buildToneScale(
    {
      container: "bg-violet-50 border-violet-200",
      label: "text-violet-700",
      icon: "text-violet-600",
    },
    {
      container: "bg-violet-100 border-violet-300",
      label: "text-violet-800",
      icon: "text-violet-700",
    },
    {
      container: "bg-violet-600 border-violet-700",
      label: "text-white",
      icon: "text-white",
    },
  ),
};

const STATUS_SEMANTIC_TONE_NAME_MAP: Record<StatusSemanticToken, StatusToneName> = {
  task_new: "warning",
  task_accepted: "info",
  task_in_progress: "info",
  task_submitted_for_review: "review",
  task_approved: "success",
  task_rejected: "danger",
  task_cancelled: "danger",
  project_planning: "warning",
  project_active: "info",
  project_on_hold: "warning",
  project_completed: "success",
  project_cancelled: "danger",
  workspace_stale: "warning",
  workspace_syncing: "info",
  workspace_empty: "neutral",
  validation_warning: "warning",
  validation_error: "danger",
  custom: "neutral",
};

const STATUS_CATEGORY_TONE_NAME_MAP: Record<StatusPrimitiveCategory, StatusToneName> = {
  task: "info",
  project: "info",
  workspace: "neutral",
  validation: "warning",
  network: "info",
  custom: "neutral",
};

export const STATUS_SEMANTIC_TONE_MAP: Record<
  StatusSemanticToken,
  StatusToneScale
> = {
  task_new: STATUS_TONE_SCALE_MAP.warning,
  task_accepted: STATUS_TONE_SCALE_MAP.info,
  task_in_progress: STATUS_TONE_SCALE_MAP.info,
  task_submitted_for_review: STATUS_TONE_SCALE_MAP.review,
  task_approved: STATUS_TONE_SCALE_MAP.success,
  task_rejected: STATUS_TONE_SCALE_MAP.danger,
  task_cancelled: STATUS_TONE_SCALE_MAP.danger,
  project_planning: STATUS_TONE_SCALE_MAP.warning,
  project_active: STATUS_TONE_SCALE_MAP.info,
  project_on_hold: STATUS_TONE_SCALE_MAP.warning,
  project_completed: STATUS_TONE_SCALE_MAP.success,
  project_cancelled: STATUS_TONE_SCALE_MAP.danger,
  workspace_stale: STATUS_TONE_SCALE_MAP.warning,
  workspace_syncing: STATUS_TONE_SCALE_MAP.info,
  workspace_empty: STATUS_TONE_SCALE_MAP.neutral,
  validation_warning: STATUS_TONE_SCALE_MAP.warning,
  validation_error: STATUS_TONE_SCALE_MAP.danger,
  custom: STATUS_TONE_SCALE_MAP.neutral,
};

export function getStatusToneClassSet(
  semanticToken: StatusSemanticToken,
  category: StatusPrimitiveCategory,
  emphasis: StatusPrimitiveEmphasis,
): StatusToneClassSet {
  const toneName =
    semanticToken === "custom"
      ? STATUS_CATEGORY_TONE_NAME_MAP[category]
      : STATUS_SEMANTIC_TONE_NAME_MAP[semanticToken];

  return STATUS_TONE_SCALE_MAP[toneName][emphasis];
}
