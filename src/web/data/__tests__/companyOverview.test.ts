import { buildCompanyUserEngagement } from "../companyOverview";

describe("companyOverview engagement", () => {
  it("splits active / idle / pending seats", () => {
    const buckets = buildCompanyUserEngagement({
      users: [
        { id: "a", is_active: true, is_pending: false },
        { id: "b", is_active: true, is_pending: false },
        { id: "c", is_active: true, is_pending: true },
        { id: "d", is_active: false, is_pending: false },
      ],
      activeUserIds: new Set(["a"]),
    });
    expect(buckets).toEqual({
      active: 1,
      idle: 1,
      pending: 1,
      total: 3,
    });
  });
});
