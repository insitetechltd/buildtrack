/**
 * Shared visual DNA for the three activity depths:
 * 1. Task card (Tasks list) — task name leads
 * 2. Post (Recent Activity) — change leads + task name
 * 3. Detail (Work thread) — change leads + status/% + rail
 */
import {
  getUserAvatarInitial,
} from "@/utils/userAvatarIdentity";

export const ACTIVITY_FAMILY = {
  avatarBg: "#0D6E87",
  avatarSize: 32,
  textPrimary: "#0D2630",
  textSecondary: "#577783",
  textMeta: "#497080",
  railDot: "#0D6E87",
  railTrack: "#C8E6EF",
  badgeBg: "#E7F4F8",
  badgeText: "#0A728F",
  placeholderBg: "#E7F4F8",
  placeholderIcon: "#0D6E87",
  /** Primary content line (change on post/detail, task name on task card). */
  titleClassName: "text-lg font-semibold text-[#0D2630]",
  /** Secondary content line (task name on post). */
  subtitleClassName: "mt-1.5 text-base text-[#577783]",
  metaClassName: "text-sm font-medium text-[#497080]",
  actorNameClassName: "text-base font-semibold text-[#0D2630]",
  badgePillClassName: "rounded-full bg-[#E7F4F8] px-2.5 py-1",
  badgeTextClassName: "text-sm font-semibold text-[#0A728F]",
  photoHeight: 240,
} as const;

export function activityActorInitial(name: string): string {
  return getUserAvatarInitial(name);
}
