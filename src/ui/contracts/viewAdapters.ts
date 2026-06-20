import type {
  NavigationScreenReadiness,
  ScreenContinuityContract,
} from "./navigationBridge";
import type {
  PrimitiveDensityMode,
  PrimitiveStructuralState,
  StatusSemanticToken,
} from "./primitives";
import type { Language } from "@/state/languageStore";
import type { Project, ProjectStatus } from "@/types/buildtrack";
import type { ResponsibilityToken } from "@/utils/accountabilityEngine";

export interface PrimitiveReadyItemBase {
  id: string;
  density: PrimitiveDensityMode;
  structuralState: PrimitiveStructuralState;
}

export interface DashboardProjectSummaryItem extends PrimitiveReadyItemBase {
  id: string;
  projectId: string;
  title: string;
  subtitle?: string;
  statusToken: StatusSemanticToken;
  statusLabel: string;
  openTaskCount: number;
  overdueTaskCount: number;
}

export interface DashboardHighlightedTaskItem extends PrimitiveReadyItemBase {
  id: string;
  taskId: string;
  title: string;
  statusToken: StatusSemanticToken;
  statusLabel: string;
  responsibilityToken: ResponsibilityToken;
  priorityLabel: string;
  projectName: string;
  assigneeSummary: string;
}

export interface DashboardQuickActionItem extends PrimitiveReadyItemBase {
  id: string;
  actionId: string;
  label: string;
  icon?: string;
  isDisabled: boolean;
}

export interface DashboardScalarMetrics {
  openTaskCount: number;
  overdueTaskCount: number;
  projectCount: number;
  hasSelectedProject: boolean;
  actionRequiredCount: number;
  inProgressSentCount: number;
  awaitingApprovalCount: number;
  actionRequiredOverdueCount: number;
  inProgressSentOverdueCount: number;
  awaitingApprovalOverdueCount: number;
  
  // Legacy 6 buckets support
  inboxNewCount: number;
  inboxNewOverdueCount: number;
  inboxWipCount: number;
  inboxWipOverdueCount: number;
  inboxReviewingCount: number;
  inboxReviewingOverdueCount: number;
  outboxNewCount: number;
  outboxNewOverdueCount: number;
  outboxWipCount: number;
  outboxWipOverdueCount: number;
  outboxReviewingCount: number;
  outboxReviewingOverdueCount: number;
}

export interface DashboardScreenViewAdapterOutput {
  screenId: "DashboardScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  projectSummaryItems: DashboardProjectSummaryItem[];
  highlightedTaskItems: DashboardHighlightedTaskItem[];
  quickActionItems: DashboardQuickActionItem[];
  scalarMetrics: DashboardScalarMetrics;
}

export interface TasksFilterSummary {
  selectedProjectId: string | null;
  sectionFilterLabel: string;
  statusFilterLabel: string;
  sortLabel: string;
}

export interface TasksScreenRowItem extends PrimitiveReadyItemBase {
  id: string;
  taskId: string;
  title: string;
  statusToken: StatusSemanticToken;
  statusLabel: string;
  responsibilityToken: ResponsibilityToken;
  priorityLabel: string;
  dueDateLabel?: string;
  assigneeSummary: string;
  projectName: string;
  isOverdue: boolean;
  indentationLevel?: number;
  onPress?: () => void;
}

export interface TasksScalarMetrics {
  totalVisibleTaskCount: number;
  overdueVisibleTaskCount: number;
  selectedProjectTaskCount: number;
  hasActiveFilters: boolean;
}

export interface TasksScreenViewAdapterOutput {
  screenId: "TasksScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  filterSummary: TasksFilterSummary;
  taskRowItems: TasksScreenRowItem[];
  scalarMetrics: TasksScalarMetrics;
}

export interface TaskDetailHeaderModel {
  taskId: string;
  title: string;
  statusLabel: string;
  projectName: string;
  assigneeSummary: string;
}

export interface TaskDetailSectionRow {
  id: string;
  label: string;
  value: string;
  statusToken?: StatusSemanticToken;
}

export interface TaskDetailSectionModel extends PrimitiveReadyItemBase {
  id: string;
  title: string;
  rows: TaskDetailSectionRow[];
}

export interface TaskDetailActionItem extends PrimitiveReadyItemBase {
  id: string;
  actionId: string;
  label: string;
  icon?: string;
  isDisabled: boolean;
}

export interface TaskDetailBannerModel extends PrimitiveReadyItemBase {
  id: string;
  type: 'submitted_for_review' | 'review_required' | 'approved' | 'declined' | 'rejected';
  title: string;
  subtitle?: string;
  iconName: string;
  colorScheme: 'amber' | 'green' | 'red';
}

export interface TaskDetailActivityModel extends PrimitiveReadyItemBase {
  id: string;
  userId: string;
  userName: string;
  activityType: string;
  timestamp: string;
  description: string;
  reason?: string;
  completionPercentage?: number;
  statusToken?: StatusSemanticToken;
  statusLabel?: string;
  photos: string[];
}

export interface TaskDetailAssigneeModel {
  id: string;
  name: string;
  phone?: string;
  isCurrentUser: boolean;
}

export interface TaskDetailScalarMetrics {
  attachmentCount: number;
  updateCount: number;
  childTaskCount: number;
  completionPercentage: number;
}

export interface TaskDetailScreenViewAdapterOutput {
  screenId: "TaskDetailScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  header: TaskDetailHeaderModel;
  detailSections: TaskDetailSectionModel[];
  actionItems: TaskDetailActionItem[];
  scalarMetrics: TaskDetailScalarMetrics;
  banners: TaskDetailBannerModel[];
  activities: TaskDetailActivityModel[];
  assigners: TaskDetailAssigneeModel[];
  assignees: TaskDetailAssigneeModel[];
  childTasks: TasksScreenRowItem[];
}

export interface UpdateProgressPhotoModel extends PrimitiveReadyItemBase {
  id: string;
  uri: string;
  isUploaded: boolean;
  isFailed: boolean;
  errorMessage?: string;
  onRemove: () => void;
  onRetry?: () => void;
}

export interface UpdateProgressFormModel {
  description: string;
  completionPercentage: number;
  previousPercentage: number;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface UpdateProgressScreenViewAdapterOutput {
  screenId: "UpdateProgressScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  form: UpdateProgressFormModel;
  photos: UpdateProgressPhotoModel[];
  scalarMetrics: {
    totalPhotos: number;
    failedPhotos: number;
  };
}

export interface SelectablePhotoModel extends PrimitiveReadyItemBase {
  id: string;
  uri: string;
  annotatedUri?: string;
  fileName: string;
  isAnnotated: boolean;
}

export interface PhotoSelectionScreenViewAdapterOutput {
  screenId: "PhotoSelectionScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  photos: SelectablePhotoModel[];
  enlargedPhotoIndex: number | null;
  isUploading: boolean;
  isAnnotating: boolean;
}

export interface PhotoAnnotationScreenViewAdapterOutput {
  screenId: "PhotoAnnotationScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  isLoading: boolean;
}

export interface ProjectPickerListItem extends PrimitiveReadyItemBase {
  id: string;
  projectId: string;
  title: string;
  description: string;
  statusLabel: string;
  isSelected: boolean;
}

export interface ProjectPickerScreenViewAdapterOutput {
  screenId: "ProjectPickerScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  projectItems: ProjectPickerListItem[];
  selectedProjectId: string | null;
  isProjectSwitching: boolean;
  allowBack: boolean;
}

export interface ProjectsScreenProjectItem extends PrimitiveReadyItemBase {
  id: string;
  projectId: string;
  title: string;
  description: string;
  statusValue: ProjectStatus;
  statusLabel: string;
  locationLabel: string;
  memberCountLabel: string;
  clientName: string;
  startDateLabel: string;
  createdByLabel: string;
  leadPmName?: string;
  budgetLabel?: string;
  canEdit: boolean;
}

export interface ProjectsScreenFilterOption {
  id: string;
  value: ProjectStatus | "all";
  label: string;
  isSelected: boolean;
}

export interface ProjectsScreenEmptyStateModel {
  title: string;
  message: string;
  showCreateAction: boolean;
}

export interface ProjectsScreenViewAdapterOutput {
  screenId: "ProjectsScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  searchQuery: string;
  statusFilter: ProjectStatus | "all";
  projectCountLabel: string;
  isRefreshing: boolean;
  isAdmin: boolean;
  projectItems: ProjectsScreenProjectItem[];
  filterOptions: ProjectsScreenFilterOption[];
  emptyState: ProjectsScreenEmptyStateModel;
  editingProject: Project | null;
  isEditModalVisible: boolean;
}

export interface AddCommentPhotoAttachment extends PrimitiveReadyItemBase {
  id: string;
  uri: string;
  onRemove: () => void;
}

export interface AddCommentFormModel {
  description: string;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface AddCommentScreenViewAdapterOutput {
  screenId: "AddCommentScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  commentForm: AddCommentFormModel;
  photoAttachments: AddCommentPhotoAttachment[];
}

export interface RejectTaskPhotoAttachment extends PrimitiveReadyItemBase {
  id: string;
  uri: string;
  onRemove: () => void;
}

export interface RejectTaskFormModel {
  reason: string;
  isSubmitting: boolean;
  isValid: boolean;
  isViewingSubTask: boolean;
}

export interface RejectTaskScreenViewAdapterOutput {
  screenId: "RejectTaskScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  rejectForm: RejectTaskFormModel;
  photoAttachments: RejectTaskPhotoAttachment[];
}

export interface ReassignTaskAssigneeItem extends PrimitiveReadyItemBase {
  id: string;
  userId: string;
  name: string;
  roleLabel: string;
  email?: string;
  isSelected: boolean;
  isFavorite: boolean;
}

export interface ReassignTaskScreenViewAdapterOutput {
  screenId: "ReassignTaskScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  searchQuery: string;
  selectedUserIds: string[];
  assigneeItems: ReassignTaskAssigneeItem[];
}

export interface ProfileScreenMenuItem extends PrimitiveReadyItemBase {
  id: string;
  actionId: string;
  title: string;
  icon: string;
  showChevron: boolean;
  colorTone: "default" | "danger";
  rightText?: string;
  badge?: number;
}

export interface ProfileScreenSectionModel {
  id: string;
  title: string;
  items: ProfileScreenMenuItem[];
}

export interface ProfileCardModel {
  initial: string;
  name: string;
  roleLabel: string;
  email: string;
  phone?: string;
}

export interface ProfileLanguageOptionModel {
  id: string;
  language: Language;
  title: string;
  subtitle: string;
  isSelected: boolean;
}

export interface ProfileLanguagePickerModel {
  visible: boolean;
  selectedLanguage: Language;
  options: ProfileLanguageOptionModel[];
}

export interface ProfilePasswordChangeModel {
  visible: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface ProfileSystemStatusItem {
  id: string;
  label: string;
  value: string;
  indicatorColor: string;
  valueTone: "default" | "positive" | "negative" | "warning";
}

export interface ProfileScreenViewAdapterOutput {
  screenId: "ProfileScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  profileCard: ProfileCardModel;
  sections: ProfileScreenSectionModel[];
  languagePicker: ProfileLanguagePickerModel;
  passwordChange: ProfilePasswordChangeModel;
  systemStatusItems: ProfileSystemStatusItem[];
}

export interface CreateTaskFormModel {
  title: string;
  description: string;
  taskReference: string;
  billingStatus: string;
  priority: string;
  category: string;
  dueDate: Date;
  assignedTo: string[];
  projectId: string;
  attachments: any[]; // Or Attachment type
}

export interface CreateTaskScreenViewAdapterOutput {
  readiness: {
    isSubmitting: boolean;
    isLoadingUsers: boolean;
    isUploading: boolean;
  };
  formData: CreateTaskFormModel;
  errors: Record<string, string>;
  pickers: {
    showDatePicker: boolean;
    showUserPicker: boolean;
    showPriorityPicker: boolean;
    showCategoryPicker: boolean;
    showBillingStatusPicker: boolean;
    showProjectPicker: boolean;
  };
  aiAssistant: {
    textInput: string;
    showSuggestionPreview: boolean;
    acceptedFields: Set<string>;
    isProcessing: boolean;
  };
}
