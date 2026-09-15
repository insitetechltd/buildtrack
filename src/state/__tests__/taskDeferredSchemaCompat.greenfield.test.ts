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

  it("bulk-strips evolved columns including accepted and assigned_to", () => {
    const stripped = stripOptionalEvolvedTaskColumns({
      title: "t",
      accepted: false,
      assigned_to: ["u1"],
      current_status: "new",
      attachments: [],
      status: "new",
    });
    expect(stripped).toEqual({ title: "t", status: "new" });
    expect(isOptionalEvolvedTaskColumn("accepted")).toBe(true);
  });
});
