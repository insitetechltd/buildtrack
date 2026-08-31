import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { tenantStyles as s } from "./tenantScreenStyles";

const PREVIEWS: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}[] = [
  {
    icon: "folder-open-outline",
    label: "Browse by project",
    value: "Open a project from the Projects pane",
  },
  {
    icon: "people-outline",
    label: "Drill into users",
    value: "Assignments live on each user file",
  },
  {
    icon: "phone-portrait-outline",
    label: "Field capture",
    value: "Create & review tasks in Taskr",
  },
];

export default function CompanyTasksPane() {
  return (
    <View style={s.tasksSoonCard} testID="owner-tenant-company-detail__tasks_pane">
      <View style={s.tasksSoonPill}>
        <Text style={s.tasksSoonPillText}>Soon</Text>
      </View>
      <View style={s.tasksSoonIconWrap}>
        <Ionicons name="layers-outline" size={30} color="#0A556B" />
      </View>
      <Text style={s.tasksSoonTitle}>Tenant task stream</Text>
      <Text style={s.tasksSoonBody}>
        Cross-project task lists for this company ship with the next tenant-read release. Until
        then, use the operator paths below.
      </Text>
      <View style={s.tasksSoonSheet}>
        {PREVIEWS.map((row, index) => (
          <View
            key={row.label}
            style={[s.factRow, index === 0 ? s.factRowFirst : null]}
          >
            <View style={s.factRowIcon}>
              <Ionicons name={row.icon} size={20} color="#0A556B" />
            </View>
            <View style={s.factRowBody}>
              <Text style={s.factRowLabel}>{row.label}</Text>
              <Text style={s.factRowValue}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={s.factFootnote}>
        <Ionicons name="information-circle-outline" size={18} color="#8AA3AD" />
        <Text style={s.factFootnoteText}>
          Read-only operator view. Mobile field users create and review tasks directly in Taskr.
        </Text>
      </View>
    </View>
  );
}
