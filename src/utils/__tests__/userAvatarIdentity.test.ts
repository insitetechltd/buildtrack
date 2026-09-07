import {
  getUserAvatarFallbackColor,
  getUserAvatarInitial,
  resolveUserAvatarColor,
  resolveUserAvatarSeed,
} from "../userAvatarIdentity";

describe("userAvatarIdentity", () => {
  it("derives stable colors per user id", () => {
    const alice = resolveUserAvatarColor({ userId: "user-alice", name: "Alice" });
    const bob = resolveUserAvatarColor({ userId: "user-bob", name: "Bob" });
    expect(alice).not.toBe(bob);
    expect(resolveUserAvatarColor({ userId: "user-alice", name: "Alice A" })).toBe(alice);
  });

  it("falls back to name when id is missing", () => {
    expect(resolveUserAvatarSeed({ name: "Joe Manager" })).toBe("joe manager");
    expect(getUserAvatarFallbackColor("joe manager")).toBe(
      getUserAvatarFallbackColor("joe manager"),
    );
  });

  it("returns initials from display name", () => {
    expect(getUserAvatarInitial("  sam ")).toBe("S");
    expect(getUserAvatarInitial("")).toBe("?");
  });
});
