/**
 * Platform owner allowlist (same Tristan UUID as Taskr M-OPS-01).
 * Client gate only — not an RLS boundary.
 */
const COMMITTED_PLATFORM_SUPERUSER_IDS: readonly string[] = [
  "006fe339-c4c6-456f-965a-2a9ff47d35de",
];

function parseEnvAllowlist(): string[] {
  // Read via dynamic key so babel-preset-expo does not rewrite to expo/virtual/env (breaks Jest).
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  const raw = env?.["EXPO_PUBLIC_PLATFORM_SUPERUSER_IDS"];
  if (!raw || typeof raw !== "string") {
    return [];
  }
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

export function getPlatformSuperuserIds(): ReadonlySet<string> {
  return new Set([...COMMITTED_PLATFORM_SUPERUSER_IDS, ...parseEnvAllowlist()]);
}

export function isPlatformSuperuser(
  user: { id?: string | null } | null | undefined,
): boolean {
  const id = typeof user?.id === "string" ? user.id.trim() : "";
  if (!id) {
    return false;
  }
  return getPlatformSuperuserIds().has(id);
}
