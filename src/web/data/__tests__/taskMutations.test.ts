import { isAllowedWebTaskStatus } from "../taskMutations";

describe("taskMutations (M-WEB-01)", () => {
  it("allows light-edit / CSV statuses", () => {
    expect(isAllowedWebTaskStatus("new")).toBe(true);
    expect(isAllowedWebTaskStatus("in_progress")).toBe(true);
    expect(isAllowedWebTaskStatus("reviewing")).toBe(true);
    expect(isAllowedWebTaskStatus("bogus")).toBe(false);
  });
});
