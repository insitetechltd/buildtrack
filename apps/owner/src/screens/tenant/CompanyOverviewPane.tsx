import React, { useState } from "react";
import { Linking, Pressable, Share, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { formatSeatUsageLine } from "../../lib/ownerEntitlementView";
import type { CompanyDetail } from "../../lib/fetchOwnerTenantRead";
import type { OwnerSupportSnapshot } from "../../lib/fetchOwnerOpsRead";
import type { CompanyDetailSegment } from "./companyDetailSegments";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = {
  detail: CompanyDetail;
  support: OwnerSupportSnapshot | null;
  onJumpSegment: (segment: CompanyDetailSegment) => void;
};

type FactRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueGood?: boolean;
  trailing?: "copy" | "chevron";
  first?: boolean;
  onPress?: () => void;
};

function FactRow({
  icon,
  label,
  value,
  valueGood,
  trailing,
  first,
  onPress,
}: FactRowProps) {
  const body = (
    <>
      <View style={s.factRowIcon}>
        <Ionicons name={icon} size={20} color="#0A556B" />
      </View>
      <View style={s.factRowBody}>
        <Text style={s.factRowLabel}>{label}</Text>
        <Text
          style={[s.factRowValue, valueGood ? s.factRowValueGood : null]}
          numberOfLines={3}
        >
          {value}
        </Text>
      </View>
      {trailing === "copy" ? (
        <Ionicons name="copy-outline" size={20} color="#0A556B" style={s.factRowTrailing} />
      ) : null}
      {trailing === "chevron" ? (
        <Ionicons name="chevron-forward" size={20} color="#8AA3AD" style={s.factRowTrailing} />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable style={[s.factRow, first ? s.factRowFirst : null]} onPress={onPress}>
        {body}
      </Pressable>
    );
  }

  return <View style={[s.factRow, first ? s.factRowFirst : null]}>{body}</View>;
}

async function shareCopy(label: string, value: string) {
  try {
    await Share.share({ message: value, title: label });
  } catch {
    // user dismissed
  }
}

function Section({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.factSection}>
      <Text style={s.factSectionCaption}>{caption}</Text>
      <View style={s.factSheet}>{children}</View>
    </View>
  );
}

export default function CompanyOverviewPane({ detail, support, onJumpSegment }: Props) {
  const [billingOpen, setBillingOpen] = useState(false);
  const syncLabel = support?.generatedAt
    ? `Last sync ${new Date(support.generatedAt).toLocaleString()}`
    : "Support snapshot unavailable";

  const seatLine = formatSeatUsageLine(
    detail.usage.pmSeats,
    detail.usage.pmSeatLimit,
    detail.usage.workerSeats,
    detail.usage.workerSeatLimit,
  ).replace(" · ", " · ");

  return (
    <View testID="owner-tenant-company-detail__overview">
      <Section caption="Identity">
        {detail.company.email ? (
          <FactRow
            first
            icon="mail-outline"
            label="Email"
            value={detail.company.email}
            trailing="copy"
            onPress={() => void Linking.openURL(`mailto:${detail.company.email}`)}
          />
        ) : null}
        {detail.company.phone ? (
          <FactRow
            first={!detail.company.email}
            icon="call-outline"
            label="Phone"
            value={detail.company.phone}
            trailing="copy"
            onPress={() => void Linking.openURL(`tel:${detail.company.phone}`)}
          />
        ) : null}
        {detail.company.address ? (
          <FactRow
            first={!detail.company.email && !detail.company.phone}
            icon="location-outline"
            label="Address"
            value={detail.company.address}
            trailing="copy"
            onPress={() => void shareCopy("Address", detail.company.address!)}
          />
        ) : null}
        {!detail.company.email && !detail.company.phone && !detail.company.address ? (
          <FactRow
            first
            icon="business-outline"
            label="Type"
            value={detail.company.type.replace(/_/g, " ")}
          />
        ) : null}
      </Section>

      <View
        testID="owner-tenant-company-detail__entitlement"
        accessibilityState={{ disabled: true }}
      >
      <Section caption="Plan">
        <FactRow
          first
          icon="shield-checkmark-outline"
          label="Status"
          value={`${detail.entitlement.statusLabel} · ${detail.entitlement.tierDisplayName}`}
          valueGood={detail.company.isActive}
        />
        <FactRow
          icon="people-outline"
          label="Seats (PM / Worker)"
          value={seatLine}
          trailing="chevron"
          onPress={() => onJumpSegment("users")}
        />
        <FactRow
          icon="briefcase-outline"
          label="Projects"
          value={`${detail.usage.projectCount}${
            detail.usage.projectLimit != null ? ` / ${detail.usage.projectLimit}` : " / ∞"
          }`}
          trailing="chevron"
          onPress={() => onJumpSegment("projects")}
        />
        <View style={s.factFootnote}>
          <Ionicons name="information-circle-outline" size={18} color="#8AA3AD" />
          <Text style={s.factFootnoteText}>
            Plan changes via operator approval — read-only until entitlement management ships.
          </Text>
        </View>
      </Section>
      </View>

      {support ? (
        <Section caption="Support">
          {support.sections?.subscription === "unavailable" ? (
            <FactRow
              first
              icon="calendar-outline"
              label="Subscription"
              value="Unavailable"
            />
          ) : (
            <FactRow
              first
              icon="calendar-outline"
              label="Subscription"
              value={support.subscription.status ?? "—"}
              valueGood={(support.subscription.status ?? "").toLowerCase() === "active"}
              trailing={support.subscription.stripeSubscriptionId ? "copy" : undefined}
              onPress={
                support.subscription.stripeSubscriptionId
                  ? () =>
                      void shareCopy(
                        "Stripe subscription",
                        support.subscription.stripeSubscriptionId!,
                      )
                  : undefined
              }
            />
          )}
          {support.subscription.stripeCustomerId ? (
            <FactRow
              icon="card-outline"
              label="Stripe customer ID"
              value={support.subscription.stripeCustomerId}
              trailing="copy"
              onPress={() =>
                void shareCopy("Stripe customer", support.subscription.stripeCustomerId!)
              }
            />
          ) : null}
        </Section>
      ) : null}

      <View style={s.billingDrawer}>
        <Pressable
          style={s.billingDrawerHeader}
          onPress={() => setBillingOpen((open) => !open)}
          testID="owner-tenant-company-detail__billing_drawer"
        >
          <Ionicons name="stats-chart-outline" size={22} color="#0A556B" />
          <View style={s.billingDrawerTextBlock}>
            <Text style={s.billingDrawerTitle}>Billing & ops health</Text>
            <Text style={s.billingDrawerSub}>{syncLabel}</Text>
          </View>
          <Text style={s.billingDrawerChevron}>{billingOpen ? "▴" : "▾"}</Text>
        </Pressable>
        {billingOpen ? (
          <View style={s.billingDrawerBody}>
            {support ? (
              <>
                <Text style={s.billingDrawerBodyText}>
                  Users{" "}
                  {support.usage.activeUsers == null || support.usage.userCount == null
                    ? "unavailable"
                    : `${support.usage.activeUsers}/${support.usage.userCount} active`}
                </Text>
                <Text style={s.billingDrawerBodyText}>
                  Projects{" "}
                  {support.usage.projectCount == null
                    ? "unavailable"
                    : `${support.usage.projectCount}${
                        support.usage.projectLimit != null
                          ? ` / ${support.usage.projectLimit}`
                          : " / ∞"
                      }`}
                </Text>
              </>
            ) : (
              <Text style={s.billingDrawerBodyText}>
                Pull to refresh to load support snapshot.
              </Text>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}
