/** Distinct fallback fills when no profile photo is uploaded. */
export const USER_AVATAR_FALLBACK_COLORS = [
  "#08576E",
  "#6366F1",
  "#DB2777",
  "#EA580C",
  "#059669",
  "#7C3AED",
  "#0E7490",
  "#BE123C",
  "#CA8A04",
  "#4F46E5",
  "#0D9488",
  "#9333EA",
] as const;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function resolveUserAvatarSeed(args: {
  userId?: string | null;
  name?: string | null;
  email?: string | null;
}): string {
  const id = args.userId?.trim();
  if (id) {
    return id;
  }
  const name = args.name?.trim();
  if (name) {
    return name.toLowerCase();
  }
  const email = args.email?.trim();
  if (email) {
    return email.toLowerCase();
  }
  return "?";
}

export function getUserAvatarFallbackColor(seed?: string | null): string {
  const key = seed?.trim() || "?";
  return USER_AVATAR_FALLBACK_COLORS[hashString(key) % USER_AVATAR_FALLBACK_COLORS.length];
}

export function getUserAvatarInitial(name?: string | null, fallback = "?"): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.charAt(0).toUpperCase();
}

export function resolveUserAvatarColor(args: {
  userId?: string | null;
  name?: string | null;
  email?: string | null;
}): string {
  return getUserAvatarFallbackColor(resolveUserAvatarSeed(args));
}
