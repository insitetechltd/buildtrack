import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  PanResponder,
  type PanResponderGestureState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@/utils/cn";
import type { SelectedPhoto } from "@/utils/usePhotoSelection";

export type TaskDetailDockMode =
  | "report_reply"
  | "progress"
  | "awaiting_review"
  | "review_decision"
  | "archive"
  | "reassign";

export type ReportReplyComposerProps = {
  mode?: TaskDetailDockMode;
  placeholder?: string;
  sendLabel?: string;
  isSubmitting?: boolean;
  draft: string;
  photos: SelectedPhoto[];
  onChangeDraft: (value: string) => void;
  onAddPhotos: () => void;
  onRemovePhoto: (index: number) => void;
  onSubmit: () => void;
  /** Awaiting-review mode: withdraw submission. */
  onCancelReview?: () => void;
  /** Review-decision mode: creator Accept / Reject. */
  onApproveReview?: () => void;
  onRejectReview?: () => void;
  /** Archive mode: confirm archive after approval. */
  onArchive?: () => void;
  /** Reassign mode: after worker decline — creator/PM reassigns. */
  onReassign?: () => void;
  /** Opens special-function dial (report: Create task / Resolve). */
  onPressTriageActions?: () => void;
  onDismissTriageDial?: () => void;
  isTriageDialOpen?: boolean;
  /**
   * Report follow-up for workers: show peer + FAB chrome without triage dial.
   * PM triage still passes onPressTriageActions.
   */
  showReportFab?: boolean;
  /** Progress / awaiting-review / review_decision / archive — hidden on reported. */
  completionPercentage?: number;
  onChangeCompletionPercentage?: (value: number) => void;
};

/** Match TextField chrome min height (44). Circles stay bottom-aligned when input grows. */
const BUTTON_SIZE = 44;
/** Explicit layout so NativeWind border classes cannot desync peer circle sizes. */
const DOCK_CIRCLE = {
  height: BUTTON_SIZE,
  width: BUTTON_SIZE,
  borderRadius: BUTTON_SIZE / 2,
  borderWidth: 1,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
/** Shared idle chrome for + / camera / disabled send peers. */
const DOCK_CIRCLE_IDLE = {
  ...DOCK_CIRCLE,
  borderColor: "#cbd5e1",
  backgroundColor: "#f1f5f9",
};
const DOCK_CIRCLE_LOCKED = {
  ...DOCK_CIRCLE_IDLE,
  opacity: 0.5,
};
const BUTTON = "items-center justify-center rounded-full";
/** Tall enough for multi-step scrubbing; stay open across strokes until tap. */
const SCRUB_TRACK_HEIGHT = 200;
const TAP_MOVE_SLOP = 8;
/** Vertical pixels per 5% step while scrubbing. */
const PX_PER_STEP = 8;

function snapCompletion(value: number): number {
  const snapped = Math.round(value / 5) * 5;
  return Math.max(0, Math.min(100, snapped));
}

/** Pure helper for vertical scrub math (up = more done). */
export function completionFromVerticalDrag(
  startPercentage: number,
  dy: number,
  pxPerStep: number = PX_PER_STEP,
): number {
  const deltaSteps = Math.round(-dy / pxPerStep);
  return snapCompletion(startPercentage + deltaSteps * 5);
}

type CompletionScrubButtonProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

/**
 * Circular % control with tap-to-toggle vertical scrubber.
 * Tap open → slide (can re-grab) → tap again to commit/hide.
 */
function CompletionScrubButton({
  value,
  onChange,
  disabled = false,
}: CompletionScrubButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(false);
  const startPctRef = useRef(value);
  const didMoveRef = useRef(false);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  valueRef.current = value;
  onChangeRef.current = onChange;
  disabledRef.current = disabled;
  isOpenRef.current = isOpen;

  // Collapse scrubber when submit (or any lock) disables the control.
  useEffect(() => {
    if (disabled && isOpen) {
      isOpenRef.current = false;
      setIsOpen(false);
    }
  }, [disabled, isOpen]);

  const openScrubber = useCallback(() => {
    if (disabledRef.current) {
      return;
    }
    Keyboard.dismiss();
    isOpenRef.current = true;
    setIsOpen(true);
  }, []);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isOpenRef.current && !disabledRef.current,
      onMoveShouldSetPanResponder: (_, gesture) =>
        isOpenRef.current &&
        !disabledRef.current &&
        (Math.abs(gesture.dy) > TAP_MOVE_SLOP || Math.abs(gesture.dx) > TAP_MOVE_SLOP),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        didMoveRef.current = false;
        startPctRef.current = valueRef.current;
      },
      onPanResponderMove: (_evt, gesture: PanResponderGestureState) => {
        if (!isOpenRef.current || disabledRef.current) {
          return;
        }
        if (
          Math.abs(gesture.dy) > TAP_MOVE_SLOP ||
          Math.abs(gesture.dx) > TAP_MOVE_SLOP
        ) {
          didMoveRef.current = true;
        }
        if (!didMoveRef.current) {
          return;
        }
        onChangeRef.current(
          completionFromVerticalDrag(startPctRef.current, gesture.dy),
        );
      },
      onPanResponderRelease: () => {
        if (!isOpenRef.current) {
          return;
        }
        // Tap (no meaningful drag) while open → finish / hide.
        if (!didMoveRef.current) {
          isOpenRef.current = false;
          setIsOpen(false);
        }
        // Drag release keeps scrubber open for another stroke.
        didMoveRef.current = false;
        startPctRef.current = valueRef.current;
      },
      onPanResponderTerminate: () => {
        didMoveRef.current = false;
        startPctRef.current = valueRef.current;
      },
    }),
  ).current;

  // Thumb sits on the track: 0% at bottom, 100% at top.
  const thumbBottom = (value / 100) * (SCRUB_TRACK_HEIGHT - BUTTON_SIZE);

  if (!isOpen) {
    return (
      <Pressable
        testID="report-reply-composer__completion"
        accessibilityRole="button"
        accessibilityLabel={`Completion ${value} percent. Tap to adjust.`}
        accessibilityValue={{ min: 0, max: 100, now: value }}
        disabled={disabled}
        onPress={openScrubber}
        hitSlop={4}
        style={DOCK_CIRCLE_IDLE}
        className={cn(BUTTON, "relative z-50")}
      >
        <Text className="text-[11px] font-bold text-[#08576E]">{value}%</Text>
      </Pressable>
    );
  }

  return (
    <View
      testID="report-reply-composer__completion"
      accessibilityLabel={`Completion ${value} percent. Slide vertically, then tap to finish.`}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 0, max: 100, now: value }}
      accessibilityState={{ expanded: true }}
      className="relative z-50"
      style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
      collapsable={false}
    >
      {/* Full-height hit target so track + thumb are all draggable / tappable. */}
      <View
        testID="report-reply-composer__completion_scrubber"
        {...pan.panHandlers}
        className="absolute items-center"
        style={{
          bottom: 0,
          left: 0,
          width: BUTTON_SIZE,
          height: SCRUB_TRACK_HEIGHT,
        }}
        collapsable={false}
      >
        <View
          className="absolute rounded-full bg-slate-200"
          style={{
            bottom: BUTTON_SIZE / 2,
            width: 5,
            height: SCRUB_TRACK_HEIGHT - BUTTON_SIZE,
            left: (BUTTON_SIZE - 5) / 2,
          }}
        />
        <View
          className="absolute rounded-full bg-[#08576E]"
          style={{
            bottom: BUTTON_SIZE / 2,
            width: 5,
            height: Math.max(4, (value / 100) * (SCRUB_TRACK_HEIGHT - BUTTON_SIZE)),
            left: (BUTTON_SIZE - 5) / 2,
          }}
        />
        <View
          testID="report-reply-composer__completion_thumb"
          className="absolute items-center justify-center rounded-full border-2 border-[#08576E] bg-white shadow-md"
          style={{
            bottom: thumbBottom,
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            left: 0,
          }}
        >
          <Text className="text-[11px] font-bold text-[#08576E]">{value}%</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Task Detail dock (approach B) — stays on the screen, not the root tab bar.
 * Report:   [+] · [text] · [camera] · [send]
 * Progress: [% tap scrub] · [text] · [camera] · [send|✓]
 * Awaiting: [% locked] · [Cancel review] · [cam locked] · [✓ locked]
 * Review:   [% locked] · [Reject] · [Accept]
 * Archive:  [Archive]
 */
export default function ReportReplyComposer({
  mode = "report_reply",
  placeholder = "Write a reply…",
  sendLabel = "Send",
  isSubmitting = false,
  draft,
  photos,
  onChangeDraft,
  onAddPhotos,
  onRemovePhoto,
  onSubmit,
  onCancelReview,
  onApproveReview,
  onRejectReview,
  onArchive,
  onReassign,
  onPressTriageActions,
  onDismissTriageDial,
  isTriageDialOpen = false,
  showReportFab = false,
  completionPercentage = 0,
  onChangeCompletionPercentage,
}: ReportReplyComposerProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const isAwaitingReview = mode === "awaiting_review";
  const isReviewDecision = mode === "review_decision";
  const isArchiveMode = mode === "archive";
  const isReassignMode = mode === "reassign";
  const controlsLocked =
    isAwaitingReview ||
    isReviewDecision ||
    isArchiveMode ||
    isReassignMode ||
    isSubmitting;
  const showCompletion =
    (mode === "progress" ||
      mode === "awaiting_review" ||
      mode === "review_decision") &&
    (Boolean(onChangeCompletionPercentage) ||
      mode === "awaiting_review" ||
      mode === "review_decision");
  const isReadyToSubmitReview =
    mode === "progress" && completionPercentage >= 100;
  const canSend =
    !isAwaitingReview &&
    !isReviewDecision &&
    !isArchiveMode &&
    !isReassignMode &&
    draft.trim().length > 0 &&
    !isSubmitting;
  const resolvedSendLabel = isAwaitingReview
    ? "Submit for review (locked)"
    : isReviewDecision
      ? "Review decision"
      : isArchiveMode
        ? "Archive"
        : isReassignMode
          ? "Reassign"
          : isReadyToSubmitReview
            ? "Submit for review"
            : sendLabel;
  const showLeadingFab = Boolean(onPressTriageActions) || showReportFab;

  const handleSubmit = useCallback(() => {
    if (!canSend) {
      return;
    }
    onSubmit();
  }, [canSend, onSubmit]);

  const handleCancelReview = useCallback(() => {
    if (isSubmitting || !onCancelReview) {
      return;
    }
    onCancelReview();
  }, [isSubmitting, onCancelReview]);

  const handleApproveReview = useCallback(() => {
    if (isSubmitting || !onApproveReview) {
      return;
    }
    onApproveReview();
  }, [isSubmitting, onApproveReview]);

  const handleRejectReview = useCallback(() => {
    if (isSubmitting || !onRejectReview) {
      return;
    }
    onRejectReview();
  }, [isSubmitting, onRejectReview]);

  const handleArchive = useCallback(() => {
    if (isSubmitting || !onArchive) {
      return;
    }
    onArchive();
  }, [isSubmitting, onArchive]);

  const handleReassign = useCallback(() => {
    if (isSubmitting || !onReassign) {
      return;
    }
    onReassign();
  }, [isSubmitting, onReassign]);

  const handleLeadingFabPress = useCallback(() => {
    if (onPressTriageActions) {
      Keyboard.dismiss();
      onPressTriageActions();
      return;
    }
    // Worker report: showReportFab without dial wiring — focus composer.
    inputRef.current?.focus();
  }, [onPressTriageActions]);

  const handleFocusInput = useCallback(() => {
    setFocused(true);
    if (isTriageDialOpen) {
      onDismissTriageDial?.();
    }
  }, [isTriageDialOpen, onDismissTriageDial]);

  const bottomPad = Math.max(insets.bottom, 8);
  const showLockedCompletion =
    (isAwaitingReview || isReviewDecision) && showCompletion;
  const leadingFabLocked = controlsLocked;

  if (isArchiveMode || isReassignMode) {
    const actionTestId = isArchiveMode
      ? "report-reply-composer__archive"
      : "report-reply-composer__reassign";
    const actionLabel = isArchiveMode ? "Archive task" : "Reassign task";
    const actionTitle = isArchiveMode ? "Archive" : "Reassign";
    const onPressAction = isArchiveMode ? handleArchive : handleReassign;
    return (
      <View
        className="border-t border-slate-200 bg-white px-3 pt-2.5"
        style={{ paddingBottom: bottomPad }}
        testID="report-reply-composer"
      >
        <Pressable
          testID={actionTestId}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onPressAction}
          disabled={isSubmitting}
          className={cn(
            "min-h-[44px] items-center justify-center rounded-2xl border px-3 py-2",
            isSubmitting
              ? "border-slate-200 bg-slate-100"
              : "border-slate-300 bg-slate-900",
          )}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#64748b" size="small" />
          ) : (
            <Text className="text-base font-semibold text-white">{actionTitle}</Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      className="overflow-visible border-t border-slate-200 bg-white"
      testID="report-reply-composer"
    >
      {photos.length > 0 && !isAwaitingReview && !isReviewDecision ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="border-b border-slate-100 px-3 py-2"
          testID="report-reply-composer__photos"
        >
          {photos.map((photo, index) => (
            <View
              key={`${photo.uri}-${index}`}
              className="relative mr-2"
              testID={`report-reply-composer__photo_${index}`}
            >
              <Image
                source={{ uri: photo.annotatedUri || photo.uri }}
                className="h-14 w-14 rounded-lg bg-slate-100"
              />
              <Pressable
                testID={`report-reply-composer__photo_remove_${index}`}
                onPress={() => onRemovePhoto(index)}
                disabled={isSubmitting}
                className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-slate-800"
                hitSlop={8}
              >
                <Ionicons name="close" size={14} color="#ffffff" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View
        className="flex-row items-end gap-2 overflow-visible px-3 pt-2.5"
        style={{ paddingBottom: bottomPad }}
      >
        {showLeadingFab ? (
          <Pressable
            testID="report-reply-composer__triage_action"
            accessibilityRole="button"
            accessibilityLabel={
              onPressTriageActions
                ? isTriageDialOpen
                  ? "Close triage options"
                  : "Open triage options"
                : "Add to report"
            }
            onPress={handleLeadingFabPress}
            disabled={leadingFabLocked}
            hitSlop={4}
            style={
              leadingFabLocked
                ? DOCK_CIRCLE_LOCKED
                : isTriageDialOpen
                  ? {
                      ...DOCK_CIRCLE,
                      borderColor: "#08576E",
                      backgroundColor: "#08576E",
                    }
                  : DOCK_CIRCLE_IDLE
            }
          >
            <Ionicons
              name={isTriageDialOpen ? "close" : "add"}
              size={22}
              color={
                leadingFabLocked
                  ? "#94a3b8"
                  : isTriageDialOpen
                    ? "#ffffff"
                    : "#08576E"
              }
            />
          </Pressable>
        ) : null}

        {showCompletion ? (
          showLockedCompletion ? (
            <View
              testID="report-reply-composer__completion"
              accessibilityLabel={`Completion ${completionPercentage} percent (locked)`}
              style={DOCK_CIRCLE_LOCKED}
            >
              <Text className="text-[11px] font-bold text-slate-400">
                {completionPercentage}%
              </Text>
            </View>
          ) : onChangeCompletionPercentage ? (
            <CompletionScrubButton
              value={completionPercentage}
              onChange={onChangeCompletionPercentage}
              disabled={isSubmitting}
            />
          ) : null
        ) : null}

        {isReviewDecision ? (
          <>
            <Pressable
              testID="report-reply-composer__reject"
              accessibilityRole="button"
              accessibilityLabel="Reject"
              onPress={handleRejectReview}
              disabled={isSubmitting}
              className={cn(
                "min-h-[44px] flex-1 items-center justify-center rounded-2xl border px-3 py-2",
                isSubmitting
                  ? "border-slate-200 bg-slate-100"
                  : "border-red-300 bg-red-50",
              )}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#b91c1c" size="small" />
              ) : (
                <Text className="text-base font-semibold text-red-700">Reject</Text>
              )}
            </Pressable>
            <Pressable
              testID="report-reply-composer__approve"
              accessibilityRole="button"
              accessibilityLabel="Accept"
              onPress={handleApproveReview}
              disabled={isSubmitting}
              className={cn(
                "min-h-[44px] flex-1 items-center justify-center rounded-2xl border px-3 py-2",
                isSubmitting
                  ? "border-slate-200 bg-slate-100"
                  : "border-emerald-600 bg-emerald-600",
              )}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-base font-semibold text-white">Accept</Text>
              )}
            </Pressable>
          </>
        ) : isAwaitingReview ? (
          <Pressable
            testID="report-reply-composer__cancel_review"
            accessibilityRole="button"
            accessibilityLabel="Cancel review"
            onPress={handleCancelReview}
            disabled={isSubmitting}
            className={cn(
              "min-h-[44px] flex-1 items-center justify-center rounded-2xl border px-3 py-2",
              isSubmitting
                ? "border-slate-200 bg-slate-100"
                : "border-amber-300 bg-amber-50",
            )}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#b45309" size="small" />
            ) : (
              <Text className="text-base font-semibold text-amber-800">
                Cancel review
              </Text>
            )}
          </Pressable>
        ) : (
          <View
            className={cn(
              "min-h-[44px] flex-1 flex-row items-end rounded-2xl border bg-slate-50 px-3 py-2",
              focused ? "border-[#0D6E87] bg-white" : "border-slate-200",
            )}
          >
            <TextInput
              ref={inputRef}
              testID="report-reply-composer__input"
              value={draft}
              onChangeText={onChangeDraft}
              placeholder={placeholder}
              placeholderTextColor="#94a3b8"
              multiline
              editable={!isSubmitting}
              onFocus={handleFocusInput}
              onBlur={() => setFocused(false)}
              className="max-h-28 flex-1 text-base text-slate-900"
              style={{ paddingTop: Platform.OS === "ios" ? 8 : 6, paddingBottom: 6 }}
            />
          </View>
        )}

        {!isReviewDecision ? (
          <>
            <Pressable
              testID="report-reply-composer__photo"
              accessibilityRole="button"
              accessibilityLabel="Add photo"
              onPress={onAddPhotos}
              disabled={controlsLocked}
              hitSlop={4}
              style={
                controlsLocked
                  ? DOCK_CIRCLE_LOCKED
                  : DOCK_CIRCLE_IDLE
              }
            >
              <Ionicons
                name="camera-outline"
                size={22}
                color={controlsLocked ? "#94a3b8" : "#08576E"}
              />
            </Pressable>

            <Pressable
              testID="report-reply-composer__send"
              accessibilityRole="button"
              accessibilityLabel={resolvedSendLabel}
              onPress={handleSubmit}
              disabled={!canSend}
              hitSlop={4}
              style={
                isAwaitingReview
                  ? DOCK_CIRCLE_LOCKED
                  : !canSend
                    ? DOCK_CIRCLE_IDLE
                    : {
                        ...DOCK_CIRCLE,
                        borderColor: isReadyToSubmitReview ? "#059669" : "#08576E",
                        backgroundColor: isReadyToSubmitReview
                          ? "#059669"
                          : "#08576E",
                      }
              }
            >
              {isSubmitting && !isAwaitingReview ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Ionicons
                  name={isReadyToSubmitReview || isAwaitingReview ? "checkmark" : "send"}
                  size={22}
                  color={canSend ? "#ffffff" : "#94a3b8"}
                />
              )}
            </Pressable>
          </>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
