import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import * as FileSystem from 'expo-file-system/legacy';
import { useAuthStore } from "../../state/authStore";
import { useTaskStore } from "../../state/taskStore.supabase";
import { useTranslation } from "../../utils/useTranslation";
import { TaskStatus } from "../../types/buildtrack";
import { uploadFileWithVerification } from "../../api/fileUploadService";
import { ensureCappedLocalPhoto } from "../../utils/ensureCappedLocalPhoto";
import { mergeUniqueAttachments } from "../../utils/mergeTaskAttachments";
import { returnToTaskDetailAfterUpdateProgress } from "../../navigation/photoFlowNavigation";
import { navigateToAddPhotosCaptureSession } from "../../navigation/captureFirstCameraFlow";
import type { 
  UpdateProgressScreenViewAdapterOutput,
  UpdateProgressPhotoModel
} from "../contracts/viewAdapters";

export interface SelectedPhoto {
  uri: string;
  fileName: string;
  isAnnotated?: boolean;
  annotatedUri?: string;
}

export interface UpdateProgressScreenParams {
  taskId: string;
  subTaskId?: string;
  initialCompletionPercentage?: number;
  uploadedPhotoUrls?: string[]; 
  selectedPhotos?: SelectedPhoto[]; 
  actionType?: string;
  mode?: "progress" | "report_reply";
  sourceScreen?: string; 
  sourceTaskId?: string; 
  sourceSubTaskId?: string; 
}

export interface UpdateProgressScreenProps {
  uploadedPhotoUrls?: string[]; 
  selectedPhotos?: SelectedPhoto[]; 
  onNavigateBack?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

export function useUpdateProgressViewAdapter(props: UpdateProgressScreenProps) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const {
    taskId,
    subTaskId,
    initialCompletionPercentage,
    sourceScreen,
    sourceTaskId,
    sourceSubTaskId,
    mode: routeMode,
  } = (route.params || {}) as UpdateProgressScreenParams;

  const t = useTranslation();
  const { user } = useAuthStore();
  const tasks = useTaskStore(state => state.tasks);
  const fetchTaskById = useTaskStore(state => state.fetchTaskById);
  const addTaskUpdate = useTaskStore(state => state.addTaskUpdate);
  const addSubTaskUpdate = useTaskStore(state => state.addSubTaskUpdate);
  const addAssignerComment = useTaskStore(state => state.addAssignerComment);

  const task = tasks.find(t => t.id === taskId);
  // Product: PM reply on a report never shows completion %. Prefer explicit mode;
  // also derive from status so photo-return navigations that drop `mode` stay correct.
  const isReportReply =
    routeMode === "report_reply" || task?.status === "reported";
  const isViewingSubTask = !!subTaskId;

  const [description, setDescription] = useState("");
  const [completionPercentage, setCompletionPercentage] = useState(initialCompletionPercentage || task?.completionPercentage || 0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoObjects, setPhotoObjects] = useState<SelectedPhoto[]>([]);
  
  const [failedUploadsInSession, setFailedUploadsInSession] = useState<Array<{ fileName: string; error: string; originalFile: any }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setCompletionPercentage(prev => task.completionPercentage || prev);
    }
  }, [task?.completionPercentage]);

  useEffect(() => {
    if (props.selectedPhotos && Array.isArray(props.selectedPhotos) && props.selectedPhotos.length > 0) {
      setPhotoObjects(prev => mergeUniqueAttachments(prev, props.selectedPhotos!) as SelectedPhoto[]);
    }
  }, [props.selectedPhotos]);

  useEffect(() => {
    if (props.uploadedPhotoUrls && Array.isArray(props.uploadedPhotoUrls) && props.uploadedPhotoUrls.length > 0) {
      setPhotos(prev => {
        const existingUrls = new Set(prev);
        const newUrls = props.uploadedPhotoUrls!.filter(url => !existingUrls.has(url));
        return newUrls.length > 0 ? [...prev, ...newUrls] : prev;
      });
    }
  }, [props.uploadedPhotoUrls]);

  useEffect(() => {
    const params = (route.params || {}) as UpdateProgressScreenParams;
    if (params?.selectedPhotos && Array.isArray(params.selectedPhotos) && params.selectedPhotos.length > 0) {
      setPhotoObjects(prev => mergeUniqueAttachments(prev, params.selectedPhotos!) as SelectedPhoto[]);
      navigation.setParams({ selectedPhotos: undefined });
    }
  }, [(route.params as UpdateProgressScreenParams)?.selectedPhotos, navigation]);

  useEffect(() => {
    const params = (route.params || {}) as UpdateProgressScreenParams;
    if (params?.uploadedPhotoUrls && Array.isArray(params.uploadedPhotoUrls) && params.uploadedPhotoUrls.length > 0) {
      setPhotos(prev => {
        const existingUrls = new Set(prev);
        const newUrls = params.uploadedPhotoUrls!.filter(url => !existingUrls.has(url));
        return newUrls.length > 0 ? [...prev, ...newUrls] : prev;
      });
      navigation.setParams({ uploadedPhotoUrls: undefined });
    }
  }, [(route.params as UpdateProgressScreenParams)?.uploadedPhotoUrls, navigation]);

  const handleAddPhotos = (_source?: "camera" | "library") => {
    if (!user || !task) return;

    navigateToAddPhotosCaptureSession(navigation, {
      returnScreen: "UpdateProgress",
      taskId: task.id,
      subTaskId,
      companyId: user.companyId,
      userId: user.id,
      initialCompletionPercentage: task.completionPercentage || 0,
      uploadImmediately: false,
      sourceScreen: sourceScreen as "dashboard" | "tasks" | undefined,
      sourceTaskId: sourceTaskId || task.id,
      sourceSubTaskId: sourceSubTaskId || subTaskId,
      entityType: "task-update",
      mode: isReportReply ? "report_reply" : routeMode,
    });
  };

  const handleRetryUpload = async (failedUpload: { fileName: string; error: string; originalFile: any }) => {
    if (!user || !task) return;

    try {
      const result = await uploadFileWithVerification({
        file: failedUpload.originalFile,
        entityType: 'task-update',
        entityId: task.id,
        companyId: user.companyId,
        userId: user.id,
      });

      if (result.success && result.file) {
        setPhotos(prev => [...prev, result.file!.public_url]);
        setFailedUploadsInSession(prev => prev.filter(f => f.fileName !== failedUpload.fileName));
        Alert.alert("Success", `${failedUpload.fileName} uploaded successfully!`);
      } else {
        Alert.alert("Retry Failed", result.error || "Upload failed again. Please check your connection and try again.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Retry failed. Please try again.");
    }
  };

  const uploadPhotoObjects = async (photosToUpload: SelectedPhoto[], tId: string): Promise<string[]> => {
    if (!user || photosToUpload.length === 0) return [];
    const uploadedUrls: string[] = [];

    for (let i = 0; i < photosToUpload.length; i++) {
      const photo = photosToUpload[i];
      try {
        const uriToUpload = await ensureCappedLocalPhoto(photo);
        const fileInfo = await FileSystem.getInfoAsync(uriToUpload);
        if (!fileInfo.exists) continue;

        const result = await uploadFileWithVerification({
          file: {
            uri: uriToUpload,
            name: photo.fileName,
            type: 'image/jpeg',
          },
          entityType: 'task-update',
          entityId: tId,
          companyId: user.companyId,
          userId: user.id,
        });

        if (result.success && result.file) {
          uploadedUrls.push(result.file.public_url);
        }
      } catch (error: any) {
        console.error(error);
      }
    }

    return uploadedUrls;
  };

  const handleSubmitUpdate = async () => {
    if (!description.trim()) {
      Alert.alert(
        "Error",
        isReportReply
          ? "Please provide a reply message"
          : "Please provide a description for this update",
      );
      return;
    }

    if (!task || !user?.id) return;
    setIsSubmitting(true);

    try {
      let uploadedPhotoUrls: string[] = [];
      if (photoObjects.length > 0) {
        uploadedPhotoUrls = await uploadPhotoObjects(photoObjects, task.id);
        
        if (uploadedPhotoUrls.length < photoObjects.length) {
          const failedCount = photoObjects.length - uploadedPhotoUrls.length;
          Alert.alert("Upload Warning", `${uploadedPhotoUrls.length} of ${photoObjects.length} photo(s) uploaded successfully. ${failedCount} photo(s) failed to upload. The update will be saved with the successfully uploaded photos.`);
        }
      }

      const allPhotoUrls = [...photos, ...uploadedPhotoUrls];

      if (isReportReply) {
        await addAssignerComment(task.id, {
          description: description.trim(),
          photos: allPhotoUrls,
          userId: user.id,
        });
        await fetchTaskById(task.id);
        const refreshed = useTaskStore.getState().tasks.find((entry) => entry.id === task.id);
        if (refreshed && refreshed.status !== "reported") {
          console.warn(
            "[report_reply] expected status reported after reply, got",
            refreshed.status,
          );
        }
      } else {
        const calculatedStatus: TaskStatus =
          task.status === "accepted" ||
          task.status === "in_progress" ||
          task.status === "submitted_for_review"
            ? "in_progress"
            : task.status || "in_progress";

        const updatePayload = {
          description: description,
          photos: allPhotoUrls,
          completionPercentage: completionPercentage,
          status: calculatedStatus,
          userId: user.id,
        };

        if (isViewingSubTask && subTaskId) {
          await addSubTaskUpdate(taskId, subTaskId, updatePayload);
        } else {
          await addTaskUpdate(task.id, updatePayload);
        }

        await fetchTaskById(task.id);
      }

      // Timeline on Task Detail is the confirmation — no success Alert.
      // Pop back to the existing Task Detail under this update flow.
      // Do not navigate/push another Task Detail — that leaves Update Progress
      // underneath and makes header Back reopen the last update step.
      returnToTaskDetailAfterUpdateProgress(navigation, {
        taskId: sourceTaskId || task.id,
        subTaskId: sourceSubTaskId || subTaskId,
      });
    } catch (error) {
      Alert.alert(
        t.errors.error,
        isReportReply
          ? t.createTask.replyFailed || "Failed to send reply"
          : t.taskDetail.failedToSubmitUpdate,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const outputPhotos: UpdateProgressPhotoModel[] = [
    ...photos.map((url, i) => ({
      id: `url-${i}`,
      uri: url,
      isUploaded: true,
      isFailed: false,
      density: 'standard' as const,
      structuralState: 'loading' as const, // We'll just use a valid state like loading or empty or disabled
      onRemove: () => setPhotos(prev => prev.filter((_, index) => index !== i)),
    })),
    ...photoObjects.map((obj, i) => ({
      id: `obj-${i}`,
      uri: obj.annotatedUri || obj.uri,
      isUploaded: false,
      isFailed: false,
      isAnnotated: Boolean(obj.isAnnotated || obj.annotatedUri),
      density: 'standard' as const,
      structuralState: 'loading' as const,
      onRemove: () => setPhotoObjects(prev => prev.filter((_, index) => index !== i)),
    })),
    ...failedUploadsInSession.map((failed, i) => ({
      id: `fail-${i}`,
      uri: '', // Could potentially use a placeholder or local path if available
      isUploaded: false,
      isFailed: true,
      errorMessage: failed.error,
      density: 'standard' as const,
      structuralState: 'loading' as const,
      onRemove: () => setFailedUploadsInSession(prev => prev.filter((_, index) => index !== i)),
      onRetry: () => handleRetryUpload(failed),
      originalFileName: failed.fileName // Extended for presentation if needed
    }))
  ];

  const output: UpdateProgressScreenViewAdapterOutput = {
    screenId: "UpdateProgressScreen",
    readiness: {
      hasInitialFrame: true,
      hasUsableData: !!task,
      isBackgroundRefreshing: false,
      isNavigationTransitionActive: false,
    },
    continuity: {
      isInitialLoading: !task,
      isBackgroundRefreshing: false,
      hasCachedFrame: false,
      shouldRenderSkeletonShell: false,
      shouldRenderEmptyState: false,
      freshnessLabel: "Just now"
    },
    form: {
      description,
      completionPercentage,
      previousPercentage: task?.completionPercentage || 0,
      isSubmitting,
      isValid: description.trim().length > 0,
      mode: isReportReply ? "report_reply" : "progress",
      screenTitle: isReportReply
        ? t.createTask.replyToReport || "Reply"
        : t.taskDetail.progressUpdate,
      submitLabel: isReportReply
        ? t.createTask.sendReply || "Send reply"
        : t.taskDetail.submitUpdate,
      descriptionLabel: isReportReply
        ? t.createTask.replyMessage || "Reply"
        : t.taskDetail.updateDescription,
      descriptionPlaceholder: isReportReply
        ? t.createTask.replyPlaceholder || "Write a reply to the reporter…"
        : t.taskDetail.updateDescriptionPlaceholder,
    },
    photos: outputPhotos,
    scalarMetrics: {
      totalPhotos: photos.length + photoObjects.length,
      failedPhotos: failedUploadsInSession.length,
    }
  };

  return {
    output,
    actions: {
      setDescription,
      setCompletionPercentage,
      handleAddPhotos,
      handleSubmitUpdate,
    },
    task,
  };
}
