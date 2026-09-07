import {
  isArchivableLifecycleStatus,
  isCompletedLifecycleStatus,
} from "../taskLifecycleStatus";

describe("isCompletedLifecycleStatus", () => {
  it("allows archive only after sign-off", () => {
    expect(isCompletedLifecycleStatus("approved")).toBe(true);
    expect(isCompletedLifecycleStatus("completed")).toBe(true);
    expect(isCompletedLifecycleStatus("done")).toBe(true);
  });

  it("rejects live and aborted work", () => {
    expect(isCompletedLifecycleStatus("new")).toBe(false);
    expect(isCompletedLifecycleStatus("in_progress")).toBe(false);
    expect(isCompletedLifecycleStatus("submitted_for_review")).toBe(false);
    expect(isCompletedLifecycleStatus("declined")).toBe(false);
    expect(isCompletedLifecycleStatus("cancelled")).toBe(false);
    expect(isCompletedLifecycleStatus("resolved")).toBe(false);
  });
});

describe("isArchivableLifecycleStatus", () => {
  it("includes approved sign-off and resolved reports", () => {
    expect(isArchivableLifecycleStatus("approved")).toBe(true);
    expect(isArchivableLifecycleStatus("resolved")).toBe(true);
    expect(isArchivableLifecycleStatus("dismissed")).toBe(true);
    expect(isArchivableLifecycleStatus("in_progress")).toBe(false);
  });
});
