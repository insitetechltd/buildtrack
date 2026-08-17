import { userAccountIsDeleted } from "../userAccountRetention";

describe("userAccountIsDeleted", () => {
  it("is false for an active profile", () => {
    expect(userAccountIsDeleted({})).toBe(false);
    expect(userAccountIsDeleted({ deletedAt: null })).toBe(false);
  });

  it("is true when login was tombstoned", () => {
    expect(userAccountIsDeleted({ deletedAt: "2026-08-17T00:00:00.000Z" })).toBe(
      true,
    );
    expect(userAccountIsDeleted({ deleted_at: "2026-08-17T00:00:00.000Z" })).toBe(
      true,
    );
  });
});
