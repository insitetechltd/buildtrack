export type PrimitiveDensityMode = "compact" | "standard" | "expanded";

export type PrimitiveStructuralState =
  | "loading"
  | "empty"
  | "stale"
  | "disabled";

export type PrimitiveFamily = "input" | "status" | "container";

export interface PrimitiveStateFlags {
  isLoading: boolean;
  isEmpty: boolean;
  isStale: boolean;
  isDisabled: boolean;
}

export interface PrimitiveBaseContract extends PrimitiveStateFlags {
  primitiveId: string;
  family: PrimitiveFamily;
  density: PrimitiveDensityMode;
  structuralState: PrimitiveStructuralState;
  accessibilityLabel: string;
  accessibilityHint?: string;
  analyticsId?: string;
  testId?: string;
}

export type InputValidationStatus = "valid" | "invalid" | "warning" | "none";

export type InputValidationSeverity = "none" | "info" | "warning" | "error";

export interface InputValidationContract {
  status: InputValidationStatus;
  severity: InputValidationSeverity;
  message?: string;
}

export interface InputInteractionContract {
  isDisabled: boolean;
  isReadOnly: boolean;
  isRequired: boolean;
}

export interface InputPrimitiveContentContract {
  value: string;
  placeholder?: string;
  prefixText?: string;
  suffixText?: string;
}

export interface InputPrimitiveContract extends PrimitiveBaseContract {
  family: "input";
  label: string;
  helperText?: string;
  validation: InputValidationContract;
  interaction: InputInteractionContract;
  content: InputPrimitiveContentContract;
}

export type StatusPrimitiveCategory =
  | "task"
  | "project"
  | "workspace"
  | "validation"
  | "network"
  | "custom";

export type StatusPrimitiveEmphasis = "subtle" | "standard" | "strong";

export type StatusSemanticToken =
  | "task_new"
  | "task_accepted"
  | "task_in_progress"
  | "task_submitted_for_review"
  | "task_approved"
  | "task_rejected"
  | "task_cancelled"
  | "project_planning"
  | "project_active"
  | "project_on_hold"
  | "project_completed"
  | "project_cancelled"
  | "workspace_stale"
  | "workspace_syncing"
  | "workspace_empty"
  | "validation_warning"
  | "validation_error"
  | "custom";

export interface StatusPrimitiveContract extends PrimitiveBaseContract {
  family: "status";
  semanticToken: StatusSemanticToken;
  category: StatusPrimitiveCategory;
  emphasis: StatusPrimitiveEmphasis;
  label: string;
  icon?: string;
  tooltip?: string;
}

export interface ContainerActionSlotContract {
  actionId: string;
  label: string;
  icon?: string;
  isDisabled: boolean;
  accessibilityLabel?: string;
}

export interface ContainerMetadataRowContract {
  rowId: string;
  label: string;
  value: string;
  semanticToken?: StatusSemanticToken;
}

export interface ContainerChromeContract {
  title: string;
  subtitle?: string;
  metadataRows: ContainerMetadataRowContract[];
  actionSlots: ContainerActionSlotContract[];
}

export interface ContainerEmptyStateContract {
  title: string;
  message: string;
  actionLabel?: string;
}

export interface ContainerSkeletonContract {
  rowCount: number;
  metadataColumnCount: number;
  hasMediaPlaceholder: boolean;
}

export interface ContainerBodyStateContract {
  empty?: ContainerEmptyStateContract;
  skeleton?: ContainerSkeletonContract;
}

export interface ContainerPrimitiveContract extends PrimitiveBaseContract {
  family: "container";
  chrome: ContainerChromeContract;
  body: ContainerBodyStateContract;
  indentationLevel?: number;
  onPress?: () => void;
}
