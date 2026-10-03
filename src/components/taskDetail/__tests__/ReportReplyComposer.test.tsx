import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

/** Captures Gesture.Pan callbacks so Jest can drive press-drag without a native host. */
const scrubGesture: {
  onBegin?: () => void;
  onUpdate?: (event: { translationX: number; translationY: number; x: number; y: number }) => void;
  onFinalize?: () => void;
} = {};

jest.mock("react-native-gesture-handler", () => {
  const chain = () => {
    const api = {
      enabled: () => api,
      minDistance: () => api,
      maxPointers: () => api,
      shouldCancelWhenOutside: () => api,
      cancelsTouchesInView: () => api,
      hitSlop: () => api,
      blocksExternalGesture: () => api,
      failOffsetX: () => api,
      runOnJS: () => api,
      onBegin: (fn: () => void) => {
        scrubGesture.onBegin = fn;
        return api;
      },
      onUpdate: (fn: (event: { translationX: number; translationY: number; x: number; y: number }) => void) => {
        scrubGesture.onUpdate = fn;
        return api;
      },
      onFinalize: (fn: () => void) => {
        scrubGesture.onFinalize = fn;
        return api;
      },
    };
    return api;
  };
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: { Pan: chain },
  };
});

import ReportReplyComposer from "../ReportReplyComposer";

function grantCompletion() {
  act(() => {
    scrubGesture.onBegin?.();
  });
}

function moveCompletion(
  translationY: number,
  translationX = 0,
  point: { x: number; y: number } = { x: 22, y: 22 },
) {
  act(() => {
    scrubGesture.onUpdate?.({ translationX, translationY, ...point });
  });
}

function releaseCompletion() {
  act(() => {
    scrubGesture.onFinalize?.();
  });
}

function ProgressDockHarness({
  initialPercentage,
  initialDraft = "",
  savedPercentage,
  onSubmit,
  onChange,
}: {
  initialPercentage: number;
  initialDraft?: string;
  savedPercentage?: number;
  onSubmit?: jest.Mock;
  onChange?: jest.Mock;
}) {
  const [percentage, setPercentage] = React.useState(initialPercentage);
  const [draft, setDraft] = React.useState(initialDraft);
  return (
    <ReportReplyComposer
      mode="progress"
      draft={draft}
      photos={[]}
      onChangeDraft={setDraft}
      onAddPhotos={jest.fn()}
      onRemovePhoto={jest.fn()}
      onSubmit={onSubmit ?? jest.fn()}
      completionPercentage={percentage}
      savedCompletionPercentage={savedPercentage ?? initialPercentage}
      onChangeCompletionPercentage={(next) => {
        onChange?.(next);
        setPercentage(next);
      }}
    />
  );
}

describe("ReportReplyComposer", () => {
  it("disables send until draft has text", () => {
    const onSubmit = jest.fn();
    const screen = render(
      <ReportReplyComposer
        draft=""
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.press(screen.getByTestId("report-reply-composer__send"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits when draft is non-empty and photo button fires", () => {
    const onSubmit = jest.fn();
    const onAddPhotos = jest.fn();
    const onChangeDraft = jest.fn();
    const screen = render(
      <ReportReplyComposer
        draft="Thanks — looking into it"
        photos={[]}
        onChangeDraft={onChangeDraft}
        onAddPhotos={onAddPhotos}
        onRemovePhoto={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.press(screen.getByTestId("report-reply-composer__photo"));
    expect(onAddPhotos).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("report-reply-composer__send"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("renders peer triage + control and toggles dial open chrome", () => {
    const onPressTriageActions = jest.fn();
    const screen = render(
      <ReportReplyComposer
        draft=""
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        onPressTriageActions={onPressTriageActions}
        isTriageDialOpen={false}
      />,
    );

    expect(screen.getByTestId("report-reply-composer__triage_action")).toBeTruthy();
    fireEvent.press(screen.getByTestId("report-reply-composer__triage_action"));
    expect(onPressTriageActions).toHaveBeenCalledTimes(1);
  });

  it("uses B order: + before text before camera before send; no % in report mode", () => {
    const screen = render(
      <ReportReplyComposer
        mode="report_reply"
        draft="hi"
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        onPressTriageActions={jest.fn()}
      />,
    );

    expect(screen.getByTestId("report-reply-composer__triage_action")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__input")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__photo")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__send")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__completion")).toBeNull();
  });

  it("progress dock keeps the percent circle when the note can send", () => {
    const screen = render(
      <ReportReplyComposer
        mode="progress"
        draft="halfway"
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        completionPercentage={40}
        savedCompletionPercentage={40}
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    expect(screen.getByTestId("report-reply-composer__photo")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__input")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__completion")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__send")).toBeTruthy();
    expect(screen.getByText("40%")).toBeTruthy();
  });

  it("progress dock: clean under 100% keeps grey % and no send", () => {
    const screen = render(
      <ReportReplyComposer
        mode="progress"
        draft=""
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        completionPercentage={40}
        savedCompletionPercentage={40}
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    expect(screen.getByTestId("report-reply-composer__completion")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__send")).toBeNull();
  });

  it("press opens the scrubber; lift keeps it open; a tap closes it", () => {
    const screen = render(
      <ReportReplyComposer
        mode="progress"
        draft=""
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        completionPercentage={40}
        savedCompletionPercentage={40}
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("report-reply-composer__triage_action")).toBeNull();
    expect(screen.getByTestId("report-reply-composer__completion")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__completion_hit")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__completion_scrubber")).toBeNull();
    expect(screen.getByTestId("report-reply-composer__completion_thumb")).toBeTruthy();

    // Finger-down expands. The pan target stays 44 until this finger lifts,
    // so iOS does not cancel the gesture by resizing the responder.
    grantCompletion();
    expect(screen.getByTestId("report-reply-composer__completion_scrubber")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__completion_thumb")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__completion").props.style).toEqual(
      expect.objectContaining({ height: 44, width: 44 }),
    );
    expect(screen.getByTestId("report-reply-composer__completion_hit").props.style).toEqual(
      expect.objectContaining({ height: 44, width: 44 }),
    );
    expect(screen.getByTestId("report-reply-composer__completion_scrubber").props.style).toEqual(
      expect.objectContaining({ height: 200, width: 44 }),
    );

    releaseCompletion();
    expect(screen.getByTestId("report-reply-composer__completion_scrubber")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__completion_hit").props.style).toEqual(
      expect.objectContaining({ height: 200, width: 44 }),
    );

    grantCompletion();
    releaseCompletion();
    expect(screen.queryByTestId("report-reply-composer__completion_scrubber")).toBeNull();
    expect(screen.getByTestId("report-reply-composer__completion_hit").props.style).toEqual(
      expect.objectContaining({ height: 44, width: 44 }),
    );
  });

  it("progress dock at 100% with a note keeps the percent circle beside submit", () => {
    const screen = render(
      <ReportReplyComposer
        mode="progress"
        draft="done"
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        completionPercentage={100}
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    expect(screen.getByTestId("report-reply-composer__completion")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__send").props.accessibilityLabel).toBe(
      "Submit for review",
    );
    grantCompletion();
    expect(screen.getByTestId("report-reply-composer__completion_scrubber")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__completion_thumb").props.style).toEqual(
      expect.objectContaining({ bottom: 200 - 44 }),
    );
  });

  it("progress dock at 40% with note: tap send submits", () => {
    const onSubmit = jest.fn();
    const screen = render(
      <ReportReplyComposer
        mode="progress"
        draft="rebar tied"
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={onSubmit}
        completionPercentage={40}
        savedCompletionPercentage={40}
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("report-reply-composer__send"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("progress dock photos-only keeps the percent circle and does not show send", () => {
    const screen = render(
      <ReportReplyComposer
        mode="progress"
        draft=""
        photos={[{ uri: "file://a.jpg", fileName: "a.jpg" }]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        completionPercentage={40}
        savedCompletionPercentage={40}
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    expect(screen.getByTestId("report-reply-composer__completion")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__send")).toBeNull();
  });

  it("progress dock at 100% without a note stays a percent circle", () => {
    const screen = render(
      <ReportReplyComposer
        mode="progress"
        draft=""
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        completionPercentage={100}
        savedCompletionPercentage={40}
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    expect(screen.getByTestId("report-reply-composer__completion")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__send")).toBeNull();
  });

  it("progress dock at 100%: tap submit still submits", () => {
    const onSubmit = jest.fn();
    const screen = render(
      <ReportReplyComposer
        mode="progress"
        draft="done"
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={onSubmit}
        completionPercentage={100}
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("report-reply-composer__send"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("report-reply-composer__completion")).toBeTruthy();
  });

  it("progress dock loop: clean scrub, arm on retract, long-press, 100%+note Submit", () => {
    const onChange = jest.fn();
    const onSubmit = jest.fn();
    const screen = render(
      <ProgressDockHarness
        initialPercentage={0}
        initialDraft=""
        onChange={onChange}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText("0%")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__send")).toBeNull();
    expect(screen.queryByTestId("report-reply-composer__completion_scrubber")).toBeNull();

    grantCompletion();
    expect(screen.getByTestId("report-reply-composer__completion_scrubber")).toBeTruthy();
    moveCompletion(-64);
    expect(screen.getAllByText("40%").length).toBeGreaterThan(0);
    moveCompletion(-128);
    expect(screen.getAllByText("80%").length).toBeGreaterThan(0);
    releaseCompletion();
    expect(screen.getByTestId("report-reply-composer__completion_scrubber")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__completion")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__send")).toBeNull();

    fireEvent.changeText(screen.getByTestId("report-reply-composer__input"), "done");
    expect(screen.getByTestId("report-reply-composer__completion")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__send").props.accessibilityLabel).toBe(
      "Submit update, 80 percent",
    );
    fireEvent.press(screen.getByTestId("report-reply-composer__send"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("progress dock at 100%: submit replaces % circle", () => {
    const screen = render(
      <ReportReplyComposer
        mode="progress"
        draft="done"
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        completionPercentage={100}
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    expect(screen.getByTestId("report-reply-composer__photo")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__input")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__completion")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__send").props.accessibilityLabel).toBe(
      "Submit for review",
    );
  });

  it("collapses open scrubber when submit disables the control", () => {
    const screen = render(
      <ReportReplyComposer
        mode="progress"
        draft="halfway"
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        isSubmitting={false}
        completionPercentage={100}
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    grantCompletion();
    expect(screen.getByTestId("report-reply-composer__completion_scrubber")).toBeTruthy();

    screen.rerender(
      <ReportReplyComposer
        mode="progress"
        draft="halfway"
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        isSubmitting
        completionPercentage={100}
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("report-reply-composer__completion_scrubber")).toBeNull();
  });

  it("replaces text with Cancel review and locks controls while awaiting review", () => {
    const onCancelReview = jest.fn();
    const onAddPhotos = jest.fn();
    const onSubmit = jest.fn();
    const screen = render(
      <ReportReplyComposer
        mode="awaiting_review"
        draft=""
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={onAddPhotos}
        onRemovePhoto={jest.fn()}
        onSubmit={onSubmit}
        onCancelReview={onCancelReview}
        completionPercentage={100}
      />,
    );

    expect(screen.getByTestId("report-reply-composer__cancel_review")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__input")).toBeNull();
    fireEvent.press(screen.getByTestId("report-reply-composer__photo"));
    fireEvent.press(screen.getByTestId("report-reply-composer__send"));
    expect(onAddPhotos).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("report-reply-composer__cancel_review"));
    expect(onCancelReview).toHaveBeenCalledTimes(1);
  });

  it("shows Accept and Reject in the dock for review_decision mode", () => {
    const onApproveReview = jest.fn();
    const onRejectReview = jest.fn();
    const screen = render(
      <ReportReplyComposer
        mode="review_decision"
        draft=""
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        onApproveReview={onApproveReview}
        onRejectReview={onRejectReview}
        completionPercentage={100}
      />,
    );

    expect(screen.getByTestId("report-reply-composer__approve")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__reject")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__input")).toBeNull();
    expect(screen.queryByTestId("report-reply-composer__send")).toBeNull();
    expect(screen.queryByTestId("report-reply-composer__photo")).toBeNull();
    expect(screen.getByText("100%")).toBeTruthy();

    fireEvent.press(screen.getByTestId("report-reply-composer__approve"));
    fireEvent.press(screen.getByTestId("report-reply-composer__reject"));
    expect(onApproveReview).toHaveBeenCalledTimes(1);
    expect(onRejectReview).toHaveBeenCalledTimes(1);
  });

  it("shows Archive dock after approval", () => {
    const onArchive = jest.fn();
    const screen = render(
      <ReportReplyComposer
        mode="archive"
        draft=""
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        onArchive={onArchive}
        completionPercentage={100}
      />,
    );

    expect(screen.getByTestId("report-reply-composer__archive")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__input")).toBeNull();
    fireEvent.press(screen.getByTestId("report-reply-composer__archive"));
    expect(onArchive).toHaveBeenCalledTimes(1);
  });

  it("shows Reassign dock after decline", () => {
    const onReassign = jest.fn();
    const screen = render(
      <ReportReplyComposer
        mode="reassign"
        draft=""
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        onReassign={onReassign}
      />,
    );

    expect(screen.getByTestId("report-reply-composer__reassign")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__input")).toBeNull();
    fireEvent.press(screen.getByTestId("report-reply-composer__reassign"));
    expect(onReassign).toHaveBeenCalledTimes(1);
  });

  it("shows worker report FAB chrome without triage dial wiring", () => {
    const onPressTriageActions = jest.fn();
    const screen = render(
      <ReportReplyComposer
        mode="report_reply"
        draft="more photos"
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        showReportFab
        onPressTriageActions={onPressTriageActions}
      />,
    );

    expect(screen.getByTestId("report-reply-composer__triage_action")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__input")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__photo")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__send")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__completion")).toBeNull();
    fireEvent.press(screen.getByTestId("report-reply-composer__triage_action"));
    expect(onPressTriageActions).toHaveBeenCalledTimes(1);
  });

  it("maps vertical drag to 5% completion steps (up increases)", () => {
    const {
      applyServerCompletion,
      completionFromVerticalDrag,
      completionThumbOffset,
      progressDockTrailingSlot,
      progressDockIsDirty,
      progressDockShouldInterceptLeave,
    } = require("../ReportReplyComposer");
    expect(progressDockIsDirty({
      draft: "",
      photoCount: 0,
      completionPercentage: 40,
      savedCompletionPercentage: 40,
    })).toBe(false);
    expect(progressDockIsDirty({
      draft: "note",
      photoCount: 0,
      completionPercentage: 40,
      savedCompletionPercentage: 40,
    })).toBe(true);
    expect(progressDockIsDirty({
      draft: "",
      photoCount: 1,
      completionPercentage: 40,
      savedCompletionPercentage: 40,
    })).toBe(true);
    expect(progressDockIsDirty({
      draft: "",
      photoCount: 0,
      completionPercentage: 60,
      savedCompletionPercentage: 40,
    })).toBe(true);
    expect(progressDockTrailingSlot({ completionPercentage: 0 })).toBe("percent");
    expect(progressDockTrailingSlot({ completionPercentage: 80 })).toBe("percent");
    expect(progressDockTrailingSlot({ completionPercentage: 100 })).toBe("percent");
    expect(
      progressDockTrailingSlot({
        completionPercentage: 40,
        savedCompletionPercentage: 40,
        draft: "note",
      }),
    ).toBe("armed");
    expect(
      progressDockTrailingSlot({
        completionPercentage: 100,
        savedCompletionPercentage: 40,
        draft: "",
      }),
    ).toBe("armed");
    expect(
      progressDockTrailingSlot({
        completionPercentage: 100,
        draft: "done",
      }),
    ).toBe("submit");
    expect(
      progressDockTrailingSlot({ completionPercentage: 100, forceProgressScrub: true, draft: "done" }),
    ).toBe("percent");
    expect(
      progressDockTrailingSlot({ completionPercentage: 100, scrubSessionActive: true, draft: "done" }),
    ).toBe("percent");
    expect(
      progressDockTrailingSlot({
        completionPercentage: 100,
        forceProgressScrub: true,
        scrubSessionActive: true,
        draft: "done",
      }),
    ).toBe("percent");
    expect(completionFromVerticalDrag(40, -16)).toBe(50);
    expect(completionFromVerticalDrag(40, 16)).toBe(30);
    expect(completionFromVerticalDrag(0, -200)).toBe(100);
    expect(completionFromVerticalDrag(100, 200)).toBe(0);
    // Same press-down start + larger translation → more steps (not 5% then stop).
    expect(completionFromVerticalDrag(40, -8)).toBe(45);
    expect(completionFromVerticalDrag(40, -40)).toBe(65);
    expect(completionFromVerticalDrag(40, -80)).toBe(90);
    // Track base stays 0. A posted 75% sits three quarters up the slide.
    expect(completionThumbOffset(0, 156)).toBe(0);
    expect(completionThumbOffset(75, 156)).toBeCloseTo(117, 5);
    expect(completionThumbOffset(100, 156)).toBe(156);
    expect(applyServerCompletion({ server: 60, dirty: true, pendingSubmit: null })).toBeNull();
    expect(
      applyServerCompletion({ server: 60, dirty: false, pendingSubmit: 80 }),
    ).toBeNull();
    expect(applyServerCompletion({ server: 80, dirty: false, pendingSubmit: 80 })).toEqual({
      saved: 80,
      dock: 80,
      pendingSubmit: null,
    });
    expect(progressDockShouldInterceptLeave({ type: "GO_BACK" })).toBe(true);
    expect(progressDockShouldInterceptLeave({ type: "POP" })).toBe(true);
    expect(progressDockShouldInterceptLeave({ type: "PUSH" })).toBe(false);
    expect(
      progressDockShouldInterceptLeave({
        type: "NAVIGATE",
        payload: { name: "CaptureSession" },
      }),
    ).toBe(false);
    expect(
      progressDockShouldInterceptLeave({
        type: "NAVIGATE",
        payload: { name: "TasksList" },
      }),
    ).toBe(true);
  });

  it("press-drag maps continuous translationY against grant-time %", () => {
    const onChange = jest.fn();
    render(
      <ReportReplyComposer
        mode="progress"
        draft=""
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        completionPercentage={40}
        savedCompletionPercentage={40}
        onChangeCompletionPercentage={onChange}
      />,
    );

    grantCompletion();
    // Slop is 8px; first applied move must exceed it. Same grant-time 40%.
    moveCompletion(-16);
    moveCompletion(-40);
    moveCompletion(-80);
    expect(onChange.mock.calls.map((call) => call[0])).toEqual([50, 65, 90]);
    releaseCompletion();
  });

  it("second slide opens with the button at the posted percent", () => {
    const onChange = jest.fn();
    const travel = 200 - 44;
    const screen = render(
      <ReportReplyComposer
        mode="progress"
        draft=""
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        completionPercentage={75}
        savedCompletionPercentage={75}
        onChangeCompletionPercentage={onChange}
      />,
    );

    grantCompletion();
    expect(screen.getByTestId("report-reply-composer__completion_thumb").props.style).toEqual(
      expect.objectContaining({ bottom: (75 / 100) * travel }),
    );
    moveCompletion(-16);
    expect(onChange).toHaveBeenLastCalledWith(85);
  });

  it("after the track opens, a new press anywhere on it can scrub down from 100%", () => {
    const onChange = jest.fn();
    const screen = render(
      <ReportReplyComposer
        mode="progress"
        draft=""
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        completionPercentage={100}
        savedCompletionPercentage={100}
        onChangeCompletionPercentage={onChange}
      />,
    );

    grantCompletion();
    expect(screen.getByTestId("report-reply-composer__completion_hit").props.style).toEqual(
      expect.objectContaining({ height: 44 }),
    );
    releaseCompletion();
    expect(screen.getByTestId("report-reply-composer__completion_scrubber")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__completion_hit").props.style).toEqual(
      expect.objectContaining({ height: 200 }),
    );
    expect(screen.getByTestId("report-reply-composer__completion_thumb").props.style).toEqual(
      expect.objectContaining({ bottom: 200 - 44 }),
    );

    grantCompletion();
    moveCompletion(16);
    expect(onChange).toHaveBeenLastCalledWith(90);
  });

  it("shows a magnified percent above-left of the finger while scrubbing", () => {
    const screen = render(
      <ReportReplyComposer
        mode="progress"
        draft=""
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        completionPercentage={75}
        savedCompletionPercentage={75}
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    grantCompletion();
    expect(screen.queryByTestId("report-reply-composer__completion_magnifier")).toBeNull();

    moveCompletion(0, 40, { x: 30, y: 20 });
    expect(screen.queryByTestId("report-reply-composer__completion_magnifier")).toBeNull();

    moveCompletion(-16, 0, { x: 30, y: 8 });
    const magnifier = screen.getByTestId("report-reply-composer__completion_magnifier");
    expect(screen.getByText("85%")).toBeTruthy();
    expect(magnifier.props.style).toEqual(
      expect.objectContaining({
        left: 30 - 72 - 12,
        top: 8 - 72 - 12,
        width: 72,
        height: 72,
      }),
    );

    releaseCompletion();
    expect(screen.queryByTestId("report-reply-composer__completion_magnifier")).toBeNull();
  });
});
