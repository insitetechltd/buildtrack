/** Contract §6 — HQ search is title-only until contract v2. */
export const TASK_LIST_SEARCH_PLACEHOLDER = "Search by title";
export const TASK_LIST_SEARCH_ACCESSIBILITY_LABEL = "Search tasks by title";

/**
 * Draft typing does not hit Edge. Empty draft reloads the unfiltered list.
 * Submit uses the draft. Refresh uses the last submitted query.
 */
export function taskListSearchFetchQuery(event: {
  type: "mount" | "type" | "submit" | "clear" | "refresh";
  draft: string;
  submitted: string;
}): { nextDraft: string; nextSubmitted: string; fetchQuery: string | null } {
  switch (event.type) {
    case "mount":
      return { nextDraft: "", nextSubmitted: "", fetchQuery: "" };
    case "type": {
      const draft = event.draft;
      if (draft.trim() === "") {
        return { nextDraft: draft, nextSubmitted: "", fetchQuery: "" };
      }
      return { nextDraft: draft, nextSubmitted: event.submitted, fetchQuery: null };
    }
    case "submit":
      return {
        nextDraft: event.draft,
        nextSubmitted: event.draft,
        fetchQuery: event.draft,
      };
    case "clear":
      return { nextDraft: "", nextSubmitted: "", fetchQuery: "" };
    case "refresh":
      return {
        nextDraft: event.draft,
        nextSubmitted: event.submitted,
        fetchQuery: event.submitted,
      };
  }
}
