import { Alert } from "react-native";

import type { StatTileConfig } from "./StatTileRow";

function onDisabledPress(hint?: string) {
  Alert.alert(
    "Coming soon",
    hint ?? "Task lists and detail will ship in the next tenant release.",
  );
}

export function isStatTileDisabled(tile: StatTileConfig): boolean {
  return Boolean(tile.disabled || !tile.onPress);
}

export function handleStatTilePress(tile: StatTileConfig): void {
  if (isStatTileDisabled(tile)) {
    onDisabledPress(tile.disabledHint);
    return;
  }
  tile.onPress?.();
}
