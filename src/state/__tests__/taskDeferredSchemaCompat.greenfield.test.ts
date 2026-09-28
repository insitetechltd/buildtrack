import {
  getMissingTaskColumnFromError,
  isOptionalEvolvedTaskColumn,
  stripOptionalEvolvedTaskColumns,
} from "../taskDeferredSchemaCompat";

describe("greenfield / evolved task column compat", () => {
  it("parses PostgREST accepted-column PGRST204 messages", () => {
    expect(
      getMissingTaskColumnFromError({
        code: "PGRST204",
        message: "Could not find the 'accepted' column of 'tasks' in the schema cache",
      }),
    ).toBe("accepted");
  });

  it("parses Postgres 42703 dotted column messages", () => {
    expect(
      getMissingTaskColumnFromError({
        code: "42703",
        message: "column tasks.assigned_to does not exist",
      }),
    ).toBe("assigned_to");
  });

  it("bulk-strips OLD columns only; keeps NEW deferred cols", () => {
    const stripped = stripOptionalEvolvedTaskColumns({
      title: "t",
      accepted: false,
      assigned_to: ["u1"],
      current_status: "new",
      attachments: [],
      status: "new",
      primary_assignee_id: "u1",
      tags: ["a"],
    });
    expect(stripped).toEqual({
      title: "t",
      status: "new",
      primary_assignee_id: "u1",
      tags: ["a"],
    });
    expect(isOptionalEvolvedTaskColumn("accepted")).toBe(true);
    expect(isOptionalEvolvedTaskColumn("primary_assignee_id")).toBe(false);
  });
});
