import { useCallback, useEffect, useMemo, useState } from "react";

import { useUserStore } from "@/state/userStore.supabase";
import type { ActivityType, TaskActivity } from "@/types/buildtrack";
import type { PhotoViewerScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";
import { useDateFormatter } from "@/utils/dateFormatter";

export interface PhotoViewerViewAdapterProps {
  photos: string[];
  initialIndex?: number;
  activityInfo?: TaskActivity | null;
  onNavigateBack: () => void;
}

export interface PhotoViewerViewAdapterHookResult {
  output: PhotoViewerScreenViewAdapterOutput;
  actions: {
    handleNavigateBack: () => void;
    handlePhotoIndexChange: (nextIndex: number) => void;
  };
}

function clampIndex(index: number, photoCount: number): number {
  if (photoCount <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, photoCount - 1));
}

function getActivityType(activity: TaskActivity | null | undefined): ActivityType | null {
  if (!activity) {
    return null;
  }

  if (activity.activityType) {
    return activity.activityType;
  }

  if (activity.status) {
    return "status_change";
  }

  return "progress_update";
}

function getActivityIconName(type: ActivityType | null): string {
  switch (type) {
    case "creation":
      return "add-circle";
    case "assignment":
      return "person-add";
    case "status_change":
      return "sync";
    case "progress_update":
      return "trending-up";
    case "metadata_edit":
      return "create";
    case "review_submission":
      return "send";
    case "review_acceptance":
      return "checkmark-circle";
    case "review_rejection":
      return "close-circle";
    case "cancellation":
      return "ban";
    case "assigner_comment":
      return "chatbubble";
    default:
      return "document-text";
  }
}

function getActivityAccentColor(type: ActivityType | null): string {
  switch (type) {
    case "creation":
      return "#10b981";
    case "assignment":
      return "#3b82f6";
    case "status_change":
      return "#8b5cf6";
    case "progress_update":
      return "#f59e0b";
    case "metadata_edit":
      return "#6366f1";
    case "review_submission":
      return "#06b6d4";
    case "review_acceptance":
      return "#10b981";
    case "review_rejection":
      return "#ef4444";
    case "cancellation":
      return "#6b7280";
    case "assigner_comment":
      return "#3b82f6";
    default:
      return "#6b7280";
  }
}

function getActivityTitle(type: ActivityType | null): string {
  if (!type) {
    return "";
  }

  if (type === "metadata_edit") {
    return "Task Information";
  }

  return type.replace(/_/g, " ");
}

function extractReasonParts(activity: TaskActivity | null | undefined): {
  description: string;
  reasonLabel?: string;
} {
  if (!activity) {
    return { description: "" };
  }

  const activityData = activity.data as { reason?: string } | undefined;
  const explicitReason = activityData?.reason?.trim();
  let description = activity.description || "";

  if (explicitReason) {
    const escapedReason = explicitReason.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const reasonPattern = new RegExp(`\\.?\\s*Reason:\\s*${escapedReason}`, "i");

    description = description.replace(reasonPattern, "").trim();

    return {
      description,
      reasonLabel: `Reason: ${explicitReason}`,
    };
  }

  const reasonMatch = description.match(/Reason:\s*(.+)$/i);

  if (!reasonMatch) {
    return { description };
  }

  return {
    description: description.replace(/\s*Reason:.*$/i, "").trim(),
    reasonLabel: `Reason: ${reasonMatch[1].trim()}`,
  };
}

export function usePhotoViewerViewAdapter(
  props: PhotoViewerViewAdapterProps,
): PhotoViewerViewAdapterHookResult {
  const { photos, initialIndex = 0, activityInfo, onNavigateBack } = props;
  const { getUserById } = useUserStore();
  const dateFormatter = useDateFormatter();
  const [currentIndex, setCurrentIndex] = useState(() =>
    clampIndex(initialIndex, photos.length),
  );

  useEffect(() => {
    setCurrentIndex(clampIndex(initialIndex, photos.length));
  }, [initialIndex, photos.length]);

  const handleNavigateBack = useCallback(() => {
    onNavigateBack();
  }, [onNavigateBack]);

  const handlePhotoIndexChange = useCallback(
    (nextIndex: number) => {
      setCurrentIndex(clampIndex(nextIndex, photos.length));
    },
    [photos.length],
  );

  const output = useMemo<PhotoViewerScreenViewAdapterOutput>(() => {
    const activityType = getActivityType(activityInfo);
    const activityUser = activityInfo?.userId ? getUserById(activityInfo.userId) : null;
    const reasonParts = extractReasonParts(activityInfo);
    const accentColor = getActivityAccentColor(activityType);
    const shouldRenderCount = photos.length > 1;
    const shouldRenderActivity = Boolean(activityInfo && activityType);

    return {
      screenId: "PhotoViewerScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: true,
        isBackgroundRefreshing: false,
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading: false,
        isBackgroundRefreshing: false,
        hasCachedFrame: photos.length > 0,
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: false,
        freshnessLabel: "Ready",
      },
      currentIndex,
      photoCountLabel: shouldRenderCount ? `${currentIndex + 1} / ${photos.length}` : null,
      activityMetadata: shouldRenderActivity
        ? {
            title: getActivityTitle(activityType),
            actorLabel: activityUser?.name || "Unknown User",
            timestampLabel: activityInfo?.timestamp
              ? `${dateFormatter.formatDateShort(activityInfo.timestamp)} ${dateFormatter.formatTime(activityInfo.timestamp)}`
              : "",
            description: reasonParts.description || undefined,
            reasonLabel: reasonParts.reasonLabel,
            progressLabel:
              activityInfo?.completionPercentage !== undefined
                ? `Progress: ${activityInfo.completionPercentage}%`
                : undefined,
            statusLabel: activityInfo?.status
              ? activityInfo.status.replace(/_/g, " ")
              : undefined,
          }
        : null,
      activityVisuals: shouldRenderActivity
        ? {
            iconName: getActivityIconName(activityType),
            accentColor,
            statusBadgeBackgroundColor: `${accentColor}20`,
          }
        : null,
    };
  }, [activityInfo, currentIndex, dateFormatter, getUserById, photos.length]);

  return {
    output,
    actions: {
      handleNavigateBack,
      handlePhotoIndexChange,
    },
  };
}
