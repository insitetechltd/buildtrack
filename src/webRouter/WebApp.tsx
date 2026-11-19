import React from "react";
import { StyleSheet, View } from "react-native";

import { WebRouter } from "./WebRouter";

/** Web entry — rendered when Platform.OS === 'web'. */
export function WebApp() {
  return (
    <View style={styles.root} testID="web-app-marker">
      <WebRouter />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
