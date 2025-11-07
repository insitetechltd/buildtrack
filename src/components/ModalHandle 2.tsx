import React from "react";
import { View } from "react-native";

/**
 * A visual handle indicator for slidable modals
 * Shows a small horizontal bar at the top to indicate the modal can be swiped down
 */
export default function ModalHandle() {
  return (
    <View className="w-full items-center py-3">
      <View className="w-10 h-1 bg-gray-300 rounded-full" />
    </View>
  );
}


