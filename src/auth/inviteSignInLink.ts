/** Invite share URL is HTTPS (download + first login). App open uses taskr:// */

export const INVITE_SIGN_IN_SCHEME = "taskr";
export const INVITE_SIGN_IN_PATH = "auth/invite";
export const INVITE_OPEN_PATH = "functions/v1/invite-open";

export function buildInviteAppLink(tokenHash: string): string {
  return `${INVITE_SIGN_IN_SCHEME}://${INVITE_SIGN_IN_PATH}?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink`;
}

/** @deprecated Use buildInviteAppLink. Kept for existing tests/callers. */
export function buildInviteSignInLink(tokenHash: string): string {
  return buildInviteAppLink(tokenHash);
}

export function buildInviteShareLink(
  supabaseOrigin: string,
  tokenHash: string,
): string {
  const origin = supabaseOrigin.replace(/\/$/, "");
  return `${origin}/${INVITE_OPEN_PATH}?token_hash=${encodeURIComponent(tokenHash)}`;
}

export function parseInviteSignInUrl(
  url: string | null | undefined,
): { tokenHash: string } | null {
  if (!url) {
    return null;
  }

  const isInviteSurface =
    url.includes(INVITE_SIGN_IN_PATH) || url.includes("invite-open");
  if (!isInviteSurface) {
    return null;
  }

  const queryIndex = url.indexOf("?");
  if (queryIndex < 0) {
    return null;
  }

  const params = new URLSearchParams(url.slice(queryIndex + 1));
  const tokenHash = params.get("token_hash")?.trim();
  if (!tokenHash) {
    return null;
  }

  return { tokenHash };
}
