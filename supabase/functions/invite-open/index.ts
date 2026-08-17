// Public invite landing. *.supabase.co rewrites text/html → text/plain (anti-phishing),
// so we cannot run JavaScript here. Use HTTP redirects instead:
//   1st tap (mobile): App Store / Play
//   2nd tap (same browser): taskr:// first-time sign-in
// Desktop paste: App Store (custom schemes do nothing on a laptop).

const APP_SCHEME_PATH = "auth/invite";
const IOS_APP_STORE = "https://apps.apple.com/app/id6754898737";
const ANDROID_PLAY =
  "https://play.google.com/store/apps/details?id=com.buildtrack.app";
const COOKIE = "taskr_invite=1";

function redirect(location: string, extra: HeadersInit = {}): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}

function hasInviteCookie(req: Request): boolean {
  const cookie = req.headers.get("cookie") || "";
  return cookie.split(";").some((part) => part.trim().startsWith("taskr_invite="));
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  }

  const url = new URL(req.url);
  const tokenHash = (url.searchParams.get("token_hash") || "").trim();
  const ua = req.headers.get("user-agent") || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMobile = isAndroid || isIOS;
  const store = isAndroid ? ANDROID_PLAY : IOS_APP_STORE;
  const forceOpen = url.searchParams.get("open") === "1";

  if (!tokenHash) {
    return redirect(store);
  }

  const encoded = encodeURIComponent(tokenHash);
  const appLink =
    `taskr://${APP_SCHEME_PATH}?token_hash=${encoded}&type=magiclink`;

  if (forceOpen || (isMobile && hasInviteCookie(req))) {
    return redirect(appLink);
  }

  if (!isMobile) {
    return redirect(store);
  }

  return redirect(store, {
    "Set-Cookie": `${COOKIE}; Max-Age=604800; Path=/; SameSite=Lax`,
  });
});
