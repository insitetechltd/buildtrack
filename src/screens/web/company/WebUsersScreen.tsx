import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { inviteCompanyUser, copyCompanyInviteLink, type InviteSeatType } from "@/api/inviteUser";
import { WebFormCard } from "@/components/web/WebFormCard";
import { useAuthStore } from "@/state/authStore";
import {
  loadCompanyUsers,
  permissionLabel,
  type WebCompanyUserRow,
} from "@/web/data/companyDesk";

export function WebUsersScreen() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId ?? "";
  const [rows, setRows] = useState<WebCompanyUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [seatType, setSeatType] = useState<InviteSeatType>("worker");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await loadCompanyUsers(companyId);
    setRows(result.users);
    setError(result.error);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const submitInvite = async () => {
    setInviteBusy(true);
    setInviteError(null);
    setInviteLink(null);
    const result = await inviteCompanyUser({
      companyId,
      name: inviteName,
      email: inviteEmail,
      seatType,
    });
    setInviteBusy(false);
    if (!result.success) {
      setInviteError(result.error || "Invite failed");
      return;
    }
    setInviteLink(result.signInLink || null);
    setInviteName("");
    setInviteEmail("");
    setActionMsg(`Invited ${result.email || inviteEmail}`);
    await reload();
  };

  const copyLink = async (email: string | null) => {
    if (!email) return;
    setActionMsg(null);
    const result = await copyCompanyInviteLink({ companyId, email });
    if (!result.success || !result.signInLink) {
      setActionMsg(result.error || "Could not copy link");
      return;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.signInLink);
        setActionMsg(`Invite link copied for ${email}`);
      } else {
        setInviteLink(result.signInLink);
        setActionMsg("Invite link ready (clipboard unavailable)");
      }
    } catch {
      setInviteLink(result.signInLink);
      setActionMsg("Invite link ready");
    }
  };

  return (
    <View style={styles.root} testID="web-users">
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Users</Text>
          <Text style={styles.sub}>
            Company roster · {rows.length} people · Edge invite
          </Text>
        </View>
        <Pressable
          testID="web-users__invite_open"
          onPress={() => {
            setShowInvite(true);
            setInviteError(null);
            setInviteLink(null);
          }}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>Invite</Text>
        </Pressable>
      </View>

      {actionMsg ? (
        <Text testID="web-users__action_msg" style={styles.ok}>
          {actionMsg}
        </Text>
      ) : null}
      {inviteLink ? (
        <Text testID="web-users__invite_link" style={styles.link} selectable>
          {inviteLink}
        </Text>
      ) : null}

      {showInvite ? (
        <WebFormCard
          testID="web-users__invite"
          title="Invite teammate"
          fields={[
            {
              key: "name",
              label: "Name",
              value: inviteName,
              placeholder: "Full name",
            },
            {
              key: "email",
              label: "Email",
              value: inviteEmail,
              placeholder: "name@company.com",
            },
          ]}
          onChange={(key, value) => {
            if (key === "name") setInviteName(value);
            if (key === "email") setInviteEmail(value);
          }}
          extra={
            <View style={styles.seatRow}>
              <Text style={styles.seatLabel}>Seat</Text>
              {(["pm", "worker"] as InviteSeatType[]).map((seat) => (
                <Pressable
                  key={seat}
                  testID={`web-users__seat_${seat}`}
                  onPress={() => setSeatType(seat)}
                  style={[styles.seatChip, seatType === seat && styles.seatChipOn]}
                >
                  <Text style={[styles.seatChipText, seatType === seat && styles.seatChipTextOn]}>
                    {seat === "pm" ? "PM" : "Worker"}
                  </Text>
                </Pressable>
              ))}
            </View>
          }
          onCancel={() => setShowInvite(false)}
          onSubmit={() => void submitInvite()}
          submitLabel="Send invite"
          busy={inviteBusy}
          error={inviteError}
        />
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#12A8E0" />
      ) : error ? (
        <Text style={styles.error} testID="web-users-error">
          {error}
        </Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={styles.empty}>No users in this company yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row} testID={`web-user-row-${item.id}`}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name}>{item.name || "—"}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.email || item.phone || item.id}
                </Text>
              </View>
              <View style={styles.badges}>
                {item.isPending ? (
                  <Pressable
                    testID={`web-user-copy-link-${item.id}`}
                    onPress={() => void copyLink(item.email)}
                    style={[styles.badge, styles.badgeWarn]}
                  >
                    <Text style={styles.badgeWarnText}>Copy link</Text>
                  </Pressable>
                ) : null}
                {!item.isActive ? (
                  <Text style={[styles.badge, styles.badgeMuted]}>Inactive</Text>
                ) : null}
                <Text style={[styles.badge, styles.badgeSeat]}>
                  {permissionLabel(item)}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#07111E", marginBottom: 4 },
  sub: { fontSize: 13, color: "#577783", marginBottom: 8 },
  list: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#D6E9EE",
  },
  name: { fontSize: 15, fontWeight: "600", color: "#07111E" },
  meta: { fontSize: 13, color: "#577783", marginTop: 2 },
  badges: { flexDirection: "row", alignItems: "center", marginLeft: 12 },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
    marginLeft: 6,
  },
  badgeSeat: { backgroundColor: "#E7F4F8", color: "#08576E" },
  badgeWarn: { backgroundColor: "#FEF3C7" },
  badgeWarnText: { fontSize: 11, fontWeight: "700", color: "#92400E" },
  badgeMuted: { backgroundColor: "#F3F4F6", color: "#6B7280" },
  empty: { color: "#577783", marginTop: 12 },
  error: { color: "#DC2626", marginTop: 12 },
  ok: { color: "#047857", marginBottom: 8, fontSize: 13 },
  link: { color: "#0D6E87", marginBottom: 10, fontSize: 12 },
  primaryBtn: {
    backgroundColor: "#0D6E87",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  seatRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  seatLabel: { fontSize: 12, fontWeight: "600", color: "#577783", marginRight: 4 },
  seatChip: {
    borderWidth: 1,
    borderColor: "#D6E9EE",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  seatChipOn: { backgroundColor: "#0D6E87", borderColor: "#0D6E87" },
  seatChipText: { fontSize: 12, fontWeight: "700", color: "#07111E" },
  seatChipTextOn: { color: "#FFFFFF" },
});
