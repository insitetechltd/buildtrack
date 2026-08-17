import { normalizeAuthUser, readMustSetPassword } from "../authStore";

describe("readMustSetPassword", () => {
  it("maps snake_case and camelCase true", () => {
    expect(readMustSetPassword({ must_set_password: true })).toBe(true);
    expect(readMustSetPassword({ mustSetPassword: true })).toBe(true);
  });

  it("defaults false for missing or false flags", () => {
    expect(readMustSetPassword(null)).toBe(false);
    expect(readMustSetPassword({})).toBe(false);
    expect(readMustSetPassword({ must_set_password: false })).toBe(false);
  });
});

describe("normalizeAuthUser mustSetPassword", () => {
  it("exposes camelCase mustSetPassword from a PostgREST row", () => {
    const user = normalizeAuthUser({
      id: "u-1",
      role: "worker",
      must_set_password: true,
    });
    expect(user.mustSetPassword).toBe(true);
    expect(user.must_set_password).toBe(true);
  });

  it("stays false for Create Company / existing accounts", () => {
    const user = normalizeAuthUser({
      id: "u-1",
      role: "admin",
    });
    expect(user.mustSetPassword).toBe(false);
  });
});
