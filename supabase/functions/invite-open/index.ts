// Public invite landing. *.supabase.co rewrites text/html → text/plain (anti-phishing),
// so we cannot run JS here. Always 302 to the HTTPS bridge on www, which tries
// taskr:// and never forces the App Store on first tap (TF / ASC beta-safe).

const INVITE_BRIDGE = "https://www.insiteworks.co/taskr/invite.html";
const IOS_APP_STORE = "https://apps.apple.com/app/id6754898737";
const ANDROID_PLAY =
  "https://play.google.com/store/apps/details?id=com.buildtrack.app";

function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
    },
  });
}

function bridgeUrl(tokenHash: string, sandbox: boolean): string {
  const url = new URL(INVITE_BRIDGE);
  url.searchParams.set("token_hash", tokenHash);
  if (sandbox) {
    url.searchParams.set("env", "sandbox");
  }
  return url.toString();
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
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const sandbox = supabaseUrl.includes("zusulknbhaumougqckec");

  if (!tokenHash) {
    return redirect(isAndroid ? ANDROID_PLAY : IOS_APP_STORE);
  }

  return redirect(bridgeUrl(tokenHash, sandbox));
});
