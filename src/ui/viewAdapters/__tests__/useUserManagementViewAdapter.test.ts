import { canShowCopyInviteLinkForUser } from "@/ui/viewAdapters/useUserManagementViewAdapter";

describe("canShowCopyInviteLinkForUser", () => {
  const invitedUser = {
    id: "user-invited",
    email: "invited@example.com",
    isPending: false,
    mustSetPassword: true,
  };

  const activatedUser = {
    id: "user-active",
    email: "active@example.com",
    isPending: false,
    mustSetPassword: false,
  };

  it("shows copy invite link only while the user still must set a password", () => {
    expect(canShowCopyInviteLinkForUser(invitedUser, "admin-1")).toBe(true);
    expect(canShowCopyInviteLinkForUser(activatedUser, "admin-1")).toBe(false);
  });

  it("hides copy invite link for pending approval users", () => {
    expect(
      canShowCopyInviteLinkForUser(
        { ...invitedUser, isPending: true },
        "admin-1",
      ),
    ).toBe(false);
  });

  it("hides copy invite link for the signed-in admin viewing their own card", () => {
    expect(canShowCopyInviteLinkForUser(invitedUser, invitedUser.id)).toBe(false);
  });
});
