import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "TenantOps">;

const HUBS: {
  title: string;
  sub: string;
  testID: string;
  route: keyof OwnerStackParamList;
}[] = [
  {
    title: "Companies",
    sub: "Tenant companies · entitlement · drill-down",
    testID: "owner-tenant-hub__companies",
    route: "CompanyList",
  },
  {
    title: "Projects",
    sub: "All projects across companies",
    testID: "owner-tenant-hub__projects",
    route: "AllProjects",
  },
  {
    title: "Users",
    sub: "All users · search by name or email",
    testID: "owner-tenant-hub__users",
    route: "AllUsers",
  },
];

export default function TenantHubScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-tenant-hub__root">
      <View style={s.header}>
        <Pressable
          testID="owner-tenant-hub__back"
          onPress={() => navigation.goBack()}
          style={s.back}
        >
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <Text style={s.title}>Tenant</Text>
        <View style={s.backSpacer} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.banner}>
          <Text style={s.bannerText}>
            Three equal hubs. Drill into a company, project, or user — then cross to
            the other two levels from detail or list footers.
          </Text>
        </View>
        {HUBS.map((hub) => (
          <Pressable
            key={hub.route}
            testID={hub.testID}
            style={s.linkCard}
            onPress={() => navigation.navigate(hub.route as never)}
          >
            <Text style={s.linkTitle}>{hub.title}</Text>
            <Text style={s.linkSub}>{hub.sub}</Text>
          </Pressable>
        ))}
        <Text style={s.sectionTitle}>Secondary</Text>
        <Pressable
          testID="owner-tenant-hub__audit"
          style={[s.card, { borderColor: "#0A556B" }]}
          onPress={() => navigation.navigate("AuditLog")}
        >
          <Text style={s.cardTitle}>Audit log</Text>
          <Text style={s.cardSub}>Owner write actions on DEV</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
