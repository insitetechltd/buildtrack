import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

import ReportReplyComposer from "../ReportReplyComposer";

/** Minimal RN touch payload so PanResponder grant/release handlers run in Jest. */
function panTouchEvent(pageY = 0) {
  return {
    nativeEvent: {
      changedTouches: [
        {
          identifier: 1,
          pageX: 0,
          pageY,
          locationX: 0,
          locationY: pageY,
          timestamp: 1,
        },
      ],
      identifier: 1,
      pageX: 0,
      pageY,
      locationX: 0,
      locationY: pageY,
      timestamp: 1,
      touches: [
        {
          identifier: 1,
          pageX: 0,
          pageY,
          locationX: 0,
          locationY: pageY,
          timestamp: 1,
        },
      ],
    },
    touchHistory: {
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: 1,
      numberActiveTouches: 1,
      touchBank: [
        {
          touchActive: true,
          startPageX: 0,
          startPageY: 0,
          startTimeStamp: 1,
          currentPageX: 0,
          currentPageY: pageY,
          currentTimeStamp: 1,
          previousPageX: 0,
          previousPageY: 0,
          previousTimeStamp: 1,
        },
      ],
    },
  };
}

function grantCompletion(screen: ReturnType<typeof render>) {
  const el = screen.getByTestId("report-reply-composer__completion_hit");
  act(() => {
    // Invoke the PanResponder grant path directly (Jest has no real touches).
    el.props.onResponderGrant?.(panTouchEvent());
  });
}

function releaseCompletion(screen: ReturnType<typeof render>) {
  const el = screen.getByTestId("report-reply-composer__completion_hit");
  act(() => {
    el.props.onResponderRelease?.(panTouchEvent());
  });
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

  it("progress dock: camera + text + % when under 100%; no submit", () => {
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
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    expect(screen.getByTestId("report-reply-composer__photo")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__input")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__completion")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__send")).toBeNull();
  });

  it("press-drag on % expands scrubber; release retracts", () => {
    const screen = render(
      <ReportReplyComposer
        mode="progress"
        draft="done"
        photos={[]}
        onChangeDraft={jest.fn()}
        onAddPhotos={jest.fn()}
        onRemovePhoto={jest.fn()}
        onSubmit={jest.fn()}
        completionPercentage={40}
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("report-reply-composer__triage_action")).toBeNull();
    expect(screen.getByTestId("report-reply-composer__completion")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__completion_hit")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__completion_scrubber")).toBeNull();
    expect(screen.getByTestId("report-reply-composer__completion_thumb")).toBeTruthy();

    // Finger-down expands (press-drag is one gesture — no separate tap).
    grantCompletion(screen);
    expect(screen.getByTestId("report-reply-composer__completion_scrubber")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__completion_thumb")).toBeTruthy();
    // Dock slot stays 44; overlay hit grows.
    expect(screen.getByTestId("report-reply-composer__completion").props.style).toEqual(
      expect.objectContaining({ height: 44, width: 44 }),
    );
    expect(screen.getByTestId("report-reply-composer__completion_hit").props.style).toEqual(
      expect.objectContaining({ height: 200, width: 44 }),
    );

    releaseCompletion(screen);
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
    const { completionFromVerticalDrag } = require("../ReportReplyComposer");
    expect(completionFromVerticalDrag(40, -16)).toBe(50);
    expect(completionFromVerticalDrag(40, 16)).toBe(30);
    expect(completionFromVerticalDrag(0, -200)).toBe(100);
    expect(completionFromVerticalDrag(100, 200)).toBe(0);
  });
});
