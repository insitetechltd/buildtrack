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
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
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
  /**
   * Last persisted completion. Omitted callers default to `completionPercentage`
   * so % alone does not mark the dock dirty.
   */
  savedCompletionPercentage?: number;
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
/** Closed circle whose next tap posts the update. */
const DOCK_CIRCLE_SEND = {
  ...DOCK_CIRCLE,
  borderWidth: 2,
  borderColor: "#059669",
  backgroundColor: "#f1f5f9",
};
/** Tall enough for multi-step scrubbing; stay open across strokes until tap. */
const SCRUB_TRACK_HEIGHT = 200;
const TAP_MOVE_SLOP = 8;
/** Vertical pixels per 5% step while scrubbing. */
const PX_PER_STEP = 8;
/** Larger percent readout, kept clear of the fingertip while scrubbing. */
const MAGNIFIER_SIZE = 72;
const MAGNIFIER_GAP = 12;
/** Touches this close above the circle still start a scrub. */
const NEAR_TRACK_SLOP = 28;
/** Side slop stays inside the dock gap so the open track does not cover Send. */
const TRACK_SIDE_SLOP = 4;

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

/**
 * Track is a fixed 0–100 scale. The button sits at the current percent,
 * so a second slide that opens at 75% starts 75% up the track. The base stays 0%.
 */
export function completionThumbOffset(percentage: number, travel: number): number {
  if (travel <= 0) return 0;
  const clamped = Math.max(0, Math.min(100, percentage));
  return (clamped / 100) * travel;
}

/** True when a tap lands on the circle that sits at `percentage` along the open track. */
export function tapHitsCompletionThumb(
  x: number,
  y: number,
  percentage: number,
  hitHeight: number,
): boolean {
  if (x < 0 || x > BUTTON_SIZE) return false;
  const travel = SCRUB_TRACK_HEIGHT - BUTTON_SIZE;
  const thumbBottom = completionThumbOffset(percentage, travel);
  const thumbTop = hitHeight - thumbBottom - BUTTON_SIZE;
  return y >= thumbTop && y <= thumbTop + BUTTON_SIZE;
}

export function completionThumbTapPoint(
  percentage: number,
  hitHeight: number = SCRUB_TRACK_HEIGHT,
): { x: number; y: number } {
  const travel = SCRUB_TRACK_HEIGHT - BUTTON_SIZE;
  const thumbBottom = completionThumbOffset(percentage, travel);
  const thumbTop = hitHeight - thumbBottom - BUTTON_SIZE;
  return { x: BUTTON_SIZE / 2, y: thumbTop + BUTTON_SIZE / 2 };
}

/**
 * Server echo of task completion. Skip while the dock is dirty, and skip a
 * stale percent that has not caught up to the value just posted.
 */
export function applyServerCompletion(opts: {
  server: number;
  dirty: boolean;
  pendingSubmit: number | null;
}): { saved: number; dock: number; pendingSubmit: number | null } | null {
  if (opts.dirty) return null;
  if (opts.pendingSubmit != null && opts.server !== opts.pendingSubmit) {
    return null;
  }
  return { saved: opts.server, dock: opts.server, pendingSubmit: null };
}

export type ProgressDockTrailingSlot = "percent" | "armed" | "submit";

/** Routes that stack on Task Detail (push) and must not trip the leave-guard. */
const PHOTO_FLOW_ROUTE_NAMES = new Set([
  "CaptureSession",
  "Camera",
  "PhotoSelection",
  "InAppLibraryPicker",
]);

export function progressDockIsDirty(opts: {
  draft: string;
  photoCount: number;
  completionPercentage: number;
  savedCompletionPercentage: number;
}): boolean {
  return (
    opts.draft.trim().length > 0 ||
    opts.photoCount > 0 ||
    opts.completionPercentage !== opts.savedCompletionPercentage
  );
}

/** True when beforeRemove should show Stay/Discard/Submit (not photo push). */
export function progressDockShouldInterceptLeave(action?: {
  type?: string;
  payload?: { name?: string };
}): boolean {
  const type = action?.type;
  if (type === "PUSH") {
    return false;
  }
  if (
    type === "NAVIGATE" &&
    action?.payload?.name &&
    PHOTO_FLOW_ROUTE_NAMES.has(action.payload.name)
  ) {
    return false;
  }
  return true;
}

/**
 * Progress dock trailing slot — variant 6:
 * clean → grey % press-drag; dirty → ringed % (armed tap-to-submit);
 * dirty + 100% + note → green check. Slider while scrubbing / long-press.
 */
export function progressDockTrailingSlot(opts: {
  completionPercentage: number;
  savedCompletionPercentage?: number;
  draft?: string;
  photoCount?: number;
  forceProgressScrub?: boolean;
  scrubSessionActive?: boolean;
}): ProgressDockTrailingSlot {
  if (opts.forceProgressScrub || opts.scrubSessionActive) {
    return "percent";
  }
  const saved = opts.savedCompletionPercentage ?? opts.completionPercentage;
  const draft = opts.draft ?? "";
  const dirty = progressDockIsDirty({
    draft,
    photoCount: opts.photoCount ?? 0,
    completionPercentage: opts.completionPercentage,
    savedCompletionPercentage: saved,
  });
  if (dirty && opts.completionPercentage >= 100 && draft.trim().length > 0) {
    return "submit";
  }
  if (dirty) {
    return "armed";
  }
  return "percent";
}

type CompletionScrubButtonProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Mount already expanded (e.g. long-press submit at 100%). */
  startExpanded?: boolean;
  /** Finger-down on the compact chip or remounted leave-100% track. */
  onSessionStart?: () => void;
  /** Fired when the scrubber retracts after a press-drag (or cancel tap). */
  onRetract?: () => void;
  /** Parent bumps this to close the track (note focus or Send). */
  closeToken?: number;
  /** Note has text, so a tap on the closed circle may post. */
  canSend?: boolean;
  onSend?: () => void;
  /** True after a percent change has been closed and the circle will send. */
  onSendArmedChange?: (armed: boolean) => void;
};

/**
 * Progress % control.
 *
 * A press on the circle opens the track (base 0%, top 100%) with the button
 * already at the current percent. That finger can scrub. Lift keeps the track
 * open so another press along it can scrub, including down from 100%. A tap
 * on the circle that sits on the track closes it. A tap at the dock slot does
 * not. After the percent has changed, that closed circle gets a green outline
 * and a single tap sends. A vertical drag on the outlined circle opens the
 * track again instead of sending.
 */
function CompletionScrubButton({
  value,
  onChange,
  disabled = false,
  startExpanded = false,
  onSessionStart,
  onRetract,
  closeToken = 0,
  canSend = false,
  onSend,
  onSendArmedChange,
}: CompletionScrubButtonProps) {
  const [isOpen, setIsOpen] = useState(startExpanded);
  const isOpenRef = useRef(startExpanded);
  // Full-track hits turn on only after the finger is up. Growing the
  // responder while a press is active cancels the gesture on iOS.
  const [trackArmed, setTrackArmed] = useState(startExpanded);
  const trackArmedRef = useRef(startExpanded);
  const startPctRef = useRef(value);
  const didMoveRef = useRef(false);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  const onSessionStartRef = useRef(onSessionStart);
  const onRetractRef = useRef(onRetract);
  const canSendRef = useRef(canSend);
  const onSendRef = useRef(onSend);
  const onSendArmedChangeRef = useRef(onSendArmedChange);
  const [sendArmed, setSendArmed] = useState(false);
  const sendArmedRef = useRef(false);
  const changedRef = useRef(false);
  const pendingSendRef = useRef(false);
  const [magnifier, setMagnifier] = useState<{
    x: number;
    y: number;
    percent: number;
  } | null>(null);
  valueRef.current = value;
  onChangeRef.current = onChange;
  disabledRef.current = disabled;
  onSessionStartRef.current = onSessionStart;
  onRetractRef.current = onRetract;
  canSendRef.current = canSend;
  onSendRef.current = onSend;
  onSendArmedChangeRef.current = onSendArmedChange;
  isOpenRef.current = isOpen;

  const retractScrubber = useCallback(() => {
    const wasOpen = isOpenRef.current;
    isOpenRef.current = false;
    setIsOpen(false);
    didMoveRef.current = false;
    startPctRef.current = valueRef.current;
    trackArmedRef.current = false;
    setTrackArmed(false);
    setMagnifier(null);
    if (sendArmedRef.current) {
      sendArmedRef.current = false;
      setSendArmed(false);
    }
    if (wasOpen) {
      onRetractRef.current?.();
    }
  }, []);

  const armSendAfterChange = useCallback(() => {
    if (!changedRef.current) {
      return;
    }
    sendArmedRef.current = true;
    setSendArmed(true);
  }, []);

  useEffect(() => {
    if (disabled && isOpen) {
      retractScrubber();
    }
  }, [disabled, isOpen, retractScrubber]);

  useEffect(() => {
    if (startExpanded && !isOpenRef.current && !disabledRef.current) {
      Keyboard.dismiss();
      isOpenRef.current = true;
      setIsOpen(true);
    }
  }, [startExpanded]);

  useEffect(() => {
    if (closeToken > 0 && isOpenRef.current) {
      retractScrubber();
      armSendAfterChange();
    }
  }, [closeToken, retractScrubber, armSendAfterChange]);

  useEffect(() => {
    onSendArmedChangeRef.current?.(sendArmed);
  }, [sendArmed]);

  // While a finger is down the hit view stays the size it had at grant.
  // After lift, the open track grows to the full slider so the next press
  // can start anywhere along it.
  const pan = useRef(
    Gesture.Pan()
      .minDistance(0)
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .cancelsTouchesInView(true)
      .blocksExternalGesture()
      .hitSlop({
        top: NEAR_TRACK_SLOP,
        bottom: 12,
        left: TRACK_SIDE_SLOP,
        right: TRACK_SIDE_SLOP,
      })
      .runOnJS(true)
      .onBegin(() => {
        if (disabledRef.current) {
          return;
        }
        Keyboard.dismiss();
        didMoveRef.current = false;
        setMagnifier(null);
        startPctRef.current = valueRef.current;
        onSessionStartRef.current?.();
        const tapWillSend =
          sendArmedRef.current && canSendRef.current && !isOpenRef.current;
        pendingSendRef.current = tapWillSend;
        if (!tapWillSend && !isOpenRef.current) {
          isOpenRef.current = true;
          setIsOpen(true);
        }
      })
      .onUpdate((event) => {
        if (disabledRef.current) {
          return;
        }
        const vertical = Math.abs(event.translationY) > TAP_MOVE_SLOP;
        if (!vertical) {
          setMagnifier(null);
          return;
        }
        if (pendingSendRef.current) {
          pendingSendRef.current = false;
          if (!isOpenRef.current) {
            isOpenRef.current = true;
            setIsOpen(true);
          }
        }
        didMoveRef.current = true;
        changedRef.current = true;
        const next = completionFromVerticalDrag(startPctRef.current, event.translationY);
        onChangeRef.current(next);
        const hitHeight = trackArmedRef.current ? SCRUB_TRACK_HEIGHT : BUTTON_SIZE;
        setMagnifier({
          x: event.x ?? BUTTON_SIZE / 2,
          y: (event.y ?? BUTTON_SIZE / 2) + (BUTTON_SIZE - hitHeight),
          percent: next,
        });
      })
      .onFinalize((event) => {
        setMagnifier(null);
        if (pendingSendRef.current && !didMoveRef.current) {
          pendingSendRef.current = false;
          sendArmedRef.current = false;
          changedRef.current = false;
          setSendArmed(false);
          onSendRef.current?.();
          return;
        }
        pendingSendRef.current = false;
        if (!isOpenRef.current) {
          return;
        }
        // First press, or a scrub, leaves the track up for another stroke.
        if (didMoveRef.current || !trackArmedRef.current) {
          trackArmedRef.current = true;
          setTrackArmed(true);
          return;
        }
        const point = event ?? { x: -1, y: -1 };
        if (
          !tapHitsCompletionThumb(
            point.x ?? -1,
            point.y ?? -1,
            valueRef.current,
            SCRUB_TRACK_HEIGHT,
          )
        ) {
          return;
        }
        retractScrubber();
        armSendAfterChange();
      }),
  ).current;

  // 0% at the base, 100% at the top. Reopening at 75% starts the button there.
  const thumbTravel = SCRUB_TRACK_HEIGHT - BUTTON_SIZE;
  const thumbBottom = isOpen ? completionThumbOffset(value, thumbTravel) : 0;
  const showSendOutline = sendArmed && !isOpen && canSend;

  return (
    // Layout slot always matches peer dock circles — scrub overlays upward.
    <View
      testID="report-reply-composer__completion"
      accessibilityLabel={
        isOpen
          ? `Completion ${value} percent. Slide anywhere on the track. Tap the note or Send to close.`
          : `Completion ${value} percent. Press and drag to adjust.`
      }
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 0, max: 100, now: value }}
      accessibilityState={{ expanded: isOpen }}
      className="relative z-50"
      collapsable={false}
      pointerEvents="box-none"
      style={{
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        overflow: "visible",
      }}
    >
      {isOpen ? (
        <View
          testID="report-reply-composer__completion_scrubber"
          pointerEvents="none"
          className="absolute items-center"
          style={{
            bottom: 0,
            left: 0,
            width: BUTTON_SIZE,
            height: SCRUB_TRACK_HEIGHT,
            zIndex: 40,
          }}
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
              height: Math.max(4, thumbBottom),
              left: (BUTTON_SIZE - 5) / 2,
            }}
          />
        </View>
      ) : null}
      {magnifier ? (
        <View
          testID="report-reply-composer__completion_magnifier"
          pointerEvents="none"
          style={{
            position: "absolute",
            width: MAGNIFIER_SIZE,
            height: MAGNIFIER_SIZE,
            borderRadius: MAGNIFIER_SIZE / 2,
            left: magnifier.x - MAGNIFIER_SIZE - MAGNIFIER_GAP,
            top: magnifier.y - MAGNIFIER_SIZE - MAGNIFIER_GAP,
            backgroundColor: "#ffffff",
            borderWidth: 2,
            borderColor: "#08576E",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 80,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#08576E" }}>
            {magnifier.percent}%
          </Text>
        </View>
      ) : null}
      <GestureDetector gesture={pan}>
        <View
          testID="report-reply-composer__completion_hit"
          collapsable={false}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: BUTTON_SIZE,
            // 44 while the opening finger is down. Full track only after lift.
            height: trackArmed ? SCRUB_TRACK_HEIGHT : BUTTON_SIZE,
            justifyContent: "flex-end",
            zIndex: 50,
          }}
        >
          <View
            testID="report-reply-composer__completion_thumb"
            pointerEvents="none"
            style={{
              ...(isOpen
                ? {
                    position: "absolute" as const,
                    bottom: thumbBottom,
                    left: 0,
                  }
                : null),
              ...(showSendOutline ? DOCK_CIRCLE_SEND : DOCK_CIRCLE_IDLE),
            }}
          >
            <Text className="text-[11px] font-bold text-[#08576E]">{value}%</Text>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

/**
 * Task Detail dock (approach B) — stays on the screen, not the root tab bar.
 * Report:   [+] · [text] · [camera] · [send]
 * Progress: [camera] · [text] · [% circle, same press every time] · [send when the note has text]
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
    mode === "progress" &&
    completionPercentage >= 100 &&
    draft.trim().length > 0;
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
            : mode === "progress"
              ? `Submit update, ${completionPercentage} percent`
              : sendLabel;
  const showLeadingFab = Boolean(onPressTriageActions) || showReportFab;

  const [scrubCloseToken, setScrubCloseToken] = useState(0);
  const [circleSendArmed, setCircleSendArmed] = useState(false);
  const closeProgressScrubber = useCallback(() => {
    setScrubCloseToken((token) => token + 1);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!canSend) {
      return;
    }
    Keyboard.dismiss();
    closeProgressScrubber();
    onSubmit();
  }, [canSend, closeProgressScrubber, onSubmit]);

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
    closeProgressScrubber();
    if (isTriageDialOpen) {
      onDismissTriageDial?.();
    }
  }, [closeProgressScrubber, isTriageDialOpen, onDismissTriageDial]);

  const bottomPad = Math.max(insets.bottom, 8);
  const showLockedCompletion =
    (isAwaitingReview || isReviewDecision) && showCompletion;
  const leadingFabLocked = controlsLocked;
  const isProgressMode = mode === "progress";

  const showProgressScrubTrailing =
    isProgressMode && Boolean(onChangeCompletionPercentage);
  const noteHasText = draft.trim().length > 0;
  // Report / awaiting keep leading % (locked) and trailing camera+send.
  const showLeadingCompletion = showCompletion && !isProgressMode;

  const handleProgressScrubSessionStart = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    Keyboard.dismiss();
  }, [isSubmitting]);

  const photoButton = !isReviewDecision ? (
    <Pressable
      testID="report-reply-composer__photo"
      accessibilityRole="button"
      accessibilityLabel="Add photo"
      onPress={onAddPhotos}
      disabled={controlsLocked}
      hitSlop={4}
      style={controlsLocked ? DOCK_CIRCLE_LOCKED : DOCK_CIRCLE_IDLE}
    >
      <Ionicons
        name="camera-outline"
        size={22}
        color={controlsLocked ? "#94a3b8" : "#08576E"}
      />
    </Pressable>
  ) : null;

  const sendButton = !isReviewDecision && (!isProgressMode || noteHasText) ? (
    <Pressable
      testID="report-reply-composer__send"
      accessibilityRole="button"
      accessibilityLabel={resolvedSendLabel}
      onPress={handleSubmit}
      disabled={isProgressMode ? isSubmitting || !canSend : !canSend}
      hitSlop={4}
      style={
        isAwaitingReview
          ? DOCK_CIRCLE_LOCKED
          : !canSend
            ? DOCK_CIRCLE_IDLE
            : {
                ...DOCK_CIRCLE,
                borderColor: isReadyToSubmitReview ? "#059669" : "#08576E",
                backgroundColor: isReadyToSubmitReview ? "#059669" : "#08576E",
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
  ) : null;

  const progressScrubTrailing =
    showProgressScrubTrailing && onChangeCompletionPercentage ? (
      <CompletionScrubButton
        value={completionPercentage}
        onChange={onChangeCompletionPercentage}
        disabled={isSubmitting}
        onSessionStart={handleProgressScrubSessionStart}
        closeToken={scrubCloseToken}
        canSend={canSend}
        onSend={handleSubmit}
        onSendArmedChange={setCircleSendArmed}
      />
    ) : null;

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

        {/* Progress: camera leads. Report/awaiting keep prior order. */}
        {isProgressMode ? photoButton : null}

        {showLeadingCompletion ? (
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

        {/* Progress: percent circle always. Send appears beside the note once it has text. */}
        {isProgressMode ? (
          <>
            {progressScrubTrailing}
            {circleSendArmed && noteHasText ? null : sendButton}
          </>
        ) : !isReviewDecision ? (
          <>
            {photoButton}
            {sendButton}
          </>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
