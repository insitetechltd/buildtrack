import {
  canShowCopyInviteLinkForUser,
  getMemberDeployableSeatType,
  seatChangeUpdatesForMember,
} from "@/ui/viewAdapters/useUserManagementViewAdapter";

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

describe("getMemberDeployableSeatType / seatChangeUpdatesForMember", () => {
  it("maps non-CA members to worker or pm seat chips", () => {
    expect(
      getMemberDeployableSeatType({ role: "worker", systemPermission: "member" }),
    ).toBe("worker");
    expect(
      getMemberDeployableSeatType({ role: "manager", systemPermission: "manager" }),
    ).toBe("pm");
    expect(
      getMemberDeployableSeatType({ role: "admin", systemPermission: "admin" }),
    ).toBeNull();
  });

  it("builds invite-parity updates for Worker↔PM promote", () => {
    expect(seatChangeUpdatesForMember("pm")).toEqual({
      systemPermission: "manager",
      role: "manager",
      position: "Project Manager",
      deployableSeat: "pm",
    });
    expect(seatChangeUpdatesForMember("worker")).toEqual({
      systemPermission: "member",
      role: "worker",
      position: "Worker",
      deployableSeat: "worker",
    });
  });
});
