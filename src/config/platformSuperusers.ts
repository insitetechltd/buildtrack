/**
 * Platform owner allowlist for M-OPS-01 Superuser surfaces.
 * Client hide only — not an RLS boundary (see workflow-gaps-bin plan).
 *
 * Override / extend at build time with EXPO_PUBLIC_PLATFORM_SUPERUSER_IDS
 * (comma-separated auth user UUIDs).
 */

/** Tristan @ insitetech.co — primary owner login. */
const COMMITTED_PLATFORM_SUPERUSER_IDS: readonly string[] = [
  "006fe339-c4c6-456f-965a-2a9ff47d35de",
];

function parseEnvAllowlist(): string[] {
  const raw = process.env.EXPO_PUBLIC_PLATFORM_SUPERUSER_IDS;
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
