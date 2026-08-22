import type { NavigatorScreenParams } from "@react-navigation/native";
import type { TaskActivity } from "@/types/buildtrack";
import type {
  TasksLaunchBucket,
  TasksLaunchQueue,
  TasksLaunchSource,
} from "@/state/projectFilterStore";

export type SelectedPhoto = {
  uri: string;
  fileName: string;
  isAnnotated: boolean;
  annotatedUri?: string;
  caption?: string;
  /** MediaLibrary asset id — used to pre-highlight in the in-app library picker. */
  mediaLibraryAssetId?: string;
};

export type TaskDetailParams = { taskId: string; subTaskId?: string };

export type UpdateProgressParams = {
  taskId: string;
  subTaskId?: string;
  initialCompletionPercentage?: number;
  uploadedPhotoUrls?: string[];
  selectedPhotos?: SelectedPhoto[];
  actionType?: string;
  sourceScreen?: string;
  sourceTaskId?: string;
  sourceSubTaskId?: string;
};

export type CameraLaunchContext = "global" | "task_detail";

export type CameraPostCaptureDefault =
  | "create_task"
  | "existing_task"
  | "same_task_update";
export type CreateTaskParams = {
  parentTaskId?: string;
  parentSubTaskId?: string;
  editTaskId?: string;
  /** Resume an unfinished local draft in Create Task chrome. */
  localDraftId?: string;
  actionType?: "edit" | "update" | "photos" | "comment" | "reassign";
  updateTargetSubTaskId?: string;
  sourceTaskId?: string;
  sourceSubTaskId?: string;
  sourceScreen?: "dashboard" | "tasks";
  selectedPhotos?: SelectedPhoto[];
  uploadedPhotoUrls?: string[];
  cameraLaunchContext?: CameraLaunchContext;
  postCaptureDefault?: CameraPostCaptureDefault;
  clearForm?: boolean;
  _timestamp?: number;
};

export type PhotoSelectionSaveIntent = "attach_task" | "project_unattached";

export type PhotoSelectionParams = {
  taskId?: string;
  subTaskId?: string;
  projectId?: string;
  companyId?: string;
  userId?: string;
  initialCompletionPercentage?: number;
  initialPhotos?: SelectedPhoto[];
  returnScreen?: "CreateTask" | "UpdateProgress" | "AddComment" | "PhotoSelection";
  actionType?: CreateTaskParams["actionType"];
  entityType?: "task" | "task-update" | "project" | "user";
  uploadImmediately?: boolean;
  parentTaskId?: string;
  parentSubTaskId?: string;
  editTaskId?: string;
  localDraftId?: string;
  updateTargetSubTaskId?: string;
  selectedPhotos?: SelectedPhoto[];
  uploadedPhotoUrls?: string[];
  sourceScreen?: "dashboard" | "tasks";
  sourceTaskId?: string;
  sourceSubTaskId?: string;
  selectedTaskId?: string;
  saveIntent?: PhotoSelectionSaveIntent;
  originRouteName?: string;
  /** Bumps when returning from in-app library with a new/merged batch. */
  selectionRevision?: number;
};

export type PhotoViewerParams = {
  photos: string[];
  initialIndex?: number;
  allowDelete?: boolean;
  onDelete?: unknown;
  activityInfo?: TaskActivity | null;
};

/** In-app MediaLibrary gallery (library path; Photo Edit stays on Select Photos). */
export type InAppLibraryPickerParams = {
  taskId?: string;
  subTaskId?: string;
  companyId?: string;
  userId?: string;
  initialCompletionPercentage?: number;
  returnScreen?: PhotoSelectionParams["returnScreen"];
  actionType?: CreateTaskParams["actionType"];
  parentTaskId?: string;
  parentSubTaskId?: string;
  editTaskId?: string;
  localDraftId?: string;
  /** When adding more from Select Photos, keep the current batch and append. */
  existingPhotos?: SelectedPhoto[];
  projectId?: string;
  entityType?: PhotoSelectionParams["entityType"];
  uploadImmediately?: boolean;
  sourceScreen?: PhotoSelectionParams["sourceScreen"];
  sourceTaskId?: string;
  sourceSubTaskId?: string;
  selectedTaskId?: string;
  saveIntent?: PhotoSelectionParams["saveIntent"];
  originRouteName?: string;
};

export type DashboardStackParamList = {
  DashboardMain: undefined;
  TaskDetailFromDashboard: TaskDetailParams;
  ProjectPicker: { allowBack?: boolean } | undefined;
  UpdateProgress: UpdateProgressParams;
  AddComment: TaskDetailParams;
  RejectTask: TaskDetailParams;
  ReassignTask: TaskDetailParams;
  CreateTask: CreateTaskParams;
  PhotoSelection: PhotoSelectionParams;
  PhotoViewer: PhotoViewerParams;
  InAppLibraryPicker: InAppLibraryPickerParams;
};

export type TasksListParams =
  | {
      launchQueue?: TasksLaunchQueue;
      launchBucket?: TasksLaunchBucket;
      launchSource?: TasksLaunchSource;
      launchNonce?: number;
    }
  | undefined;

export type TasksStackParamList = {
  TasksList: TasksListParams;
  TaskDetail: TaskDetailParams;
  CreateTaskFromTask:
    | {
        parentTaskId?: string;
        parentSubTaskId?: string;
        editTaskId?: string;
      }
    | undefined;
  PhotoViewer: PhotoViewerParams;
  PhotoSelection: PhotoSelectionParams;
  UpdateProgress: UpdateProgressParams;
  AddComment: TaskDetailParams;
  RejectTask: TaskDetailParams;
  ReassignTask: TaskDetailParams;
  CreateTask: CreateTaskParams;
  InAppLibraryPicker: InAppLibraryPickerParams;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  DeveloperSettings: undefined;
  OwnerConsole: undefined;
  OwnerMonitoring: undefined;
  OwnerEconomics: undefined;
  OwnerTenantOps: undefined;
  WorkflowGaps: undefined;
  PendingUsers: undefined;
};

export type ReportsStackParamList = {
  ReportsMain: undefined;
};
export type CreateTaskStackParamList = {
  CreateTaskMain: CreateTaskParams | undefined;
  PhotoSelection: PhotoSelectionParams;
  PhotoViewer: PhotoViewerParams;
  InAppLibraryPicker: InAppLibraryPickerParams;
};

export type AdminDashboardStackParamList = {
  AdminDashboardMain: undefined;
  ProjectsList: { newProjectId?: string } | undefined;
  ProjectDetail: { projectId: string };
  CreateProject: undefined;
  UserManagement: undefined;
  DevAdmin: undefined;
};

export type RootTabParamList = {
  Dashboard: NavigatorScreenParams<DashboardStackParamList> | undefined;
  Activity: NavigatorScreenParams<DashboardStackParamList> | undefined;
  Tasks: NavigatorScreenParams<TasksStackParamList> | undefined;
  CreateTask: NavigatorScreenParams<CreateTaskStackParamList> | undefined;
  Camera: NavigatorScreenParams<CreateTaskStackParamList> | undefined;
  Reports: NavigatorScreenParams<ReportsStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
  AdminDashboard: NavigatorScreenParams<AdminDashboardStackParamList> | undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<RootTabParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};
