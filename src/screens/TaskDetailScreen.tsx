import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { useNavigation } from "@react-navigation/native";
import { useTaskDetailViewAdapter } from "@/ui/viewAdapters/useTaskDetailViewAdapter";
import ModernScreenHeader from "@/components/ModernScreenHeader";
import BrandHeaderTitle from "@/components/BrandHeaderTitle";
import TaskDetailInfoCard from "@/components/taskDetail/TaskDetailInfoCard";
import TaskDetailQuickActions from "@/components/taskDetail/TaskDetailQuickActions";
import TaskActivityTimeline from "@/components/taskDetail/TaskActivityTimeline";
import {
  IPAD_TASK_DETAIL_META_FLEX,
  IPAD_TASK_DETAIL_THREAD_FLEX,
  isIpadLandscapeMetaSplit,
} from "@/components/taskDetail/ipadTimelineEvidenceLayout";
import ReportReplyComposer, {
  progressDockIsDirty,
  progressDockShouldInterceptLeave,
} from "@/components/taskDetail/ReportReplyComposer";
import { ReportTriageSpeedDial } from "@/components/ReportTriageSpeedDial";
import ArchiveConfirmSheet from "@/components/ArchiveConfirmSheet";
import { mapBannerModelToBannerProps } from "@/ui/mappers/taskDetailMappers";
import type { BannerPrimitiveContract } from "@/ui/contracts/primitives";
import type { SelectedPhoto } from "@/utils/usePhotoSelection";
import { useAuthStore } from "@/state/authStore";
import { uploadFileWithVerification } from "@/api/fileUploadService";
import { ensureCappedLocalPhoto } from "@/utils/ensureCappedLocalPhoto";
import { useTranslation } from "@/utils/useTranslation";
import { navigateToAddPhotosCaptureSession } from "@/navigation/captureFirstCameraFlow";
import { mergeUniqueAttachments } from "@/utils/mergeTaskAttachments";
import {
  setReportTriageDialExpanded,
  toggleReportTriageDialExpanded,
  useReportTriageDialExpanded,
} from "@/navigation/reportTriageSpeedDialStore";
import { navigateReportTriageAction } from "@/navigation/taskDetailBackNavigation";

/** Unified Triage Dock height — anchors Create/Resolve satellites above leading +. */
const REPORT_REPLY_DOCK_HEIGHT = 56;

interface TaskDetailScreenProps {
  taskId: string;
  subTaskId?: string;
  /** Drafts returned from CaptureSession → Select Photos for report reply. */
  inboundSelectedPhotos?: SelectedPhoto[];
  onNavigateBack: () => void;
  onNavigateToCreateTask?: (
    parentTaskId?: string,
    parentSubTaskId?: string,
    editTaskId?: string,
    actionType?: 'edit' | 'update' | 'photos' | 'comment' | 'reassign' | 'triage',
    updateTargetSubTaskId?: string,
  ) => void;
  onNavigateToRejectTask?: (taskId: string, subTaskId?: string) => void;
  onNavigateToTaskDetail?: (taskId: string, subTaskId?: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

const BannerPrimitive = ({ contract }: { contract: BannerPrimitiveContract }) => {
  const bgColors = {
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    green: "bg-green-50 border-green-200 text-green-900",
    red: "bg-red-50 border-red-200 text-red-900",
  };
  const iconColors = {
    amber: "#f59e0b",
    green: "#16a34a",
    red: "#dc2626",
  };
  const iconBg = {
    amber: "bg-amber-100",
    green: "bg-green-100",
    red: "bg-red-100",
  };

  return (
    <View className={`border-b-2 px-6 py-4 ${bgColors[contract.colorScheme].split(" ")[0]} ${bgColors[contract.colorScheme].split(" ")[1]}`}>
      <View className="flex-row items-center">
        <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${iconBg[contract.colorScheme]}`}>
          <Ionicons name={contract.iconName as any} size={24} color={iconColors[contract.colorScheme]} />
        </View>
        <View className="flex-1">
          <Text className={`text-xl font-bold ${bgColors[contract.colorScheme].split(" ")[2]}`}>
            {contract.title}
          </Text>
          {contract.subtitle && (
            <Text className={`text-base mt-1 ${bgColors[contract.colorScheme].split(" ")[2]} opacity-80`}>
              {contract.subtitle}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default function TaskDetailScreen(props: TaskDetailScreenProps) {
  const { output, actions } = useTaskDetailViewAdapter({
    taskId: props.taskId,
    subTaskId: props.subTaskId
  });
  const t = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const splitIpadLandscapeMeta = isIpadLandscapeMetaSplit(
    Platform,
    windowWidth,
    windowHeight,
  );
  const user = useAuthStore((state) => state.user);
  const navigation = useNavigation<{
    navigate: (name: string, params?: object) => void;
    push?: (name: string, params?: object) => void;
    getParent?: () => { getState?: () => unknown } | undefined;
    addListener?: (
      event: string,
      cb: (event: { preventDefault: () => void; data: { action: unknown } }) => void,
    ) => () => void;
    dispatch?: (action: unknown) => void;
  }>();
  const triageDialExpanded = useReportTriageDialExpanded();
  const [isArchiveConfirmVisible, setIsArchiveConfirmVisible] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyPhotos, setReplyPhotos] = useState<SelectedPhoto[]>([]);
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const [dockCompletionPercentage, setDockCompletionPercentage] = useState(0);
  const [savedCompletionPercentage, setSavedCompletionPercentage] = useState(0);
  const allowDockLeaveRef = useRef(false);
  const progressDockDirtyRef = useRef(false);
  const isReplySubmittingRef = useRef(false);

  const detailDock =
    output.detailDock ??
    (output.reportTriage
      ? { mode: "report_reply" as const, completionPercentage: 0 }
      : undefined);
  const showDetailDock = Boolean(detailDock);
  const isReportDock = detailDock?.mode === "report_reply";
  const isPmReportTriage = Boolean(output.reportTriage);
  const showWorkerReportFab = isReportDock && !isPmReportTriage;
  const showReportSpeedDial = isPmReportTriage || showWorkerReportFab;
  const isProgressDock = detailDock?.mode === "progress";
  const progressDockDirty =
    Boolean(isProgressDock) &&
    progressDockIsDirty({
      draft: replyDraft,
      photoCount: replyPhotos.length,
      completionPercentage: dockCompletionPercentage,
      savedCompletionPercentage,
    });
  progressDockDirtyRef.current = progressDockDirty;

  useEffect(() => {
    if (
      detailDock?.mode === "progress" ||
      detailDock?.mode === "awaiting_review" ||
      detailDock?.mode === "review_decision" ||
      detailDock?.mode === "archive"
    ) {
      const server = detailDock.completionPercentage;
      if (detailDock.mode === "progress" && progressDockDirtyRef.current) {
        return;
      }
      setSavedCompletionPercentage(server);
      setDockCompletionPercentage(server);
    }
  }, [detailDock?.completionPercentage, detailDock?.mode, props.taskId]);

  useEffect(() => {
    if (!props.inboundSelectedPhotos?.length) {
      return;
    }
    setReplyPhotos((prev) =>
      mergeUniqueAttachments(prev, props.inboundSelectedPhotos!) as SelectedPhoto[],
    );
  }, [props.inboundSelectedPhotos]);

  const handleConfirmArchive = () => {
    setIsArchiving(true);
    void actions
      .archiveTask()
      .then(() => {
        setIsArchiving(false);
        setIsArchiveConfirmVisible(false);
        // Always leave Detail after archive — return to Activity / Tasks origin.
        props.onNavigateBack?.();
      })
      .catch((error) => {
        setIsArchiving(false);
        Alert.alert(
          "Unable to archive task",
          error instanceof Error ? error.message : "Please try again.",
        );
      });
  };

  const handleAddReplyPhotos = useCallback(() => {
    if (!user?.id || !user.companyId) {
      return;
    }
    navigateToAddPhotosCaptureSession(navigation, {
      returnScreen: "TaskDetail",
      taskId: props.taskId,
      subTaskId: props.subTaskId,
      companyId: user.companyId,
      userId: user.id,
      uploadImmediately: false,
      entityType: "task-update",
      sourceTaskId: props.taskId,
      sourceSubTaskId: props.subTaskId,
    });
  }, [navigation, props.subTaskId, props.taskId, user?.companyId, user?.id]);

  const handleWorkerResolveWithComment = useCallback(() => {
    const note = replyDraft.trim();
    if (!note) {
      Alert.alert(
        "Comment required",
        "Write a short note in the field, then open + and tap Resolve.",
      );
      return;
    }
    if (isReplySubmittingRef.current) {
      return;
    }
    isReplySubmittingRef.current = true;
    setIsReplySubmitting(true);
    void actions
      .resolveReport(note)
      .then(() => {
        setReplyDraft("");
        setReplyPhotos([]);
        isReplySubmittingRef.current = false;
        setIsReplySubmitting(false);
        props.onNavigateBack?.();
      })
      .catch(() => {
        isReplySubmittingRef.current = false;
        setIsReplySubmitting(false);
        Alert.alert(
          t.errors?.error || "Error",
          t.createTask?.resolveReportConfirmBody ||
            "Unable to resolve this report. Try again.",
        );
      });
  }, [
    actions,
    props,
    replyDraft,
    t.createTask?.resolveReportConfirmBody,
    t.errors?.error,
  ]);

  const handleRemoveReplyPhoto = useCallback((index: number) => {
    setReplyPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadReplyPhotos = useCallback(
    async (photosToUpload: SelectedPhoto[]): Promise<string[]> => {
      if (!user?.id || !user.companyId || photosToUpload.length === 0) {
        return [];
      }
      const uploadedUrls: string[] = [];
      for (const photo of photosToUpload) {
        try {
          const uriToUpload = await ensureCappedLocalPhoto(photo);
          const fileInfo = await FileSystem.getInfoAsync(uriToUpload);
          if (!fileInfo.exists) {
            continue;
          }
          const result = await uploadFileWithVerification({
            file: {
              uri: uriToUpload,
              name: photo.fileName,
              type: "image/jpeg",
            },
            entityType: "task-update",
            entityId: props.taskId,
            companyId: user.companyId,
            userId: user.id,
          });
          if (result.success && result.file) {
            uploadedUrls.push(result.file.public_url);
          }
        } catch (error) {
          console.error(error);
        }
      }
      return uploadedUrls;
    },
    [props.taskId, user?.companyId, user?.id],
  );

  const handleSubmitReply = useCallback(async () => {
    const description = replyDraft.trim();
    if (!description || isReplySubmittingRef.current || !detailDock) {
      return;
    }
    Keyboard.dismiss();
    isReplySubmittingRef.current = true;
    setIsReplySubmitting(true);
    try {
      let photoUrls: string[] = [];
      if (replyPhotos.length > 0) {
        photoUrls = await uploadReplyPhotos(replyPhotos);
        if (photoUrls.length < replyPhotos.length) {
          const failedCount = replyPhotos.length - photoUrls.length;
          Alert.alert(
            "Upload Warning",
            `${photoUrls.length} of ${replyPhotos.length} photo(s) uploaded. ${failedCount} failed. Reply will send with the successful photos.`,
          );
        }
      }
      if (detailDock.mode === "progress") {
        await actions.submitDockProgress({
          description,
          photos: photoUrls,
          completionPercentage: dockCompletionPercentage,
        });
        setSavedCompletionPercentage(dockCompletionPercentage);
      } else {
        await actions.replyToReport({
          description,
          photos: photoUrls,
        });
      }
      setReplyDraft("");
      setReplyPhotos([]);
    } catch {
      Alert.alert(
        t.errors?.error || "Error",
        detailDock.mode === "progress"
          ? t.taskDetail?.failedToSubmitUpdate || "Failed to submit update"
          : t.createTask?.replyFailed || "Failed to send reply",
      );
    } finally {
      isReplySubmittingRef.current = false;
      setIsReplySubmitting(false);
    }
  }, [
    actions,
    detailDock,
    dockCompletionPercentage,
    replyDraft,
    replyPhotos,
    t.createTask?.replyFailed,
    t.errors?.error,
    t.taskDetail?.failedToSubmitUpdate,
    uploadReplyPhotos,
  ]);

  const resetProgressDockDraft = useCallback(() => {
    setReplyDraft("");
    setReplyPhotos([]);
    setDockCompletionPercentage(savedCompletionPercentage);
  }, [savedCompletionPercentage]);

  const promptProgressDockLeave = useCallback(
    (onLeave: () => void) => {
      if (!isProgressDock || !progressDockDirty) {
        onLeave();
        return;
      }
      if (isReplySubmittingRef.current) {
        return;
      }
      const canSubmit = replyDraft.trim().length > 0;
      const buttons: Array<{
        text: string;
        style?: "cancel" | "destructive" | "default";
        onPress?: () => void;
      }> = [
        { text: "Stay", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            resetProgressDockDraft();
            allowDockLeaveRef.current = true;
            onLeave();
          },
        },
      ];
      if (canSubmit) {
        buttons.push({
          text: "Submit",
          onPress: () => {
            void handleSubmitReply();
          },
        });
      }
      Alert.alert(
        "Submit this update?",
        "Leaving discards the note, photos, and unsaved %.",
        buttons,
      );
    },
    [
      handleSubmitReply,
      isProgressDock,
      progressDockDirty,
      replyDraft,
      resetProgressDockDraft,
    ],
  );

  const handleHeaderBack = useCallback(() => {
    promptProgressDockLeave(() => {
      props.onNavigateBack();
    });
  }, [promptProgressDockLeave, props]);

  useEffect(() => {
    if (typeof navigation.addListener !== "function") {
      return;
    }
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (allowDockLeaveRef.current) {
        return;
      }
      if (detailDock?.mode !== "progress") {
        return;
      }
      if (
        !progressDockShouldInterceptLeave(
          event.data?.action as { type?: string; payload?: { name?: string } },
        )
      ) {
        return;
      }
      if (
        !progressDockIsDirty({
          draft: replyDraft,
          photoCount: replyPhotos.length,
          completionPercentage: dockCompletionPercentage,
          savedCompletionPercentage,
        })
      ) {
        return;
      }
      event.preventDefault();
      promptProgressDockLeave(() => {
        allowDockLeaveRef.current = true;
        navigation.dispatch?.(event.data.action);
      });
    });
    return unsubscribe;
  }, [
    detailDock?.mode,
    dockCompletionPercentage,
    navigation,
    promptProgressDockLeave,
    replyDraft,
    replyPhotos.length,
    savedCompletionPercentage,
  ]);

  const handleCancelDockReview = useCallback(async () => {
    if (isReplySubmitting || detailDock?.mode !== "awaiting_review") {
      return;
    }
    setIsReplySubmitting(true);
    try {
      await actions.cancelDockReview();
      setReplyDraft("");
      setReplyPhotos([]);
    } catch {
      Alert.alert(
        t.errors?.error || "Error",
        t.taskDetail?.failedToSubmitUpdate || "Failed to cancel review",
      );
    } finally {
      setIsReplySubmitting(false);
    }
  }, [actions, detailDock?.mode, isReplySubmitting, t.errors?.error, t.taskDetail?.failedToSubmitUpdate]);

  const handleApproveDockReview = useCallback(() => {
    if (isReplySubmitting || detailDock?.mode !== "review_decision") {
      return;
    }
    setIsReplySubmitting(true);
    void actions
      .approveTask()
      .catch(() => {
        Alert.alert(
          t.errors?.error || "Error",
          t.taskDetail?.failedToSubmitUpdate || "Failed to accept completion",
        );
      })
      .finally(() => {
        setIsReplySubmitting(false);
      });
  }, [actions, detailDock?.mode, isReplySubmitting, t.errors?.error, t.taskDetail?.failedToSubmitUpdate]);

  const handleRejectDockReview = useCallback(() => {
    if (isReplySubmitting || detailDock?.mode !== "review_decision") {
      return;
    }
    if (props.onNavigateToRejectTask) {
      props.onNavigateToRejectTask(props.taskId, props.subTaskId);
    }
  }, [
    detailDock?.mode,
    isReplySubmitting,
    props.onNavigateToRejectTask,
    props.subTaskId,
    props.taskId,
  ]);

  const handleActionPress = (actionId: string) => {
    switch (actionId) {
      case 'accept_task':
        actions.acceptTask();
        break;
      case 'decline_task':
        Alert.prompt("Decline Task", "Reason for declining:", (reason) => {
          if (reason) actions.declineTask(reason);
        });
        break;
      case 'submit_review':
        actions.submitForReview();
        break;
      case 'approve_task':
        actions.approveTask();
        break;
      case 'toggle_critical_this_week':
        actions.toggleCriticalThisWeek();
        break;
      case 'archive_task':
        setIsArchiveConfirmVisible(true);
        break;
      case 'reject_task':
        if (props.onNavigateToRejectTask) {
          props.onNavigateToRejectTask(props.taskId, props.subTaskId);
        }
        break;
      case 'edit_task':
        if (props.onNavigateToCreateTask) {
          props.onNavigateToCreateTask(undefined, undefined, props.taskId, 'edit');
        }
        break;
      case 'reassign_task':
        if (props.onNavigateToCreateTask) {
          props.onNavigateToCreateTask(undefined, undefined, props.taskId, 'reassign');
        }
        break;
      case 'add_comment':
        if (props.onNavigateToCreateTask) {
          props.onNavigateToCreateTask(
            undefined,
            undefined,
            props.taskId,
            'comment',
            props.subTaskId,
          );
        }
        break;
      case 'update_progress':
        if (props.onNavigateToCreateTask) {
          props.onNavigateToCreateTask(
            undefined,
            undefined,
            props.taskId,
            'photos',
            props.subTaskId,
          );
        }
        break;
      case 'upload_photos':
        if (props.onNavigateToCreateTask) {
          props.onNavigateToCreateTask(
            undefined,
            undefined,
            props.taskId,
            'photos',
            props.subTaskId,
          );
        }
        break;
      case 'add_subtask':
        // Deferred product surface (2026-09-07). Handler kept inert so old actionIds
        // cannot open nested Create Task until a future enhancement re-homes the entry.
        break;
    }
  };

  const hasQuickActions = Boolean(output.quickActions?.actions?.length);
  const scrollRegionBottomPadding = showDetailDock ? 24 : 16;

  if (!output.readiness.hasUsableData) {
    // Continuity is always present from the live adapter; optional-chain so a
    // partial mock / future regression cannot crash the loading shell.
    if (output.continuity?.shouldRenderEmptyState) {
      return (
        <SafeAreaView edges={['left', 'right']} className="flex-1 bg-gray-50">
          <ModernScreenHeader
            title="Unavailable"
            titleNode={(
              <BrandHeaderTitle
                label="Unavailable"
                titleTestID="task-detail__header_title"
              />
            )}
            showBackButton={true}
            onBackPress={handleHeaderBack}
          />
          <View
            testID="task-detail__unavailable"
            className="flex-1 items-center justify-center px-8"
          >
            <Text className="text-center text-base font-semibold text-slate-900">
              This task is no longer available
            </Text>
            <Text className="mt-2 text-center text-sm text-slate-500">
              It may have been archived or removed. Go back to your task list.
            </Text>
            {props.onNavigateBack ? (
              <Pressable
                testID="task-detail__unavailable_back"
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={props.onNavigateBack}
                className="mt-6 min-h-[44px] items-center justify-center rounded-2xl bg-[#08576E] px-5"
              >
                <Text className="text-base font-semibold text-white">Go back</Text>
              </Pressable>
            ) : null}
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView edges={['left', 'right']} className="flex-1 bg-gray-50">
        <ModernScreenHeader 
          title="Loading..."
          titleNode={(
            <BrandHeaderTitle
              label="Loading..."
              titleTestID="task-detail__header_title"
            />
          )}
          showBackButton={true}
          onBackPress={handleHeaderBack}
        />
        <View className="flex-1 items-center justify-center">
          <Text>Loading task details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const infoCardModel = output.infoCard
    ? {
        ...output.infoCard,
        title: output.infoCard.title ?? output.taskHero.title,
        statusLabel: output.infoCard.statusLabel ?? output.taskHero.statusLabel,
        categoryLabel: output.infoCard.categoryLabel ?? output.taskHero.categoryLabel,
        completionLabel: output.infoCard.completionLabel ?? output.taskHero.completionLabel,
        dueDateLabel: output.infoCard.dueDateLabel ?? output.taskHero.dueDateLabel,
        isCritical: output.infoCard.isCritical ?? output.taskHero.isCritical,
        criticalLabel: output.infoCard.criticalLabel ?? output.taskHero.criticalLabel,
      }
    : undefined;

  const infoCardNode = infoCardModel ? (
    <TaskDetailInfoCard
      model={infoCardModel}
      onEditPress={
        infoCardModel.showEditAction
          ? () => handleActionPress("edit_task")
          : undefined
      }
      onReassignPress={
        infoCardModel.showReassignAction
          ? () => handleActionPress("reassign_task")
          : undefined
      }
    />
  ) : null;

  const workThreadScroll = (
    <ScrollView
      testID="task-detail__workthread_scroll"
      className="flex-1"
      contentContainerStyle={{
        paddingBottom: scrollRegionBottomPadding,
        flexGrow: 1,
      }}
      scrollEnabled
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {output.banners.map(banner => (
        <BannerPrimitive key={banner.id} contract={mapBannerModelToBannerProps(banner)} />
      ))}

      {hasQuickActions ? (
        <TaskDetailQuickActions
          model={output.quickActions!}
          onPress={handleActionPress}
        />
      ) : null}

      <TaskActivityTimeline
        testID="task-detail__activity_thread"
        thread={output.activityThread}
      />
    </ScrollView>
  );

  return (
    <>
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <ModernScreenHeader 
        title="Task Details"
        titleNode={(
          <View testID="task-detail__header_title_block">
            <BrandHeaderTitle
              label="Task Details"
              titleTestID="task-detail__header_title"
            />
          </View>
        )}
        showBackButton={true}
        onBackPress={handleHeaderBack}
        onNavigateToProfile={props.onNavigateToProfile}
        onNavigateToProjectPicker={props.onNavigateToProjectPicker}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
      <View className="flex-1">
          <View
            testID="task-detail__scroll_region"
            className="flex-1"
            style={
              splitIpadLandscapeMeta
                ? { flex: 1, flexDirection: "row" }
                : { flex: 1 }
            }
          >
          {/* Portrait/phone: info card pinned above the thread. iPad landscape: info left, thread right. */}
          {splitIpadLandscapeMeta ? (
            <>
              <View
                testID="task-detail__meta_column"
                className="border-r border-slate-200"
                style={{ flex: IPAD_TASK_DETAIL_META_FLEX, minWidth: 0 }}
              >
                <ScrollView
                  className="flex-1"
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {infoCardNode}
                </ScrollView>
              </View>
              <View
                testID="task-detail__thread_column"
                style={{ flex: IPAD_TASK_DETAIL_THREAD_FLEX, minWidth: 0 }}
              >
                {workThreadScroll}
              </View>
            </>
          ) : (
            <>
              {infoCardNode}
              {workThreadScroll}
            </>
          )}
          </View>

          {showDetailDock && detailDock ? (
            <ReportReplyComposer
              mode={detailDock.mode}
              placeholder={
                detailDock.mode === "progress"
                  ? t.taskDetail?.updateDescriptionPlaceholder || "Describe what you've done..."
                  : t.createTask?.replyPlaceholder || "Write a reply to the reporter…"
              }
              sendLabel="Send"
              draft={replyDraft}
              photos={replyPhotos}
              isSubmitting={isReplySubmitting}
              onChangeDraft={setReplyDraft}
              onAddPhotos={handleAddReplyPhotos}
              onRemovePhoto={handleRemoveReplyPhoto}
              onSubmit={() => {
                void handleSubmitReply();
              }}
              onCancelReview={
                detailDock.mode === "awaiting_review"
                  ? () => {
                      void handleCancelDockReview();
                    }
                  : undefined
              }
              onApproveReview={
                detailDock.mode === "review_decision"
                  ? () => {
                      handleApproveDockReview();
                    }
                  : undefined
              }
              onRejectReview={
                detailDock.mode === "review_decision"
                  ? () => {
                      handleRejectDockReview();
                    }
                  : undefined
              }
              onArchive={
                detailDock.mode === "archive"
                  ? () => {
                      setIsArchiveConfirmVisible(true);
                    }
                  : undefined
              }
              onReassign={
                detailDock.mode === "reassign"
                  ? () => {
                      handleActionPress("reassign_task");
                    }
                  : undefined
              }
              onPressTriageActions={
                showReportSpeedDial
                  ? () => {
                      toggleReportTriageDialExpanded();
                    }
                  : undefined
              }
              onDismissTriageDial={
                showReportSpeedDial
                  ? () => {
                      setReportTriageDialExpanded(false);
                    }
                  : undefined
              }
              isTriageDialOpen={showReportSpeedDial ? triageDialExpanded : false}
              showReportFab={showWorkerReportFab}
              completionPercentage={dockCompletionPercentage}
              savedCompletionPercentage={savedCompletionPercentage}
              onChangeCompletionPercentage={
                detailDock.mode === "progress" ? setDockCompletionPercentage : undefined
              }
            />
          ) : null}
      </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
      {showReportSpeedDial ? (
        <ReportTriageSpeedDial
          variant={isPmReportTriage ? "pm_triage" : "worker_report"}
          dockHeight={REPORT_REPLY_DOCK_HEIGHT}
          onResolveWithComment={
            showWorkerReportFab ? handleWorkerResolveWithComment : undefined
          }
          onChoose={(action) => {
            const parentNav = navigation.getParent?.() as
              | { getState?: () => unknown }
              | undefined;
            navigateReportTriageAction(parentNav?.getState?.() as any, action);
          }}
        />
      ) : null}
      <ArchiveConfirmSheet
        visible={isArchiveConfirmVisible}
        testIDPrefix="task-detail"
        isConfirming={isArchiving}
        onCancel={() => {
          if (!isArchiving) {
            setIsArchiveConfirmVisible(false);
          }
        }}
        onConfirm={handleConfirmArchive}
      />
    </>
  );
}
