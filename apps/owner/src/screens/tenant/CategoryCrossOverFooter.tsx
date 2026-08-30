import React from "react";
import { Pressable, Text, View } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { tenantStyles as s } from "./tenantScreenStyles";

export type TenantCategory = "companies" | "projects" | "users";

type Props = {
  current: TenantCategory;
  navigation: NativeStackNavigationProp<OwnerStackParamList>;
};

const LINKS: Record<
  TenantCategory,
  { key: TenantCategory; title: string; sub: string; route: keyof OwnerStackParamList }[]
> = {
  companies: [
    { key: "projects", title: "All projects", sub: "Across companies", route: "AllProjects" },
    { key: "users", title: "All users", sub: "Across companies", route: "AllUsers" },
  ],
  projects: [
    { key: "companies", title: "Companies", sub: "Tenant companies", route: "CompanyList" },
    { key: "users", title: "All users", sub: "Across companies", route: "AllUsers" },
  ],
  users: [
    { key: "companies", title: "Companies", sub: "Tenant companies", route: "CompanyList" },
    { key: "projects", title: "All projects", sub: "Across companies", route: "AllProjects" },
  ],
};

/** Bottom cross-over to the other two Tenant category hubs. */
export default function CategoryCrossOverFooter({ current, navigation }: Props) {
  const items = LINKS[current];
  return (
    <View style={{ marginTop: 16 }} testID={`owner-tenant-crossover__${current}`}>
      <Text style={s.sectionTitle}>Browse other</Text>
      {items.map((item) => (
        <Pressable
          key={item.key}
          testID={`owner-tenant-crossover__to_${item.key}`}
          style={s.linkCard}
          onPress={() => navigation.navigate(item.route as never)}
        >
          <Text style={s.linkTitle}>{item.title}</Text>
          <Text style={s.linkSub}>{item.sub}</Text>
        </Pressable>
      ))}
    </View>
  );
}
