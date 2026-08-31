import React from "react";
import { Pressable, Text, View } from "react-native";

import type { CompanyDetailSegment } from "./companyDetailSegments";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = {
  active: CompanyDetailSegment;
  projectCount: number;
  userCount: number;
  onSelect: (segment: CompanyDetailSegment) => void;
};

const SEGMENTS: { id: CompanyDetailSegment; label: string; testID?: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "projects", label: "Projects", testID: "owner-tenant-company-detail__stat_projects" },
  { id: "users", label: "Users", testID: "owner-tenant-company-detail__stat_users" },
  { id: "tasks", label: "Tasks", testID: "owner-tenant-company-detail__stat_tasks" },
];

export default function CompanySegmentControl({
  active,
  projectCount,
  userCount,
  onSelect,
}: Props) {
  return (
    <View style={s.segmentRow} accessibilityRole="tablist">
      {SEGMENTS.map((seg) => {
        const isActive = active === seg.id;
        const isTasks = seg.id === "tasks";
        const count =
          seg.id === "projects" ? projectCount : seg.id === "users" ? userCount : null;

        return (
          <Pressable
            key={seg.id}
            testID={seg.testID}
            style={[
              s.segmentBtn,
              isActive ? s.segmentBtnActive : null,
              isTasks ? s.segmentBtnDisabled : null,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive, disabled: isTasks }}
            onPress={() => onSelect(seg.id)}
          >
            <Text
              style={[
                s.segmentLabel,
                isActive ? s.segmentLabelActive : null,
                isTasks ? s.segmentLabelDisabled : null,
              ]}
              numberOfLines={1}
            >
              {seg.label}
            </Text>
            {count != null ? (
              <Text style={[s.segmentCount, isActive ? s.segmentCountActive : null]}>{count}</Text>
            ) : isTasks ? (
              <Text style={s.segmentSoon}>soon</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
