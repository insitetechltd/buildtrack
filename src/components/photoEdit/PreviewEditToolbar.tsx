import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { cn } from "../../utils/cn";

type PreviewEditToolbarProps = {
  disabled?: boolean;
  isEditing?: boolean;
  cropMode: boolean;
  onRotate: () => void;
  onToggleCrop: () => void;
  onReset: () => void;
  onRemove: () => void;
};

export function PreviewEditToolbar({
  disabled = false,
  isEditing = false,
  cropMode,
  onRotate,
  onToggleCrop,
  onReset,
  onRemove,
}: PreviewEditToolbarProps) {
  const busy = disabled || isEditing;

  return (
    <View testID="photo-selection__edit_toolbar" className="px-3 py-3 bg-zinc-900 border-b border-white/10">
      <View className="flex-row gap-2">
        <Pressable
          testID="photo-selection__tool_rotate"
          onPress={onRotate}
          disabled={busy || cropMode}
          className={cn(
            "flex-1 rounded-xl py-3.5 px-2 flex-row items-center justify-center",
            busy || cropMode ? "bg-zinc-700" : "bg-blue-600",
          )}
          accessibilityRole="button"
          accessibilityLabel="Rotate photo"
        >
          {isEditing && !cropMode ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={18} color="white" />
              <Text className="text-white text-sm font-semibold ml-1.5">Rotate</Text>
            </>
          )}
        </Pressable>

        <Pressable
          testID="photo-selection__tool_crop"
          onPress={onToggleCrop}
          disabled={busy && !cropMode}
          className={cn(
            "flex-1 rounded-xl py-3.5 px-2 flex-row items-center justify-center",
            cropMode ? "bg-amber-500" : busy ? "bg-zinc-700" : "bg-blue-600",
          )}
          accessibilityRole="button"
          accessibilityLabel={cropMode ? "Cancel crop" : "Crop photo"}
        >
          <Ionicons name="crop-outline" size={18} color="white" />
          <Text className="text-white text-sm font-semibold ml-1.5">
            {cropMode ? "Cancel" : "Crop"}
          </Text>
        </Pressable>

        <Pressable
          testID="photo-selection__tool_reset"
          onPress={onReset}
          disabled={busy || cropMode}
          className={cn(
            "flex-1 rounded-xl py-3.5 px-2 flex-row items-center justify-center",
            busy || cropMode ? "bg-zinc-700" : "bg-zinc-700",
          )}
          accessibilityRole="button"
          accessibilityLabel="Reset edits"
        >
          <Ionicons name="arrow-undo-outline" size={18} color="white" />
          <Text className="text-white text-sm font-semibold ml-1.5">Reset</Text>
        </Pressable>

        <Pressable
          testID="photo-selection__preview_remove"
          onPress={onRemove}
          disabled={busy}
          className="h-12 w-12 items-center justify-center rounded-xl bg-zinc-700"
          accessibilityRole="button"
          accessibilityLabel="Remove photo"
        >
          <Ionicons name="trash-outline" size={20} color="white" />
        </Pressable>
      </View>
    </View>
  );
}
