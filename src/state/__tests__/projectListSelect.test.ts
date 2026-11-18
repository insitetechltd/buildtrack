import { PROJECT_WITH_CREATOR_COLUMNS } from "../projectStore.supabase";

describe("project list creator embed", () => {
  it("does not select users.role", () => {
    expect(PROJECT_WITH_CREATOR_COLUMNS).toContain("users!created_by");
    expect(PROJECT_WITH_CREATOR_COLUMNS).toContain("email");
    expect(PROJECT_WITH_CREATOR_COLUMNS).not.toMatch(/\brole\b/);
  });
});
