import {
  buildInviteShareLink,
  buildInviteSignInLink,
  isInviteHandoffUrl,
  parseInviteSessionPayload,
  parseInviteSignInUrl,
} from "../inviteSignInLink";

describe("inviteSignInLink", () => {
  it("builds and parses path-style app invite links", () => {
    const link = buildInviteSignInLink("abc+/=token");
    expect(link.startsWith("taskr://auth/invite/")).toBe(true);
    expect(parseInviteSignInUrl(link)?.tokenHash).toBe("abc+/=token");
  });

  it("parses legacy query-style invite links", () => {
    expect(
      parseInviteSignInUrl(
        "taskr://auth/invite?token_hash=legacyToken&type=magiclink",
      )?.tokenHash,
    ).toBe("legacyToken");
  });

  it("parses share / invite-open links", () => {
    const share = buildInviteShareLink(
      "https://example.supabase.co",
      "abc+/=token",
    );
    expect(parseInviteSignInUrl(share)?.tokenHash).toBe("abc+/=token");
  });

  it("rejects unrelated urls", () => {
    expect(parseInviteSignInUrl("taskr://automation/sprint7/tristan")).toBeNull();
    expect(parseInviteSignInUrl("https://example.com")).toBeNull();
    expect(parseInviteSignInUrl("")).toBeNull();
  });

  it("detects handoff urls and clipboard session payloads", () => {
    expect(isInviteHandoffUrl("taskr://auth/handoff")).toBe(true);
    expect(isInviteHandoffUrl("taskr://auth/invite/x")).toBe(false);
    expect(
      parseInviteSessionPayload(
        JSON.stringify({
          access_token: "a",
          refresh_token: "b",
          minted_at: Date.now(),
        }),
      ),
    ).toEqual({
      access_token: "a",
      refresh_token: "b",
      minted_at: expect.any(Number),
    });
    expect(
      parseInviteSessionPayload(
        JSON.stringify({
          access_token: "a",
          refresh_token: "b",
          minted_at: Date.now() - 10 * 60 * 1000,
        }),
      ),
    ).toBeNull();
  });
});
