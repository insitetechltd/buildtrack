import {
  WEB_TASK_CSV_HEADERS,
  WEB_TASK_CSV_MAX_ROWS,
  buildTaskCsvTemplateText,
  countCsvValidity,
  parseTaskCsvText,
  patchCsvDraft,
} from "../taskCsv";

const roster = [
  { id: "u1", name: "Carol Admin", email: "carol.admina@test.com" },
  { id: "u2", name: "John Manager", email: "john.managera@test.com" },
];

describe("taskCsv (M-WEB-01)", () => {
  it("marks known assignee good and unknown bad", () => {
    const csv = [
      "title,description,assignee,status",
      "Fix door,Lobby door sticks,carol.admina@test.com,new",
      "Bad row,Missing person,nobody@example.com,new",
    ].join("\n");
    const { drafts, error } = parseTaskCsvText(csv, roster);
    expect(error).toBeNull();
    expect(drafts).toHaveLength(2);
    expect(drafts[0].ok).toBe(true);
    expect(drafts[0].assigneeUserId).toBe("u1");
    expect(drafts[1].ok).toBe(false);
    expect(drafts[1].errors.join(" ")).toMatch(/Unknown assignee/);
    expect(countCsvValidity(drafts)).toEqual({ good: 1, bad: 1 });
  });

  it("rejects more than max rows", () => {
    const header = "title,description,assignee\n";
    const body = Array.from({ length: WEB_TASK_CSV_MAX_ROWS + 1 }, (_, i) =>
      `T${i},Desc,carol.admina@test.com`,
    ).join("\n");
    const { error } = parseTaskCsvText(header + body, roster);
    expect(error).toMatch(/max is 200/);
  });

  it("patches a bad row in place", () => {
    const bad = parseTaskCsvText(
      "title,description,assignee\nX,Y,nobody@x.com",
      roster,
    ).drafts[0];
    expect(bad.ok).toBe(false);
    const fixed = patchCsvDraft(
      bad,
      { assigneeRaw: "carol.admina@test.com" },
      roster,
    );
    expect(fixed.ok).toBe(true);
    expect(fixed.assigneeUserId).toBe("u1");
  });

  it("builds a downloadable template with header + example row", () => {
    const text = buildTaskCsvTemplateText();
    const lines = text.trim().split("\n");
    expect(lines[0]).toBe(WEB_TASK_CSV_HEADERS.join(","));
    expect(lines.length).toBeGreaterThanOrEqual(2);
    const parsed = parseTaskCsvText(text, [
      { id: "u9", name: "Teammate", email: "teammate@company.com" },
    ]);
    expect(parsed.error).toBeNull();
    expect(parsed.drafts).toHaveLength(1);
    expect(parsed.drafts[0].title).toMatch(/lobby door/i);
  });
});
