import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import CreateTaskSuggestionPreview from "../CreateTaskSuggestionPreview";

jest.mock("../../../utils/useTranslation", () => ({
  useTranslation: () => ({
    tasks: {
      title: "Title",
      description: "Description",
      category: "Category",
      priority: "Priority",
      dueDate: "Due Date",
    },
    createTask: {
      aiSuggestions: "AI Suggestions",
      acceptField: "Accept",
      rejectField: "Reject",
      clearSuggestions: "Clear Suggestions",
      billingStatus: "Billing Status",
      taskReference: "Task Reference",
    },
  }),
}));

jest.mock("../../../utils/dateFormatter", () => ({
  useDateFormatter: () => ({
    formatDate: (date: Date | string) => {
      const normalizedDate = typeof date === "string" ? new Date(date) : date;
      return `formatted:${normalizedDate.toISOString().slice(0, 10)}`;
    },
  }),
}));

describe("CreateTaskSuggestionPreview", () => {
  const suggestion = {
    title: "Install conduit supports",
    description: "Inspect and secure level 3 supports",
    category: "electrical",
    priority: "high",
    dueDate: "2026-07-15T00:00:00.000Z",
    billingStatus: "billable",
    taskReference: "ELEC-42",
  } as const;

  it("renders translated labels and formatted suggestion values after extraction", () => {
    const { getByText, getAllByText } = render(
      <CreateTaskSuggestionPreview
        suggestion={suggestion}
        acceptedFields={new Set(["title", "dueDate"])}
        onToggleField={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(getByText("AI Suggestions")).toBeTruthy();
    expect(getByText("Title")).toBeTruthy();
    expect(getByText("Description")).toBeTruthy();
    expect(getByText("Category")).toBeTruthy();
    expect(getByText("Priority")).toBeTruthy();
    expect(getByText("Due Date")).toBeTruthy();
    expect(getByText("Billing Status")).toBeTruthy();
    expect(getByText("Task Reference")).toBeTruthy();
    expect(getByText("formatted:2026-07-15")).toBeTruthy();
    expect(getByText("Install conduit supports")).toBeTruthy();
    expect(getByText("Inspect and secure level 3 supports")).toBeTruthy();
    expect(getByText("ELEC-42")).toBeTruthy();
    expect(getByText("Clear Suggestions")).toBeTruthy();
    expect(getAllByText("Accept").length).toBe(2);
    expect(getAllByText("Reject").length).toBe(5);
  });

  it("forwards field toggles and dismiss actions", () => {
    const onToggleField = jest.fn();
    const onDismiss = jest.fn();
    const { getAllByText, getByText } = render(
      <CreateTaskSuggestionPreview
        suggestion={suggestion}
        acceptedFields={new Set(["title"])}
        onToggleField={onToggleField}
        onDismiss={onDismiss}
      />
    );

    fireEvent.press(getAllByText("Accept")[0]);
    fireEvent.press(getByText("Clear Suggestions"));

    expect(onToggleField).toHaveBeenCalledWith("title", "Install conduit supports");
    expect(onDismiss).toHaveBeenCalled();
  });
});
