import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { cn } from "@/utils/cn";

const Overlay = Modal ?? View;

interface ArchiveConfirmSheetProps {
  visible: boolean;
  testIDPrefix: string;
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ArchiveConfirmSheet({
  visible,
  testIDPrefix,
  isConfirming = false,
  onCancel,
  onConfirm,
}: ArchiveConfirmSheetProps) {
  if (!visible) {
    return null;
  }

  return (
    <Overlay
      visible
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        testID={`${testIDPrefix}__archive-confirm`}
        pointerEvents="auto"
        style={styles.backdrop}
        className="items-center justify-center bg-black/40 px-6"
      >
        <View className="w-full rounded-2xl bg-white p-5">
          <Text className="text-xl font-bold text-[#07111E]">Archive task?</Text>
          <Text className="mt-2 text-base text-slate-600">
            This task will move to the Archived queue.
          </Text>
          <View className="mt-5 flex-row gap-3">
            <Pressable
              testID={`${testIDPrefix}__archive-confirm-cancel`}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={onCancel}
              disabled={isConfirming}
              className={cn(
                "flex-1 items-center rounded-xl border border-slate-300 bg-white px-4 py-3",
                isConfirming && "opacity-50",
              )}
            >
              <Text className="text-base font-semibold text-slate-700">Cancel</Text>
            </Pressable>
            <Pressable
              testID={`${testIDPrefix}__archive-confirm-archive`}
              accessibilityRole="button"
              accessibilityLabel="Archive"
              onPress={onConfirm}
              disabled={isConfirming}
              className={cn(
                "flex-1 items-center rounded-xl bg-[#B42318] px-4 py-3",
                isConfirming && "opacity-50",
              )}
            >
              <Text className="text-base font-semibold text-white">
                {isConfirming ? "Archiving..." : "Archive"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
});

