import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { cn } from "../../utils/cn";
import { DRAW_COLORS, type DrawColor } from "../../utils/photoPreviewDraw";

type PreviewEditToolbarProps = {
  disabled?: boolean;
  isEditing?: boolean;
  cropMode: boolean;
  drawMode: boolean;
  drawColor: DrawColor;
  canUndoDraw?: boolean;
  onRotate: () => void;
  onToggleCrop: () => void;
  onToggleDraw: () => void;
  onSelectDrawColor: (color: DrawColor) => void;
  onUndoDraw: () => void;
  onDoneDraw: () => void;
  onReset: () => void;
  onRemove: () => void;
};

export function PreviewEditToolbar({
  disabled = false,
  isEditing = false,
  cropMode,
  drawMode,
  drawColor,
  canUndoDraw = false,
  onRotate,
  onToggleCrop,
  onToggleDraw,
  onSelectDrawColor,
  onUndoDraw,
  onDoneDraw,
  onReset,
  onRemove,
}: PreviewEditToolbarProps) {
  const busy = disabled || isEditing;
  const toolsLocked = busy || cropMode || drawMode;

  return (
    <View testID="photo-selection__edit_toolbar" className="px-3 py-3 bg-zinc-900 border-b border-white/10">
      <View className="flex-row gap-2">
        <Pressable
          testID="photo-selection__tool_rotate"
          onPress={onRotate}
          disabled={toolsLocked}
          className={cn(
            "flex-1 rounded-xl py-3.5 px-2 flex-row items-center justify-center",
            toolsLocked ? "bg-zinc-700" : "bg-blue-600",
          )}
          accessibilityRole="button"
          accessibilityLabel="Rotate photo"
        >
          {isEditing && !cropMode && !drawMode ? (
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
          disabled={(busy && !cropMode) || drawMode}
          className={cn(
            "flex-1 rounded-xl py-3.5 px-2 flex-row items-center justify-center",
            cropMode ? "bg-amber-500" : busy || drawMode ? "bg-zinc-700" : "bg-blue-600",
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
          testID="photo-selection__tool_draw"
          onPress={onToggleDraw}
          disabled={(busy && !drawMode) || cropMode}
          className={cn(
            "flex-1 rounded-xl py-3.5 px-2 flex-row items-center justify-center",
            drawMode ? "bg-amber-500" : busy || cropMode ? "bg-zinc-700" : "bg-blue-600",
          )}
          accessibilityRole="button"
          accessibilityLabel={drawMode ? "Cancel draw" : "Draw on photo"}
        >
          <Ionicons name="pencil-outline" size={18} color="white" />
          <Text className="text-white text-sm font-semibold ml-1.5">
            {drawMode ? "Cancel" : "Draw"}
          </Text>
        </Pressable>

        <Pressable
          testID="photo-selection__tool_reset"
          onPress={onReset}
          disabled={toolsLocked}
          className={cn(
            "flex-1 rounded-xl py-3.5 px-2 flex-row items-center justify-center",
            "bg-zinc-700",
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

      {drawMode ? (
        <View className="mt-3 flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center gap-2">
            {DRAW_COLORS.map((swatch) => {
              const selected = drawColor === swatch;
              return (
                <Pressable
                  key={swatch}
                  testID={`photo-selection__draw_color_${swatch.replace("#", "")}`}
                  onPress={() => onSelectDrawColor(swatch)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Draw color ${swatch}`}
                  accessibilityState={{ selected }}
                  className={cn(
                    "h-9 w-9 items-center justify-center rounded-full border-2",
                    selected ? "border-white" : "border-white/30",
                  )}
                  style={{ backgroundColor: swatch }}
                />
              );
            })}
          </View>

          <Pressable
            testID="photo-selection__tool_draw_undo"
            onPress={onUndoDraw}
            disabled={busy || !canUndoDraw}
            className={cn(
              "rounded-xl px-3 py-2.5",
              busy || !canUndoDraw ? "bg-zinc-800" : "bg-zinc-700",
            )}
            accessibilityRole="button"
            accessibilityLabel="Undo last stroke"
          >
            <Text className="text-white text-sm font-semibold">Undo</Text>
          </Pressable>

          <Pressable
            testID="photo-selection__tool_draw_done"
            onPress={onDoneDraw}
            disabled={busy || !canUndoDraw}
            className={cn(
              "rounded-xl px-3 py-2.5",
              busy || !canUndoDraw ? "bg-zinc-800" : "bg-blue-600",
            )}
            accessibilityRole="button"
            accessibilityLabel="Apply drawing"
          >
            {isEditing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-sm font-semibold">Done</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
