import { buildFormTextFieldContract } from "../formTextField";

describe("buildFormTextFieldContract", () => {
  it("does not mark enabled fields as stale (C2 login regression)", () => {
    const empty = buildFormTextFieldContract({
      id: "login-password",
      label: "Password",
      value: "",
      testId: "login-password",
      required: true,
    });
    expect(empty.isStale).toBe(false);
    expect(empty.isEmpty).toBe(true);
    expect(empty.structuralState).toBe("empty");
    expect(empty.density).toBe("expanded");

    const filled = buildFormTextFieldContract({
      id: "login-password",
      label: "Password",
      value: "password123",
      testId: "login-password",
      required: true,
    });
    expect(filled.isStale).toBe(false);
    expect(filled.isEmpty).toBe(false);
    expect(filled.structuralState).toBe("empty");
  });
});
