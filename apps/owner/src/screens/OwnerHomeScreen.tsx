import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type Section = {
  id: "monitoring" | "economics" | "tenant-ops";
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  testID: string;
  status: "ready" | "stub";
};

const SECTIONS: Section[] = [
  {
    id: "monitoring",
    title: "System monitoring",
    subtitle: "Live platform KPIs (created counts) via Edge on DEV.",
    icon: "pulse-outline",
    testID: "owner-home__section_monitoring",
    status: "ready",
  },
  {
    id: "economics",
    title: "Economics",
    subtitle: "Subscription rollup · $ in Stripe Dashboard.",
    icon: "cash-outline",
    testID: "owner-home__section_economics",
    status: "ready",
  },
  {
    id: "tenant-ops",
    title: "Tenant operations",
    subtitle: "Companies, projects, users — create / deactivate on DEV.",
    icon: "business-outline",
    testID: "owner-home__section_tenant_ops",
    status: "ready",
  },
];

type Props = {
  onSignOut: () => void;
  onOpenMonitoring: () => void;
  onOpenEconomics: () => void;
  onOpenTenantOps: () => void;
};

export default function OwnerHomeScreen({
  onSignOut,
  onOpenMonitoring,
  onOpenEconomics,
  onOpenTenantOps,
}: Props) {
  const open = (id: Section["id"]) => {
    if (id === "monitoring") onOpenMonitoring();
    else if (id === "economics") onOpenEconomics();
    else onOpenTenantOps();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="owner-home__root">
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>HQ</Text>
          <Text style={styles.meta}>M-OPS-03 · Internal TF · DEV</Text>
        </View>
        <Pressable testID="owner-home__signout" onPress={onSignOut} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Platform owner only. Never App Store. Monitoring, Economics rollups,
            and Tenant ops (read + create/deactivate) are live on DEV.
          </Text>
        </View>
        {SECTIONS.map((section) => (
          <Pressable
            key={section.id}
            style={styles.card}
            testID={section.testID}
            onPress={() => open(section.id)}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={section.icon} size={22} color="#0A556B" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{section.title}</Text>
              <Text style={styles.cardSub}>{section.subtitle}</Text>
              <Text style={styles.later}>
                {section.status === "ready" ? "Open" : "Stub"}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#E7F4F8" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0A556B",
  },
  brand: { color: "#fff", fontWeight: "700", fontSize: 18, letterSpacing: 0.4 },
  meta: { color: "#C8E6EF", fontSize: 12, marginTop: 2 },
  signOut: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  signOutText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  scroll: { padding: 16, paddingBottom: 48 },
  banner: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C8E6EF",
    backgroundColor: "#F8FCFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerText: { color: "#577783", fontSize: 14, lineHeight: 20 },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D5E8EF",
    backgroundColor: "#F4FAFC",
    padding: 16,
    flexDirection: "row",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E7F4F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#0D2630" },
  cardSub: { marginTop: 4, fontSize: 14, lineHeight: 20, color: "#577783" },
  later: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "700",
    color: "#0A556B",
    textTransform: "uppercase",
  },
});
