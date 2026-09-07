import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { useAuthStore } from "@/state/authStore";
import { useTaskStore } from "@/state/taskStore.supabase";
import type { AddCommentScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";
import { useFileUpload, type UploadResults } from "@/utils/useFileUpload";

export interface AddCommentScreenParams {
  taskId: string;
}

export interface AddCommentScreenProps {
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

export interface AddCommentViewAdapterHookResult {
  output: AddCommentScreenViewAdapterOutput;
  actions: {
    setCommentDescription: (value: string) => void;
    handleAddPhotos: () => Promise<void>;
    handleSubmitComment: () => Promise<void>;
  };
}

export function useAddCommentViewAdapter(): AddCommentViewAdapterHookResult {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { taskId } = (route.params || {}) as AddCommentScreenParams;
  const { user } = useAuthStore();
  const tasks = useTaskStore((state) => state.tasks);
  const fetchTaskById = useTaskStore((state) => state.fetchTaskById);
  const addAssignerComment = useTaskStore((state) => state.addAssignerComment);
  const { pickAndUploadImages } = useFileUpload();

  const task = tasks.find((item) => item.id === taskId);
  const [description, setDescription] = useState("");
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

  const handleSubmitComment = useCallback(async () => {
    if (!description.trim()) {
      Alert.alert("Error", "Please provide a comment");
      return;
    }

    if (!user || !task) {
      return;
    }

    setIsSubmitting(true);

    try {
      await addAssignerComment(task.id, {
        description,
        photos,
        userId: user.id,
      });
      await fetchTaskById(task.id);

      // Timeline on Task Detail is the confirmation — no success Alert.
      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  }, [addAssignerComment, description, fetchTaskById, navigation, photos, task, user]);

  const output = useMemo<AddCommentScreenViewAdapterOutput>(
    () => ({
      screenId: "AddCommentScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: Boolean(task),
        isBackgroundRefreshing: false,
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading: false,
        isBackgroundRefreshing: false,
        hasCachedFrame: false,
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: !task,
        freshnessLabel: task ? "Ready" : "Unavailable",
      },
      commentForm: {
        description,
        isSubmitting,
        isValid: description.trim().length > 0,
      },
      photoAttachments: photos.map((uri, index) => ({
        id: `comment-photo:${index}`,
        uri,
        density: "standard",
        structuralState: "stale",
        onRemove: () => {
          setPhotos((currentPhotos) => currentPhotos.filter((_, itemIndex) => itemIndex !== index));
        },
      })),
    }),
    [description, isSubmitting, photos, task],
  );

  return {
    output,
    actions: {
      setCommentDescription: setDescription,
      handleAddPhotos,
      handleSubmitComment,
    },
  };
}
