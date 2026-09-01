import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  getLibraryPickerPath,
  isLibraryPickerTimingHudEnabled,
} from "@/utils/libraryPickerPerf";
import { isPhotokitThumbsAvailable } from "./PhotokitThumbView";
import {
  formatLibraryPickerTimingHud,
  subscribeLibraryPickerTiming,
} from "@/utils/libraryPickerTiming";

/** Metro/debug overlay — muted on production compiles. pointerEvents none. */
export function LibraryPickerTimingHud() {
  const [text, setText] = useState("");
  const enabled = isLibraryPickerTimingHudEnabled();

  useEffect(() => {
    if (!enabled) {
      return;
    }
    return subscribeLibraryPickerTiming((snap) => {
      const path = isPhotokitThumbsAvailable()
        ? `native/${getLibraryPickerPath()}`
        : "image";
      setText(`${formatLibraryPickerTimingHud(snap)}\npath ${path}`);
    });
  }, [enabled]);

  if (!enabled || !text) {
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
