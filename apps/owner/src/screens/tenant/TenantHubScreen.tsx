import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { navigateTenant } from "../../navigation/tenantNavigation";
import TenantScreenHeader from "./TenantScreenHeader";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "TenantOps">;

const GLOBAL_BROWSE: {
  title: string;
  sub: string;
  testID: string;
  route: keyof OwnerStackParamList;
}[] = [
  {
    title: "All projects",
    sub: "Cross-company project list",
    testID: "owner-tenant-hub__projects",
    route: "AllProjects",
  },
  {
    title: "All users",
    sub: "Cross-company user list",
    testID: "owner-tenant-hub__users",
    route: "AllUsers",
  },
];

export default function TenantHubScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-tenant-hub__root">
      <TenantScreenHeader title="Tenant" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.banner}>
          <Text style={s.bannerText}>
            Company-first drill-down. Open a company, then use stat tiles on detail screens
            to reach projects, users, and tasks. Task lists ship in the next release.
          </Text>
        </View>
        <Pressable
          testID="owner-tenant-hub__companies"
          style={s.heroCard}
          onPress={() => navigateTenant(navigation, "CompanyList")}
        >
          <Text style={s.heroTitle}>Companies</Text>
          <Text style={s.heroSub}>
            Start here — entitlement, projects, users, and support snapshot per tenant.
          </Text>
        </Pressable>
        <Text style={s.sectionTitle}>Global browse</Text>
        {GLOBAL_BROWSE.map((item) => (
          <Pressable
            key={item.route}
            testID={item.testID}
            style={s.linkCard}
            onPress={() => navigateTenant(navigation, item.route as never)}
          >
            <Text style={s.linkTitle}>{item.title}</Text>
            <Text style={s.linkSub}>{item.sub}</Text>
          </Pressable>
        ))}
        <Text style={s.sectionTitle}>Secondary</Text>
        <Pressable
          testID="owner-tenant-hub__audit"
          style={[s.card, { borderColor: "#0A556B" }]}
          onPress={() => navigateTenant(navigation, "AuditLog")}
        >
          <Text style={s.cardTitle}>Audit log</Text>
          <Text style={s.cardSub}>Owner write actions on DEV</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
