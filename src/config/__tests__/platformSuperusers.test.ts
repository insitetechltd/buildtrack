import { isPlatformSuperuser } from "../platformSuperusers";

describe("isPlatformSuperuser", () => {
  it("is true for the committed Tristan owner id", () => {
    expect(
      isPlatformSuperuser({ id: "006fe339-c4c6-456f-965a-2a9ff47d35de" }),
    ).toBe(true);
  });

  it("is false for ordinary users and empty ids", () => {
    expect(isPlatformSuperuser({ id: "henry-company-admin" })).toBe(false);
    expect(isPlatformSuperuser({ id: "" })).toBe(false);
    expect(isPlatformSuperuser(null)).toBe(false);
    expect(isPlatformSuperuser(undefined)).toBe(false);
  });
});
