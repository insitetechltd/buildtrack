import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { LIBRARY_PICKER_TIMING_HUD } from "@/utils/libraryPickerPerf";
import {
  formatLibraryPickerTimingHud,
  subscribeLibraryPickerTiming,
} from "@/utils/libraryPickerTiming";

/** Dev/TF overlay — not a product control. pointerEvents none. */
export function LibraryPickerTimingHud() {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!LIBRARY_PICKER_TIMING_HUD) {
      return;
    }
    return subscribeLibraryPickerTiming((snap) => {
      setText(formatLibraryPickerTimingHud(snap));
    });
  }, []);

  if (!LIBRARY_PICKER_TIMING_HUD || !text) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      testID="capture-session__library_timing_hud"
      style={styles.hud}
    >
      <Text style={styles.hudText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    position: "absolute",
    left: 8,
    bottom: 12,
    backgroundColor: "rgba(16, 34, 43, 0.78)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 20,
  },
  hudText: {
    color: "#F8FAFC",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    lineHeight: 15,
  },
});
