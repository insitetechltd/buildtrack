import React from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { tenantStyles as s } from "./tenantScreenStyles";

export type StatTileConfig = {
  label: string;
  value: string | number;
  testID: string;
  onPress?: () => void;
  disabled?: boolean;
  disabledHint?: string;
};

type Props = {
  tiles: StatTileConfig[];
};

function onDisabledPress(hint?: string) {
  Alert.alert(
    "Coming soon",
    hint ?? "Task lists and detail will ship in the next tenant release.",
  );
}

export default function StatTileRow({ tiles }: Props) {
  return (
    <View style={s.statRow}>
      {tiles.map((tile) => {
        const disabled = tile.disabled || !tile.onPress;
        const handlePress = () => {
          if (disabled) {
            onDisabledPress(tile.disabledHint);
            return;
          }
          tile.onPress?.();
        };

        return (
          <Pressable
            key={tile.testID}
            testID={tile.testID}
            onPress={handlePress}
            style={[s.statTile, s.statTilePressable, disabled && s.statTileDisabled]}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
          >
            <Text style={[s.statValue, disabled && s.statValueDisabled]}>{tile.value}</Text>
            <Text style={s.statLabel}>{tile.label}</Text>
            {disabled ? <Text style={s.statSoon}>Soon</Text> : <Text style={s.statChevron}>›</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}
