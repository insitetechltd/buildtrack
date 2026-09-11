/** Invite share URL is HTTPS (download + first login). App open uses taskr:// */

export const INVITE_SIGN_IN_SCHEME = "taskr";
export const INVITE_SIGN_IN_PATH = "auth/invite";
export const INVITE_HANDOFF_PATH = "auth/handoff";
export const INVITE_OPEN_PATH = "functions/v1/invite-open";

export function buildInviteAppLink(tokenHash: string): string {
  // Path form is more reliable on iOS than query-only when Safari hands off.
  return `${INVITE_SIGN_IN_SCHEME}://${INVITE_SIGN_IN_PATH}/${encodeURIComponent(tokenHash)}?type=magiclink`;
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

export function buildInviteHandoffLink(): string {
  return `${INVITE_SIGN_IN_SCHEME}://${INVITE_HANDOFF_PATH}`;
}

function queryParams(url: string): URLSearchParams {
  const queryIndex = url.indexOf("?");
  if (queryIndex < 0) {
    return new URLSearchParams();
  }
  return new URLSearchParams(url.slice(queryIndex + 1));
}

export function parseInviteSignInUrl(
  url: string | null | undefined,
): { tokenHash: string } | null {
  if (!url) {
    return null;
  }

  const isInviteSurface =
    url.includes(INVITE_SIGN_IN_PATH) ||
    url.includes("invite-open") ||
    url.includes("/taskr/invite");
  if (!isInviteSurface) {
    return null;
  }

  const params = queryParams(url);
  const fromQuery = params.get("token_hash")?.trim();
  if (fromQuery) {
    return { tokenHash: fromQuery };
  }

  // taskr://auth/invite/<tokenHash>
  const pathMatch = url.match(/auth\/invite\/([^/?#]+)/i);
  if (pathMatch?.[1]) {
    try {
      return { tokenHash: decodeURIComponent(pathMatch[1]).trim() };
    } catch {
      return { tokenHash: pathMatch[1].trim() };
    }
  }

  return null;
}

export function isInviteHandoffUrl(url: string | null | undefined): boolean {
  return Boolean(url && url.includes(INVITE_HANDOFF_PATH));
}

export type InviteSessionPayload = {
  access_token: string;
  refresh_token: string;
  minted_at?: number;
};

export function parseInviteSessionPayload(
  raw: string | null | undefined,
): InviteSessionPayload | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as InviteSessionPayload;
    if (
      typeof parsed?.access_token !== "string" ||
      !parsed.access_token ||
      typeof parsed.refresh_token !== "string" ||
      !parsed.refresh_token
    ) {
      return null;
    }
    if (
      typeof parsed.minted_at === "number" &&
      Date.now() - parsed.minted_at > 5 * 60 * 1000
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
