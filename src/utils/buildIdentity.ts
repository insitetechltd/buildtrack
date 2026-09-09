import { Platform } from "react-native";

/**
 * Shared build identity for login-corner / script labels.
 *
 * Store IDs stay numeric (iOS CFBundleVersion / Android versionCode).
 * Display adds platform + purpose: `v1.1.3 (248i-tf)`.
 */

export type BuildPlatformToken = "i" | "a";
export type BuildChannel = "tf" | "rc" | "sim" | "dev";

export const BUILD_CHANNELS: readonly BuildChannel[] = [
  "tf",
  "rc",
  "sim",
  "dev",
] as const;

export function platformToken(
  os: typeof Platform.OS | string = Platform.OS,
): BuildPlatformToken {
  return os === "android" ? "a" : "i";
}

export function resolveBuildChannel(
  raw: string | null | undefined = process.env.EXPO_PUBLIC_BUILD_CHANNEL,
): BuildChannel {
  const normalized = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (
    normalized === "tf" ||
    normalized === "rc" ||
    normalized === "sim" ||
    normalized === "dev"
  ) {
    return normalized;
  }
  return "dev";
}

export function formatBuildIdentityLabel(args: {
  appVersion: string;
  buildNumber: string | number;
  platform?: BuildPlatformToken | typeof Platform.OS | string;
  channel?: BuildChannel | string | null;
}): string {
  const version = String(args.appVersion || "0.0.0").trim() || "0.0.0";
  const n = String(args.buildNumber ?? "0").trim() || "0";
  const platform =
    args.platform === "i" || args.platform === "a"
      ? args.platform
      : platformToken(args.platform ?? Platform.OS);
  const channel = resolveBuildChannel(args.channel);
  return `v${version} (${n}${platform}-${channel})`;
}

/** Resolve values used by the login badge from native + config fallbacks. */
export function resolveNativeBuildParts(args: {
  nativeApplicationVersion?: string | null;
  nativeBuildVersion?: string | null;
  configVersion?: string | null;
  configIosBuildNumber?: string | null;
  configAndroidVersionCode?: number | string | null;
}): { appVersion: string; buildNumber: string } {
  const appVersion =
    args.nativeApplicationVersion ||
    args.configVersion ||
    "1.0.0";
  const buildNumber =
    args.nativeBuildVersion ||
    args.configIosBuildNumber ||
    (args.configAndroidVersionCode != null
      ? String(args.configAndroidVersionCode)
      : null) ||
    "0";
  return { appVersion, buildNumber };
}
