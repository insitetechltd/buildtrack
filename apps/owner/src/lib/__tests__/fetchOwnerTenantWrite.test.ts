import {
  parseCreateUserResult,
  parseDeactivateUserResult,
} from "../fetchOwnerTenantWrite";

describe("owner tenant write parsers", () => {
  it("parses createUser result", () => {
    const user = parseCreateUserResult({
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "a@b.co",
        name: "Ada",
        companyId: "22222222-2222-4222-8222-222222222222",
        role: "supervisor",
        seatClass: "pm",
        isActive: true,
      },
    });
    expect(user.seatClass).toBe("pm");
    expect(user.role).toBe("supervisor");
  });

  it("parses deactivateUser result", () => {
    const user = parseDeactivateUserResult({
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "a@b.co",
        name: "Ada",
        companyId: "22222222-2222-4222-8222-222222222222",
        isActive: false,
        alreadyInactive: true,
      },
    });
    expect(user.isActive).toBe(false);
    expect(user.alreadyInactive).toBe(true);
  });
});
