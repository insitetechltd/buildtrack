import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";

import { CaptureSessionModule } from "../modules/captureSession";
import type { SelectedPhoto } from "../navigation/navigationTypes";

type CaptureSessionFlowScreenProps = {
  onCancel: () => void;
  onComplete: (photos: SelectedPhoto[]) => void;
};

/**
 * Production Camera-tab host for hybrid capture → Select Photos handoff.
 */
export default function CaptureSessionFlowScreen({
  onCancel,
  onComplete,
}: CaptureSessionFlowScreenProps) {
  const handleComplete = useCallback(
    (result: { photos: SelectedPhoto[] }) => {
      onComplete(result.photos);
    },
    [onComplete],
  );

  return (
    <View style={styles.root} testID="capture-session-flow__root">
      <CaptureSessionModule
        selectionLimit={20}
        onCancel={onCancel}
        onComplete={handleComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
});
