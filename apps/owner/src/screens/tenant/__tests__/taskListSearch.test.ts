import {
  TASK_LIST_SEARCH_ACCESSIBILITY_LABEL,
  TASK_LIST_SEARCH_PLACEHOLDER,
  taskListSearchFetchQuery,
} from "../taskListSearch";

describe("TaskListPane search copy", () => {
  it("advertises title-only search (contract §6 TASK_SEARCH_TITLE)", () => {
    expect(TASK_LIST_SEARCH_PLACEHOLDER.toLowerCase()).toContain("title");
    expect(TASK_LIST_SEARCH_PLACEHOLDER.toLowerCase()).not.toMatch(
      /assignee|project|status/,
    );
    expect(TASK_LIST_SEARCH_ACCESSIBILITY_LABEL.toLowerCase()).toContain("title");
  });
});

describe("taskListSearchFetchQuery", () => {
  it("mounts with an unfiltered fetch", () => {
    expect(taskListSearchFetchQuery({ type: "mount", draft: "stale", submitted: "stale" })).toEqual({
      nextDraft: "",
      nextSubmitted: "",
      fetchQuery: "",
    });
  });

  it("does not fetch while typing a title", () => {
    expect(taskListSearchFetchQuery({ type: "type", draft: "HVAC", submitted: "" })).toEqual({
      nextDraft: "HVAC",
      nextSubmitted: "",
      fetchQuery: null,
    });
  });

  it("submits the draft to Edge and reuses it on refresh", () => {
    const submitted = taskListSearchFetchQuery({
      type: "submit",
      draft: "HVAC",
      submitted: "",
    });
    expect(submitted.fetchQuery).toBe("HVAC");
    expect(
      taskListSearchFetchQuery({
        type: "refresh",
        draft: "HVAC extra",
        submitted: submitted.nextSubmitted,
      }).fetchQuery,
    ).toBe("HVAC");
  });

  it("clears back to an unfiltered list when the draft is emptied", () => {
    expect(taskListSearchFetchQuery({ type: "type", draft: "", submitted: "HVAC" })).toEqual({
      nextDraft: "",
      nextSubmitted: "",
      fetchQuery: "",
    });
  });
});
