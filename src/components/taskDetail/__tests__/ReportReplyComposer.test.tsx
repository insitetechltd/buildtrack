import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

/** Captures Gesture.Pan callbacks so Jest can drive press-drag without a native host. */
const scrubGesture: {
  onBegin?: () => void;
  onUpdate?: (event: { translationX: number; translationY: number }) => void;
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
      onUpdate: (fn: (event: { translationX: number; translationY: number }) => void) => {
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

function moveCompletion(translationY: number, translationX = 0) {
  act(() => {
    scrubGesture.onUpdate?.({ translationX, translationY });
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

  it("progress dock: camera + text + ringed send when dirty under 100%", () => {
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
    expect(screen.queryByTestId("report-reply-composer__completion")).toBeNull();
    expect(screen.getByTestId("report-reply-composer__send")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__send_percent")).toBeTruthy();
    expect(screen.getByText("40%")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__send").props.style).toEqual(
      expect.objectContaining({ borderColor: "#059669", backgroundColor: "#f1f5f9" }),
    );
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

  it("press-drag on % expands scrubber; release retracts", () => {
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

    // Finger-down expands (press-drag is one gesture — no separate tap).
    grantCompletion();
    expect(screen.getByTestId("report-reply-composer__completion_scrubber")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__completion_thumb")).toBeTruthy();
    // Dock slot and native pan target stay 44 — overlay is visual-only.
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
    expect(screen.queryByTestId("report-reply-composer__completion_scrubber")).toBeNull();
    expect(screen.getByTestId("report-reply-composer__completion_hit").props.style).toEqual(
      expect.objectContaining({ height: 44, width: 44 }),
    );
  });

  it("progress dock at 100%: long-press submit re-opens scrub to leave 100%", () => {
    const onChange = jest.fn();
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
        onChangeCompletionPercentage={onChange}
      />,
    );

    expect(screen.queryByTestId("report-reply-composer__completion")).toBeNull();
    fireEvent(screen.getByTestId("report-reply-composer__send"), "onLongPress");
    expect(screen.queryByTestId("report-reply-composer__send")).toBeNull();
    expect(screen.getByTestId("report-reply-composer__completion_scrubber")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
    // Dock slot stays peer-sized; scrub overlays upward (no tall layout band).
    expect(screen.getByTestId("report-reply-composer__completion").props.style).toEqual(
      expect.objectContaining({ height: 44, width: 44 }),
    );
    expect(screen.getByTestId("report-reply-composer__completion_scrubber").props.style).toEqual(
      expect.objectContaining({ height: 200, width: 44 }),
    );
    expect(screen.getByTestId("report-reply-composer__completion_hit").props.style).toEqual(
      expect.objectContaining({ height: 200, width: 44 }),
    );
  });

  it("progress dock dirty at 40% with note: tap send posts, long-press does not", () => {
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

    fireEvent(screen.getByTestId("report-reply-composer__send"), "onLongPress");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId("report-reply-composer__completion_scrubber")).toBeTruthy();
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

  it("progress dock photos-only: ringed chip, tap does not submit", () => {
    const onSubmit = jest.fn();
    const screen = render(
      <ReportReplyComposer
        mode="progress"
        draft=""
        photos={[{ uri: "file://a.jpg", fileName: "a.jpg" }]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={onSubmit}
        completionPercentage={40}
        savedCompletionPercentage={40}
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    expect(screen.getByTestId("report-reply-composer__send").props.style).toEqual(
      expect.objectContaining({ borderColor: "#059669" }),
    );
    fireEvent.press(screen.getByTestId("report-reply-composer__send"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("progress dock at 100% without note: ringed %, not review check", () => {
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

    expect(screen.getByTestId("report-reply-composer__send_percent")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__send").props.accessibilityLabel).not.toBe(
      "Submit for review",
    );
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
    expect(screen.queryByTestId("report-reply-composer__completion")).toBeNull();
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

    const expectCompactChip = () => {
      expect(screen.getByTestId("report-reply-composer__completion")).toBeTruthy();
      expect(screen.queryByTestId("report-reply-composer__send")).toBeNull();
      expect(screen.getByTestId("report-reply-composer__completion").props.style).toEqual(
        expect.objectContaining({ height: 44, width: 44 }),
      );
      expect(screen.getByTestId("report-reply-composer__completion_hit").props.style).toEqual(
        expect.objectContaining({ height: 44, width: 44 }),
      );
    };
    const expectArmed = (pct: number) => {
      expect(screen.queryByTestId("report-reply-composer__completion")).toBeNull();
      expect(screen.getByTestId("report-reply-composer__send")).toBeTruthy();
      expect(screen.getByText(`${pct}%`)).toBeTruthy();
      expect(screen.getByTestId("report-reply-composer__send").props.style).toEqual(
        expect.objectContaining({ borderColor: "#059669" }),
      );
    };
    const expectSubmit = () => {
      expect(screen.queryByTestId("report-reply-composer__completion")).toBeNull();
      expect(screen.getByTestId("report-reply-composer__send").props.accessibilityLabel).toBe(
        "Submit for review",
      );
    };

    expect(screen.getByText("0%")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__completion_scrubber")).toBeNull();
    expectCompactChip();

    grantCompletion();
    expect(screen.getByTestId("report-reply-composer__completion_scrubber")).toBeTruthy();
    moveCompletion(-64);
    expect(screen.getByText("40%")).toBeTruthy();
    moveCompletion(-128);
    expect(screen.getByText("80%")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__send")).toBeNull();
    releaseCompletion();
    expect(screen.queryByTestId("report-reply-composer__completion_scrubber")).toBeNull();
    expectArmed(80);

    fireEvent.press(screen.getByTestId("report-reply-composer__send"));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent(screen.getByTestId("report-reply-composer__send"), "onLongPress");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByTestId("report-reply-composer__send")).toBeNull();
    expect(screen.getByTestId("report-reply-composer__completion_scrubber")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__completion_hit").props.style).toEqual(
      expect.objectContaining({ height: 200, width: 44 }),
    );
    releaseCompletion();
    expect(screen.getByTestId("report-reply-composer__completion_scrubber")).toBeTruthy();

    grantCompletion();
    moveCompletion(-32);
    expect(screen.getByText("100%")).toBeTruthy();
    releaseCompletion();
    expectArmed(100);

    fireEvent.changeText(screen.getByTestId("report-reply-composer__input"), "done");
    expectSubmit();
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
    expect(screen.queryByTestId("report-reply-composer__completion")).toBeNull();
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

    fireEvent(screen.getByTestId("report-reply-composer__send"), "onLongPress");
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
      completionFromVerticalDrag,
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
});
