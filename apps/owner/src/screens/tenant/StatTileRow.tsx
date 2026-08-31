import React from "react";
import { Pressable, Text, View } from "react-native";

import { handleStatTilePress, isStatTileDisabled } from "./statTileLogic";
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

export default function StatTileRow({ tiles }: Props) {
  return (
    <View style={s.statRow}>
      {tiles.map((tile) => {
        const disabled = isStatTileDisabled(tile);

        return (
          <Pressable
            key={tile.testID}
            testID={tile.testID}
            onPress={() => handleStatTilePress(tile)}
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
