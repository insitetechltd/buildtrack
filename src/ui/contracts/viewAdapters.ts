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
import type { Project, ProjectRole, ProjectStatus } from "@/types/buildtrack";
import type { ResponsibilityToken } from "@/utils/accountabilityEngine";
import type { TaskSuggestion } from "@/api/task-llm-service";

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

export interface DashboardActivityItem extends PrimitiveReadyItemBase {
  id: string;
  taskId: string;
  title: string;
  subtitle: string;
  timestampLabel: string;
  statusLabel: string;
  previewPhotoUri?: string;
}

export interface DashboardSummaryPill {
  id: string;
  label: string;
  value: string;
}

export interface DashboardProjectSummaryCard {
  title: string;
  todayLabel: string;
  elapsedDayLabel: string;
  weatherIconLabel: string;
  weatherTemperatureLabel: string;
  criticalDates: Array<{
    id: string;
    taskId: string;
    dateLabel: string;
    title: string;
    subtitle: string;
    /** Primary task photo when available (visual-driven critical row). */
    imageUri?: string;
  }>;
}

export interface DashboardQueueDashboardCell {
  id: string;
  queue: "my_queue" | "team_queue";
  bucket: "new" | "wip" | "review";
  title: string;
  countLabel: string;
}

export interface DashboardQueueDashboardGroup {
  id: string;
  title: "My Queue" | "Team Queue";
  cells: DashboardQueueDashboardCell[];
}

export interface DashboardQueueDashboard {
  groups: DashboardQueueDashboardGroup[];
}

export interface DashboardTaskShortcut {
  title: string;
  subtitle: string;
  countLabel: string;
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
  activeProject: {
    id: string;
    title: string;
    subtitle?: string;
  } | null;
  projectSummaryCard?: DashboardProjectSummaryCard | null;
  queueDashboard?: DashboardQueueDashboard;
  summaryPills: DashboardSummaryPill[];
  draftItems: DashboardActivityItem[];
  activityItems: DashboardActivityItem[];
  taskShortcut: DashboardTaskShortcut | null;
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

export type TasksQueueFilterValue = "all_queues" | "inbox" | "outbox" | "archived";

export type TasksStatusFilterValue = "any_status" | "new" | "doing" | "review" | "overdue";

export type TasksOverdueWindowValue = "show_all" | "three_active" | "one_week" | "one_month";

export interface TasksActiveFilterChipModel {
  id: "queue" | "status" | "overdueWindow";
  label: string;
}

export interface TasksFilterButtonModel {
  label: "Filters";
  isActive: boolean;
  activeCount: number;
}

export interface TasksFiltersSheetModel {
  isOpen: boolean;
  stagedQueue: TasksQueueFilterValue;
  stagedStatus: TasksStatusFilterValue;
  stagedOverdueWindow: TasksOverdueWindowValue;
}

export type TasksQueueId = "my_queue" | "team_queue";

export type TasksQueueBucketId = "new" | "wip" | "review" | "overdue";

export type TasksSortField = "created_at" | "due_date" | "modified_at";

export type TasksSortDirection = "asc" | "desc";

export interface TasksQueueBucket {
  id: string;
  title: string;
  taskCountLabel: string;
  bucket: TasksQueueBucketId;
  isOpen: boolean;
  rows: TasksScreenRowItem[];
}

export interface TasksQueuePanel {
  id: string;
  queue: TasksQueueId;
  title: "My Queue" | "Team Queue";
  totalCountLabel: string;
  presentation: "primary" | "preview";
  isExpanded: boolean;
  buckets: TasksQueueBucket[];
}

export interface TasksDraftsSection {
  title: string;
  countLabel: string;
  isExpanded: boolean;
  rows: TasksScreenRowItem[];
}

export interface TasksFilterOptionModel<TValue extends string> {
  id: string;
  value: TValue;
  label: string;
  count: number;
  isSelected: boolean;
}

export interface TasksFilterControlModel<TValue extends string> {
  id: string;
  label: string;
  selectedValue: TValue;
  options: TasksFilterOptionModel<TValue>[];
}

export type TasksFilterOption = TasksFilterOptionModel<
  "all" | TasksQueueId | "new" | "wip" | "review" | "overdue"
>;

export type TasksFilterControl = TasksFilterControlModel<
  "all" | TasksQueueId | "new" | "wip" | "review" | "overdue"
>;

export const CRITICAL_THIS_WEEK_TAG = "critical_this_week";

export interface TasksScreenRowItem extends PrimitiveReadyItemBase {
  id: string;
  taskId: string;
  title: string;
  cardPresentation?: "default" | "thumbnail";
  statusToken: StatusSemanticToken;
  statusLabel: string;
  responsibilityToken: ResponsibilityToken;
  priorityLabel: string;
  dueDateLabel?: string;
  assigneeSummary: string;
  projectName: string;
  isOverdue: boolean;
  attachmentUris: string[];
  indentationLevel?: number;
  queue?: TasksQueueId;
  queueLabel?: "My Queue" | "Team Queue";
  bucket?: TasksQueueBucketId;
  bucketLabel?: string;
  contextLabel?: string;
  latestUpdateAt?: string;
  latestUpdateLabel?: string;
  isExpanded?: boolean;
  supportingLine?: string;
  contextLine?: string;
  primaryPhotoUri?: string;
  photoCountLabel?: string;
  photoDisplayMode?: "standard" | "photo_centric";
  canShowTaskUpdateAction?: boolean;
  canShowArchiveAction?: boolean;
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
  filterButton: TasksFilterButtonModel;
  filterSheet: TasksFiltersSheetModel;
  activeFilterChips: TasksActiveFilterChipModel[];
  resultSummaryLabel?: string;
  filterControls?: {
    mode: TasksFilterControlModel<"all" | "overdue">;
    queue: TasksFilterControlModel<TasksQueueId>;
    status: TasksFilterControlModel<"new" | "wip" | "review">;
  };
  isSearchMode: boolean;
  queuePanels: TasksQueuePanel[];
  draftsSection?: TasksDraftsSection | null;
  searchResults: TasksScreenRowItem[];
  expandedTaskIds: string[];
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

export interface TaskDetailHeroModel extends PrimitiveReadyItemBase {
  title: string;
  statusLabel: string;
  categoryLabel?: string;
  projectLabel: string;
  completionLabel: string;
  dueDateLabel?: string;
  nextStepLabel?: undefined;
  assignedByLabel?: string;
  assignedToLabel?: string;
  primaryOwnerLabel?: string;
  teamSummaryLabel?: string;
  isCritical?: boolean;
  criticalLabel?: string;
}

export interface TaskDetailDelegationSummaryModel extends PrimitiveReadyItemBase {
  assignedByLabel: string;
  assignedToLabel: string;
  primaryOwnerLabel?: string;
  teamSummaryLabel?: string;
}

export interface TaskDetailInfoCardRow {
  id: string;
  label: string;
  value: string;
}

export interface TaskDetailInfoCardModel extends PrimitiveReadyItemBase {
  descriptionLabel?: string;
  siteLocationLabel?: string;
  assignedByLabel?: string;
  assignedToLabel?: string;
  primaryOwnerLabel?: string;
  primaryAssigneeId?: string;
  /** Helper assignees excluding primary (live delegated_user_ids). */
  delegatedUserIds?: string[];
  /** Display names for delegates. */
  delegatedLabels?: string[];
  containerId?: string;
  subContainerId?: string;
  /** Display tags including critical_this_week when present. */
  tagLabels?: string[];
  statusLabel?: string;
  categoryLabel?: string;
  completionLabel?: string;
  dueDateLabel?: string;
  isCritical?: boolean;
  criticalLabel?: string;
  /** True when the signed-in user is in assignedTo / primary / delegates. */
  isAssignedToCurrentUser?: boolean;
  detailRows: TaskDetailInfoCardRow[];
}

export interface TaskDetailEvidenceSummaryModel extends PrimitiveReadyItemBase {
  latestPhotoUrls: string[];
  totalPhotoCount: number;
  emptyLabel: string;
}

export interface TaskDetailActiveStageModel extends PrimitiveReadyItemBase {
  stageMode: "photo" | "no_photo" | "pdf_preview";
  title: string;
  summary: string;
  actorLabel: string;
  timestampLabel: string;
  photos: string[];
  activePhotoIndex?: number;
  documentName?: string;
  documentUri?: string;
}

export interface TaskDetailActivityThreadRow extends PrimitiveReadyItemBase {
  id: string;
  actorLabel: string;
  eventLabel: string;
  timestampLabel: string;
  progressLabel: string;
  detailLabel?: string;
  photoUrls: string[];
  photoAspectRatio?: number;
  statusLabel?: string;
  subtaskBadgeLabel?: string;
  subtaskTitleLabel?: string;
}

export interface TaskDetailSubtaskSummaryModel extends PrimitiveReadyItemBase {
  title: string;
  totalCount: number;
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
  isActive?: boolean;
}

export interface TaskDetailQuickActionRowModel extends PrimitiveReadyItemBase {
  actions: TaskDetailActionItem[];
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
  taskHero: TaskDetailHeroModel;
  delegationSummary: TaskDetailDelegationSummaryModel;
  infoCard?: TaskDetailInfoCardModel;
  quickActions?: TaskDetailQuickActionRowModel;
  activeStage: TaskDetailActiveStageModel;
  evidenceSummary: TaskDetailEvidenceSummaryModel;
  activityThread: TaskDetailActivityThreadRow[];
  subtaskSummary: TaskDetailSubtaskSummaryModel;
  detailSections: TaskDetailSectionModel[];
  actionItems: TaskDetailActionItem[];
  scalarMetrics: TaskDetailScalarMetrics;
  banners: TaskDetailBannerModel[];
  activities: TaskDetailActivityModel[];
  assigners: TaskDetailAssigneeModel[];
  assignees: TaskDetailAssigneeModel[];
  childTasks: TasksScreenRowItem[];
  /** S-UX-01K2: creator + unlocked status may edit primary/delegates. */
  canEditDelegation: boolean;
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
  caption?: string;
}

export type PhotoSelectionSaveIntent = "attach_task" | "project_unattached";

export interface MiniPickerTask {
  id: string;
  title: string;
}

export interface PhotoSelectionScreenViewAdapterOutput {
  screenId: "PhotoSelectionScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  photos: SelectablePhotoModel[];
  enlargedPhotoIndex: number | null;
  isUploading: boolean;
  isAnnotating: boolean;
  saveIntent: PhotoSelectionSaveIntent;
  selectedTaskId: string | null;
  tasksForPicker: MiniPickerTask[];
  isMiniPickerVisible: boolean;
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

export interface LoginScreenValidationErrors {
  emailOrPhone?: string;
  password?: string;
}

export interface LoginScreenViewAdapterOutput {
  screenId: "LoginScreen";
  emailOrPhone: string;
  password: string;
  isPasswordVisible: boolean;
  buildIdentifierLabel: string;
  validationErrors: LoginScreenValidationErrors;
  isLoading: boolean;
}

export type ReportsScreenReportType = "my_tasks" | "assigned_tasks";

export interface ReportsScreenReportTypeOption {
  id: string;
  value: ReportsScreenReportType;
  label: string;
  isSelected: boolean;
  isVisible: boolean;
}

export interface ReportsScreenDateRangeModel {
  from: Date;
  to: Date;
  fromLabel: string;
  toLabel: string;
  isShowingFromPicker: boolean;
  isShowingToPicker: boolean;
}

export interface ReportsStatisticCard extends PrimitiveReadyItemBase {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  textColor: string;
}

export interface ReportsVisibleTaskRow extends PrimitiveReadyItemBase {
  taskId: string;
  title: string;
  statusLabel: string;
  dueDateLabel: string;
  completionLabel: string;
  statusTone: "neutral" | "info" | "success" | "danger";
}

export interface ReportsScreenViewAdapterOutput {
  screenId: "ReportsScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  currentReportType: ReportsScreenReportType;
  reportTypeOptions: ReportsScreenReportTypeOption[];
  dateRange: ReportsScreenDateRangeModel;
  statisticsCards: ReportsStatisticCard[];
  visibleTaskRows: ReportsVisibleTaskRow[];
  totalVisibleTaskCount: number;
  hiddenTaskCount: number;
}

export type AdminDashboardQuickActionId =
  | "projects"
  | "user_management"
  | "company_banner"
  | "dev_admin";

export interface AdminDashboardAccessModel {
  isAllowed: boolean;
  deniedMessage: string | null;
}

export interface AdminDashboardCompanyScopeModel {
  companyName?: string;
  subtitle?: string;
}

export interface AdminDashboardStatCard extends PrimitiveReadyItemBase {
  statId: string;
  label: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  color: string;
  iconColor: string;
  textColor: string;
}

export interface AdminDashboardQuickActionItem extends PrimitiveReadyItemBase {
  actionId: AdminDashboardQuickActionId;
  label: string;
  description: string;
  icon: string;
  color: string;
  iconColor: string;
  borderColor: string;
  isVisible: boolean;
}

export interface AdminDashboardBannerColorPreset {
  id: string;
  label: string;
  backgroundColor: string;
  textColor: string;
}

export interface AdminDashboardBannerSettingsModel {
  isModalVisible: boolean;
  text: string;
  backgroundColor: string;
  textColor: string;
  isVisible: boolean;
  imageUri: string;
  colorPresets: AdminDashboardBannerColorPreset[];
}

export interface AdminDashboardRefreshState {
  isRefreshing: boolean;
}

export interface AdminDashboardProfileMenuModel {
  isVisible: boolean;
  displayName: string;
  roleLabel: string;
  avatarInitial: string;
}

export interface AdminDashboardScreenViewAdapterOutput {
  screenId: "AdminDashboardScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  access: AdminDashboardAccessModel;
  companyScope: AdminDashboardCompanyScopeModel;
  topLevelStats: AdminDashboardStatCard[];
  quickActions: AdminDashboardQuickActionItem[];
  bannerSettings: AdminDashboardBannerSettingsModel;
  refreshState: AdminDashboardRefreshState;
  profileMenu: AdminDashboardProfileMenuModel;
}

export interface ProjectsScreenProjectItem extends PrimitiveReadyItemBase {
  id: string;
  projectId: string;
  title: string;
  description: string;
  statusValue: ProjectStatus;
  statusLabel: string;
  statusTone: "success" | "info" | "warning" | "neutral" | "danger";
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

export interface ProjectsScreenHeaderActionsModel {
  showCreateAction: boolean;
  showUserManagementAction: boolean;
}

export interface ProjectsScreenViewAdapterOutput {
  screenId: "ProjectsScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  headerActions: ProjectsScreenHeaderActionsModel;
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

export interface ProjectDetailHeaderModel {
  projectId: string;
  title: string;
  description: string;
  statusValue: ProjectStatus;
  statusLabel: string;
}

export interface ProjectDetailLeadPmModel {
  userId: string;
  name: string;
  email?: string;
}

export interface ProjectDetailStatCard extends PrimitiveReadyItemBase {
  statId: string;
  label: string;
  value: number;
  iconName: string;
}

export interface ProjectDetailInfoRow {
  id: string;
  label: string;
  value: string;
  secondaryValue?: string;
}

export interface ProjectDetailMemberRow extends PrimitiveReadyItemBase {
  userId: string;
  name: string;
  projectRoleLabel: string;
  email?: string;
  isLeadPm: boolean;
  canRemove: boolean;
}

export interface ProjectDetailEmptyStateModel {
  title: string;
  message: string;
  primaryActionLabel: string;
}

export interface ProjectDetailScreenViewAdapterOutput {
  screenId: "ProjectDetailScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  project: Project | null;
  header: ProjectDetailHeaderModel | null;
  leadPm: ProjectDetailLeadPmModel | null;
  statCards: ProjectDetailStatCard[];
  informationRows: ProjectDetailInfoRow[];
  memberRows: ProjectDetailMemberRow[];
  isRefreshing: boolean;
  canEdit: boolean;
  canManageMembers: boolean;
  editingProject: Project | null;
  isEditModalVisible: boolean;
  isAddMemberModalVisible: boolean;
  existingMemberIds: string[];
  emptyState: ProjectDetailEmptyStateModel | null;
}

export type UserManagementActiveModal =
  | "assign"
  | "project"
  | "category"
  | "success"
  | "removeConfirm"
  | "invite"
  | "approveConfirm"
  | "rejectConfirm"
  | null;

export interface UserManagementAccessModel {
  isAllowed: boolean;
  deniedMessage: string | null;
}

export interface UserManagementCompanyScopeModel {
  companyName?: string;
  subtitle?: string;
}

export interface UserManagementRefreshState {
  isRefreshing: boolean;
}

export interface UserManagementProfileMenuModel {
  isVisible: boolean;
  displayName: string;
  roleLabel: string;
  avatarInitial: string;
}

export interface UserManagementCardAction {
  id: string;
  label: string;
  testId: string;
  isDisabled?: boolean;
}

export interface UserManagementAssignmentRow extends PrimitiveReadyItemBase {
  id: string;
  projectId: string;
  projectName: string;
  projectRole: ProjectRole;
  projectRoleLabel: string;
  removeTestId: string;
  canRemove: boolean;
}

export interface UserManagementUserCard extends PrimitiveReadyItemBase {
  id: string;
  userId: string;
  name: string;
  email?: string;
  systemRoleLabel: string;
  positionLabel: string;
  isAdmin: boolean;
  isProtected: boolean;
  isPending: boolean;
  pendingMessage: string | null;
  assignmentCountLabel: string | null;
  assignmentRows: UserManagementAssignmentRow[];
  primaryAction: UserManagementCardAction;
  secondaryAction: UserManagementCardAction | null;
}

export interface UserManagementSelectedUserSummary {
  userId: string;
  name: string;
  email?: string;
  roleLabel: string;
}

export interface UserManagementProjectOption extends PrimitiveReadyItemBase {
  id: string;
  projectId: string;
  projectName: string;
  isSelected: boolean;
}

export interface UserManagementProjectRoleOption extends PrimitiveReadyItemBase {
  id: string;
  role: ProjectRole;
  label: string;
  isSelected: boolean;
}

export interface UserManagementPendingRemovalModel {
  userId: string;
  projectId: string;
  userName: string;
  projectName: string;
}

export interface UserManagementEmptyStateModel {
  title: string;
  message: string;
  showInviteAction: boolean;
}

export interface UserManagementScreenViewAdapterOutput {
  screenId: "UserManagementScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  access: UserManagementAccessModel;
  companyScope: UserManagementCompanyScopeModel;
  searchQuery: string;
  userCountLabel: string;
  userCards: UserManagementUserCard[];
  activeModal: UserManagementActiveModal;
  successMessage: string;
  pendingApprovalUser: UserManagementSelectedUserSummary | null;
  pendingRemoval: UserManagementPendingRemovalModel | null;
  refreshState: UserManagementRefreshState;
  profileMenu: UserManagementProfileMenuModel;
  selectedUserSummary: UserManagementSelectedUserSummary | null;
  selectedProjectId: string | null;
  selectedProjectName: string | null;
  selectedProjectRole: ProjectRole;
  availableProjects: UserManagementProjectOption[];
  projectRoleOptions: UserManagementProjectRoleOption[];
  emptyState: UserManagementEmptyStateModel;
}

export interface PendingUsersScreenCard extends PrimitiveReadyItemBase {
  id: string;
  userId: string;
  name: string;
  positionLabel: string;
  email?: string;
  phone: string;
  statusLabel: string;
  approveActionLabel: string;
  rejectActionLabel: string;
}

export interface PendingUsersRefreshState {
  isRefreshing: boolean;
}

export interface PendingUsersEmptyStateModel {
  title: string;
  message: string;
}

export interface PendingUsersScreenViewAdapterOutput {
  screenId: "PendingUsersScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  title: string;
  subtitle: string;
  pendingUserCards: PendingUsersScreenCard[];
  refreshState: PendingUsersRefreshState;
  emptyState: PendingUsersEmptyStateModel;
}

export interface PhotoViewerActivityMetadata {
  title: string;
  actorLabel: string;
  timestampLabel: string;
  description?: string;
  reasonLabel?: string;
  progressLabel?: string;
  statusLabel?: string;
}

export interface PhotoViewerActivityVisuals {
  iconName: string;
  accentColor: string;
  statusBadgeBackgroundColor: string;
}

export interface PhotoViewerScreenViewAdapterOutput {
  screenId: "PhotoViewerScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  currentIndex: number;
  photoCountLabel: string | null;
  activityMetadata: PhotoViewerActivityMetadata | null;
  activityVisuals: PhotoViewerActivityVisuals | null;
}

export type DeveloperSettingsActionColor =
  | "blue"
  | "orange"
  | "purple"
  | "red"
  | "green";

export type DeveloperSettingsActionId =
  | "open-task-detail-verification"
  | "force-sync-all"
  | "clear-task-cache"
  | "clear-project-cache"
  | "clear-user-cache"
  | "view-storage-keys"
  | "initialize-sprint7-sandbox"
  | "test-file-upload"
  | "clear-all-local-data";

export type DeveloperSettingsScenarioPreset = "A" | "B" | "C";

export interface DeveloperSettingsAccessModel {
  isAuthenticated: boolean;
}

export interface DeveloperSettingsStatisticItem {
  id: string;
  label: string;
  count: number;
}

export interface DeveloperSettingsLoadingState {
  isClearing: boolean;
  isTestingUpload: boolean;
  isInitializingSprint7Sandbox: boolean;
}

export interface DeveloperSettingsActionItem extends PrimitiveReadyItemBase {
  actionId: DeveloperSettingsActionId;
  label: string;
  description: string;
  icon: string;
  color: DeveloperSettingsActionColor;
  isDisabled: boolean;
}

export interface DeveloperSettingsActionGroup {
  id: string;
  title: string;
  actions: DeveloperSettingsActionItem[];
  supplementaryLabel?: string;
}

export interface DeveloperSettingsScenarioPresetAction extends PrimitiveReadyItemBase {
  preset: DeveloperSettingsScenarioPreset;
  label: string;
  isDisabled: boolean;
  testID: string;
}

export interface DeveloperSettingsScreenViewAdapterOutput {
  screenId: "DeveloperSettingsScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  access: DeveloperSettingsAccessModel;
  title: string;
  warningTitle: string;
  warningMessage: string;
  statistics: DeveloperSettingsStatisticItem[];
  loadingState: DeveloperSettingsLoadingState;
  actionGroups: DeveloperSettingsActionGroup[];
  scenarioPresets: DeveloperSettingsScenarioPresetAction[];
  scenarioPresetHint: string | null;
  infoMessage: string;
  sandboxDialogs?: {
    confirmation?: Sprint7SandboxConfirmationDialog;
    info?: Sprint7SandboxInfoDialog;
  };
}

export type Sprint7SandboxActorChoice = "tristan" | "herman";
export type Sprint7SandboxCurrentActor = Sprint7SandboxActorChoice | "none";

export interface Sprint7SandboxConfirmationDialog {
  key: string;
  title: string;
  description: string;
  currentActor: Sprint7SandboxCurrentActor;
  choices: Sprint7SandboxConfirmChoice[];
}

export type Sprint7SandboxInfoVariant = "success" | "error";

export interface Sprint7SandboxInfoDialog {
  key: string;
  title: string;
  lines: string[];
  variant: Sprint7SandboxInfoVariant;
}

export type Sprint7SandboxConfirmChoice =
  | "initialize-tristan"
  | "initialize-herman"
  | "switch-tristan"
  | "switch-herman";

export type DevAdminToolActionId =
  | "generate-mock"
  | "cleanup-mock"
  | "reset-db"
  | "seed-db"
  | "run-tests"
  | "check-health";

export type DevAdminEnvironmentTone = "production" | "testing" | "custom";

export interface DevAdminAccessModel {
  isAllowed: boolean;
  deniedMessage: string | null;
  displayName: string | null;
  email: string | null;
  roleLabel: string | null;
}

export interface DevAdminActiveEnvironmentModel {
  name: string;
  badgeLabel: string;
  url: string;
  tone: DevAdminEnvironmentTone;
}

export interface DevAdminEnvironmentItem extends PrimitiveReadyItemBase {
  envName: string;
  label: string;
  url: string;
  isActive: boolean;
  isRemovable: boolean;
  tone: DevAdminEnvironmentTone;
}

export interface DevAdminEnvironmentSectionModel {
  title: string;
  addActionLabel: string;
  environments: DevAdminEnvironmentItem[];
}

export interface DevAdminAddEnvironmentFormModel {
  isVisible: boolean;
  name: string;
  url: string;
  anonKey: string;
  canSubmit: boolean;
}

export interface DevAdminToolActionItem extends PrimitiveReadyItemBase {
  actionId: DevAdminToolActionId;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface DevAdminToolSectionModel {
  title: string;
  actions: DevAdminToolActionItem[];
}

export interface DevAdminLoadingStateModel {
  isBusy: boolean;
  loadingMessage: string;
}

export interface DevAdminScreenViewAdapterOutput {
  screenId: "DevAdminScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  access: DevAdminAccessModel;
  title: string;
  userInfoLabel: string;
  activeEnvironment: DevAdminActiveEnvironmentModel | null;
  environmentSection: DevAdminEnvironmentSectionModel;
  addEnvironmentForm: DevAdminAddEnvironmentFormModel;
  toolSection: DevAdminToolSectionModel;
  productionWarning: string | null;
  loadingState: DevAdminLoadingStateModel;
}

export interface CreateProjectAccessModel {
  isAllowed: boolean;
  deniedMessage: string | null;
}

export interface CreateProjectBannerModel {
  text: string;
  backgroundColor: string;
  textColor: string;
  imageUri?: string;
}

export interface CreateProjectScreenViewAdapterOutput {
  screenId: "CreateProjectScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  access: CreateProjectAccessModel;
  isSubmitting: boolean;
  headerTitle: string;
  headerSubtitle: string | null;
  submitButtonText: string;
  canSubmit: boolean;
  companyBanner: CreateProjectBannerModel | null;
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
  locationOnSite: string;
  assignedTo: string[];
  /** Single primary owner (text id matching live primary_assignee_id). */
  primaryAssigneeId: string;
  /** Optional area container id (text UUID from project_containers). */
  containerId: string;
  /** Optional sub-container id under containerId. */
  subContainerId: string;
  /** Custom tags only; critical_this_week is derived from isCriticalThisWeek. */
  customTags: string[];
  isCriticalThisWeek: boolean;
  projectId: string;
  attachments: any[]; // Or Attachment type
}

export interface CreateTaskContextModel {
  headerTitle: string;
  activeProjectId: string;
  activeProjectName?: string;
  assigneesLocked: boolean;
  requiresEditReason: boolean;
  parentBanner: {
    label: string;
    title: string;
  } | null;
}

export interface CreateTaskAssignableUserModel {
  id: string;
  name: string;
  email?: string;
  position?: string;
  role?: string;
}

export interface CreateTaskScreenActivityModel {
  isSubmitting: boolean;
  isLoadingUsers: boolean;
  isUploading: boolean;
}

export interface CreateTaskLocationOptionModel {
  id: string;
  label: string;
  value: string;
  isAddNew?: boolean;
}

export interface CreateTaskScreenViewAdapterOutput {
  screenId: "CreateTaskScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  context: CreateTaskContextModel;
  activity: CreateTaskScreenActivityModel;
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
  assigneePicker: {
    availableUsers: CreateTaskAssignableUserModel[];
    userSearchQuery: string;
    filteredUsers: CreateTaskAssignableUserModel[];
    selectedUserIds: string[];
  };
  locationPicker: {
    projectId: string;
    options: CreateTaskLocationOptionModel[];
  };
  containerOrganization: {
    /** Progressive disclosure — false keeps Create form free of container chrome. */
    isVisible: boolean;
    isExpanded: boolean;
    catalogueAvailable: boolean;
    containers: Array<{ id: string; label: string; parentId?: string }>;
    selectedContainerId: string;
    selectedSubContainerId: string;
    draftLabel: string;
  };
  projects: {
    availableProjects: Project[];
  };
  modals: {
    showEditReasonModal: boolean;
    editReason: string;
  };
  aiAssistant: {
    textInput: string;
    showSuggestionPreview: boolean;
    acceptedFields: Set<string>;
    isProcessing: boolean;
    lastSuggestion: TaskSuggestion | null;
    error: string | null;
  };
  generateSuggestionFromText: () => Promise<void>;
  suggestTaskFromText: () => Promise<void>;
  clearSuggestion: () => void;
  clearDraftPayloads?: () => Promise<void>;
}
