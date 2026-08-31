import { parseCompanyDetailSegment } from "../companyDetailSegments";

describe("parseCompanyDetailSegment", () => {
  it("defaults to overview", () => {
    expect(parseCompanyDetailSegment(undefined)).toBe("overview");
    expect(parseCompanyDetailSegment("nope")).toBe("overview");
  });

  it("accepts list panes", () => {
    expect(parseCompanyDetailSegment("projects")).toBe("projects");
    expect(parseCompanyDetailSegment("users")).toBe("users");
    expect(parseCompanyDetailSegment("tasks")).toBe("tasks");
  });
});
