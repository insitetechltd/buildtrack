import { isPlatformSuperuser } from "../platformSuperusers";

describe("isPlatformSuperuser", () => {
  it("allows committed Tristan id", () => {
    expect(
      isPlatformSuperuser({ id: "006fe339-c4c6-456f-965a-2a9ff47d35de" }),
    ).toBe(true);
  });

  it("denies other users", () => {
    expect(isPlatformSuperuser({ id: "henry-company-admin" })).toBe(false);
    expect(isPlatformSuperuser(null)).toBe(false);
  });
});
