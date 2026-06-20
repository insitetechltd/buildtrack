import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { useAuthStore } from "@/state/authStore";
import { useTaskStore } from "@/state/taskStore.supabase";
import type { RejectTaskScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";
import { useFileUpload, type UploadResults } from "@/utils/useFileUpload";

export interface RejectTaskScreenParams {
  taskId: string;
  subTaskId?: string;
}

export interface RejectTaskScreenProps {
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

export interface RejectTaskViewAdapterHookResult {
  output: RejectTaskScreenViewAdapterOutput;
  actions: {
    setRejectReason: (value: string) => void;
    handleAddPhotos: () => Promise<void>;
    handleSubmitReject: () => Promise<void>;
  };
}

export function useRejectTaskViewAdapter(): RejectTaskViewAdapterHookResult {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { taskId, subTaskId } = (route.params || {}) as RejectTaskScreenParams;
  const { user } = useAuthStore();
  const tasks = useTaskStore((state) => state.tasks);
  const fetchTaskById = useTaskStore((state) => state.fetchTaskById);
  const rejectTaskCompletion = useTaskStore((state) => state.rejectTaskCompletion);
  const rejectSubTaskCompletion = useTaskStore((state) => state.rejectSubTaskCompletion);
  const { pickAndUploadImages } = useFileUpload();

  const task = tasks.find((item) => item.id === taskId);
  const isViewingSubTask = Boolean(subTaskId);
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const appendUploadedPhotos = useCallback((results: UploadResults) => {
    if (results.successful.length === 0) {
      return;
    }

    const newPhotoUrls = results.successful.map((file) => file.public_url);
    setPhotos((currentPhotos) => [...currentPhotos, ...newPhotoUrls]);
  }, []);

  const handleUploadSource = useCallback(
    async (source: "camera" | "library") => {
      if (!user || !task) {
        return;
      }

      try {
        const results = await pickAndUploadImages(
          {
            entityType: "task-update",
            entityId: task.id,
            companyId: user.companyId,
            userId: user.id,
          },
          source,
        );

        appendUploadedPhotos(results);
      } catch (error) {
        Alert.alert(
          "Error",
          source === "camera" ? "Failed to take photo" : "Failed to pick images",
        );
      }
    },
    [appendUploadedPhotos, pickAndUploadImages, task, user],
  );

  const handleAddPhotos = useCallback(async () => {
    if (!user || !task) {
      return;
    }

    Alert.alert("Add Photos", "Choose how you want to add photos", [
      {
        text: "Take Photo",
        onPress: () => {
          void handleUploadSource("camera");
        },
      },
      {
        text: "Choose from Library",
        onPress: () => {
          void handleUploadSource("library");
        },
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  }, [handleUploadSource, task, user]);

  const handleSubmitReject = useCallback(async () => {
    if (!reason.trim()) {
      Alert.alert("Error", "Please provide a reason for rejecting this task");
      return;
    }

    if (!user || !task) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isViewingSubTask && subTaskId) {
        await rejectSubTaskCompletion(taskId, subTaskId, user.id, reason, photos);
      } else {
        await rejectTaskCompletion(task.id, user.id, reason, photos);
      }

      await fetchTaskById(task.id);
      Alert.alert("Success", "Task rejected successfully");
      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to reject task");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    fetchTaskById,
    isViewingSubTask,
    navigation,
    photos,
    reason,
    rejectSubTaskCompletion,
    rejectTaskCompletion,
    subTaskId,
    task,
    taskId,
    user,
  ]);

  const output = useMemo<RejectTaskScreenViewAdapterOutput>(
    () => ({
      screenId: "RejectTaskScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: Boolean(task),
        isBackgroundRefreshing: false,
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading: false,
        isBackgroundRefreshing: false,
        hasCachedFrame: Boolean(task),
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: !task,
        freshnessLabel: task ? "Ready" : "Unavailable",
      },
      rejectForm: {
        reason,
        isSubmitting,
        isValid: reason.trim().length > 0,
        isViewingSubTask,
      },
      photoAttachments: photos.map((uri, index) => ({
        id: `reject-photo:${index}`,
        uri,
        density: "standard",
        structuralState: "stale",
        onRemove: () => {
          setPhotos((currentPhotos) => currentPhotos.filter((_, itemIndex) => itemIndex !== index));
        },
      })),
    }),
    [isSubmitting, isViewingSubTask, photos, reason, task],
  );

  return {
    output,
    actions: {
      setRejectReason: setReason,
      handleAddPhotos,
      handleSubmitReject,
    },
  };
}
