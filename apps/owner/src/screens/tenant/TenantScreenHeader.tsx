import React, { type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { tenantStyles as s } from "./tenantScreenStyles";

type Props = {
  title: string;
  onBack?: () => void;
  onHome?: () => void;
  backTestID?: string;
  homeTestID?: string;
  right?: ReactNode;
};

export default function TenantScreenHeader({
  title,
  onBack,
  onHome,
  backTestID = "owner-tenant-header__back",
  homeTestID = "owner-tenant-header__home",
  right,
}: Props) {
  const left = onHome ? (
    <Pressable testID={homeTestID} onPress={onHome} style={s.back} accessibilityLabel="Home">
      <Text style={s.backText}>Home</Text>
    </Pressable>
  ) : onBack ? (
    <Pressable testID={backTestID} onPress={onBack} style={s.back}>
      <Text style={s.backText}>Back</Text>
    </Pressable>
  ) : (
    <View style={s.backSpacer} />
  );

  return (
    <View style={s.header}>
      {left}
      <Text style={s.title} numberOfLines={1}>
        {title}
      </Text>
      {right ?? <View style={s.backSpacer} />}
    </View>
  );
}
