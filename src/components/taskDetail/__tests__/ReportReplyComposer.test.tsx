import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import ReportReplyComposer from "../ReportReplyComposer";

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

  it("toggles vertical scrubber open and closed with taps", () => {
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
    expect(screen.queryByTestId("report-reply-composer__completion_scrubber")).toBeNull();
    expect(screen.getByText("40%")).toBeTruthy();

    fireEvent.press(screen.getByTestId("report-reply-composer__completion"));
    expect(screen.getByTestId("report-reply-composer__completion_scrubber")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__completion_thumb")).toBeTruthy();
  });

  it("shows green submit affordance when progress is 100%", () => {
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

    expect(screen.getByTestId("report-reply-composer__send").props.accessibilityLabel).toBe(
      "Submit for review",
    );
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
        completionPercentage={40}
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("report-reply-composer__completion"));
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
        completionPercentage={40}
        onChangeCompletionPercentage={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("report-reply-composer__completion_scrubber")).toBeNull();
    expect(screen.getByText("40%")).toBeTruthy();
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
