import { buildInviteShareLink, buildInviteSignInLink, parseInviteSignInUrl } from "../inviteSignInLink";

describe("inviteSignInLink", () => {
  it("builds and parses a taskr invite deep link", () => {
    const link = buildInviteSignInLink("abc+/=token");
    expect(link.startsWith("taskr://auth/invite?")).toBe(true);

    const parsed = parseInviteSignInUrl(link);
    expect(parsed?.tokenHash).toBe("abc+/=token");
  });

  it("parses the HTTPS download landing URL", () => {
    const share = buildInviteShareLink(
      "https://example.supabase.co",
      "abc+/=token",
    );
    expect(share).toContain("/functions/v1/invite-open?token_hash=");
    expect(parseInviteSignInUrl(share)?.tokenHash).toBe("abc+/=token");
  });

  it("returns null for unrelated urls", () => {
    expect(parseInviteSignInUrl("taskr://automation/sprint7/tristan")).toBeNull();
    expect(parseInviteSignInUrl("https://example.com")).toBeNull();
    expect(parseInviteSignInUrl("")).toBeNull();
  });
});
