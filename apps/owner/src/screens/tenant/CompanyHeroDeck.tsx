import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { CompanyDetail } from "../../lib/fetchOwnerTenantRead";
import type { CompanyDetailSegment } from "./companyDetailSegments";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = {
  detail: CompanyDetail;
  /** full = Overview; compact = list panes */
  variant?: "full" | "compact";
  /** Which quota/context line to emphasize in compact mode */
  compactFocus?: Extract<CompanyDetailSegment, "projects" | "users" | "tasks">;
};

function pct(used: number, limit: number | null): number {
  if (limit == null || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export default function CompanyHeroDeck({
  detail,
  variant = "full",
  compactFocus = "projects",
}: Props) {
  const seatsUsed = detail.usage.pmSeats + detail.usage.workerSeats;
  const seatsLimit = detail.usage.pmSeatLimit + detail.usage.workerSeatLimit;
  const seatsPct = pct(seatsUsed, seatsLimit);
  const projectsPct = pct(detail.usage.projectCount, detail.usage.projectLimit);
  const initial = detail.company.name.trim().charAt(0).toUpperCase() || "?";
  const compact = variant === "compact";
  const showBothBars = variant === "full";

  return (
    <View
      style={[s.deckHero, compact ? s.deckHeroCompact : null]}
      testID="owner-tenant-company-detail__hero"
    >
      <View style={s.deckHeroTitleRow}>
        <View style={[s.deckHeroLogo, s.deckHeroLogoCompact]}>
          <Text style={[s.deckHeroLogoText, s.deckHeroLogoTextCompact]}>{initial}</Text>
        </View>
        <View style={s.deckHeroTitleBlock}>
          <View style={s.deckHeroTitleLine}>
            <Text style={[s.deckHeroTitle, s.deckHeroTitleCompact]} numberOfLines={1}>
              {detail.company.name}
            </Text>
            <View
              style={[
                s.deckHeroActiveBadge,
                !detail.company.isActive ? s.deckHeroInactiveBadge : null,
              ]}
            >
              <Text
                style={[
                  s.deckHeroActiveText,
                  !detail.company.isActive ? s.deckHeroInactiveText : null,
                ]}
              >
                {detail.company.isActive ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>
          <View style={[s.deckHeroPlanRow, s.deckHeroPlanRowInline]}>
            <Ionicons name="ribbon-outline" size={16} color="#C8E6EF" />
            <Text style={[s.deckHeroPlan, s.deckHeroPlanCompact]} numberOfLines={1}>
              {detail.entitlement.tierDisplayName} · {detail.entitlement.statusLabel}
            </Text>
          </View>
        </View>
      </View>

      {showBothBars || compactFocus === "users" ? (
        <View style={s.deckHeroBarRow}>
          <View style={s.deckHeroBarLabel}>
            <Text style={s.deckHeroBarLabelText}>
              {seatsUsed} / {seatsLimit} seats
            </Text>
            {seatsLimit > 0 ? <Text style={s.deckHeroBarPct}>{seatsPct}%</Text> : null}
          </View>
          <View style={s.deckHeroBarTrack}>
            <View style={[s.deckHeroBarFill, { width: `${seatsPct}%` }]} />
          </View>
        </View>
      ) : null}

      {showBothBars || compactFocus === "projects" ? (
        <View style={s.deckHeroBarRow}>
          <View style={s.deckHeroBarLabel}>
            <Text style={s.deckHeroBarLabelText}>
              {detail.usage.projectCount}
              {detail.usage.projectLimit != null
                ? ` / ${detail.usage.projectLimit} projects`
                : " / ∞ projects"}
            </Text>
            {detail.usage.projectLimit != null && detail.usage.projectLimit > 0 ? (
              <Text style={s.deckHeroBarPct}>{projectsPct}%</Text>
            ) : null}
          </View>
          <View style={s.deckHeroBarTrack}>
            <View
              style={[s.deckHeroBarFill, s.deckHeroBarFillAlt, { width: `${projectsPct}%` }]}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
