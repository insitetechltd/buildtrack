import type { NavigatorScreenParams } from "@react-navigation/native";
import type { TaskActivity } from "@/types/buildtrack";

export type SelectedPhoto = {
  uri: string;
  fileName: string;
  isAnnotated: boolean;
  annotatedUri?: string;
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

export type CreateTaskParams = {
  parentTaskId?: string;
  parentSubTaskId?: string;
  editTaskId?: string;
  actionType?: "edit" | "update" | "photos" | "comment" | "reassign";
  updateTargetSubTaskId?: string;
  sourceTaskId?: string;
  sourceSubTaskId?: string;
  sourceScreen?: "dashboard" | "tasks";
  selectedPhotos?: SelectedPhoto[];
  uploadedPhotoUrls?: string[];
  clearForm?: boolean;
  _timestamp?: number;
};

export type PhotoSelectionParams = {
  taskId?: string;
  subTaskId?: string;
  companyId?: string;
  userId?: string;
  initialCompletionPercentage?: number;
  initialPhotos?: SelectedPhoto[];
  returnScreen?: "CreateTask" | "UpdateProgress" | "AddComment" | "PhotoSelection";
  actionType?: string;
  entityType?: "task" | "task-update" | "project" | "user";
  uploadImmediately?: boolean;
  parentTaskId?: string;
  parentSubTaskId?: string;
  editTaskId?: string;
  updateTargetSubTaskId?: string;
  selectedPhotos?: SelectedPhoto[];
  uploadedPhotoUrls?: string[];
  annotationResult?: string;
  photoIndex?: number;
  sourceScreen?: "dashboard" | "tasks";
  sourceTaskId?: string;
  sourceSubTaskId?: string;
};

export type PhotoViewerParams = {
  photos: string[];
  initialIndex?: number;
  allowDelete?: boolean;
  onDelete?: unknown;
  activityInfo?: TaskActivity | null;
};

export type PhotoAnnotationParams = {
  photoUri: string;
  existingAnnotations?: unknown[];
  photoIndex?: number;
  returnScreen?: "PhotoSelection";
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
  PhotoAnnotation: PhotoAnnotationParams;
};

export type TasksStackParamList = {
  TasksList: undefined;
  TaskDetail: TaskDetailParams;
  CreateTaskFromTask:
    | {
        parentTaskId?: string;
        parentSubTaskId?: string;
        editTaskId?: string;
      }
    | undefined;
  PhotoViewer: PhotoViewerParams;
  PhotoAnnotation: PhotoAnnotationParams;
  PhotoSelection: PhotoSelectionParams;
  UpdateProgress: UpdateProgressParams;
  AddComment: TaskDetailParams;
  RejectTask: TaskDetailParams;
  ReassignTask: TaskDetailParams;
  CreateTask: CreateTaskParams;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  DeveloperSettings: undefined;
  PendingUsers: undefined;
};

export type CreateTaskStackParamList = {
  CreateTaskMain: CreateTaskParams | undefined;
  PhotoSelection: PhotoSelectionParams;
  PhotoViewer: PhotoViewerParams;
  PhotoAnnotation: PhotoAnnotationParams;
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
  Activity: NavigatorScreenParams<DashboardStackParamList> | undefined;
  Tasks: NavigatorScreenParams<TasksStackParamList> | undefined;
  Camera: NavigatorScreenParams<CreateTaskStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
  AdminDashboard: NavigatorScreenParams<AdminDashboardStackParamList> | undefined;
};
