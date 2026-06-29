import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { ProjectsScreenFilterOption } from "@/ui/contracts/viewAdapters";
import { cn } from "@/utils/cn";

export interface ProjectsScreenFilterChipsProps {
  options: ProjectsScreenFilterOption[];
  onSelect: (value: ProjectsScreenFilterOption["value"]) => void;
}

export function ProjectsScreenFilterChips({
  options,
  onSelect,
}: ProjectsScreenFilterChipsProps) {
  return (
    <View className="bg-white border-b border-gray-200 px-6 py-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row">
          {options.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => onSelect(option.value)}
              className={cn(
                "px-3 py-1.5 rounded-full border mr-2 mb-2",
                option.isSelected
                  ? "bg-blue-600 border-blue-600"
                  : "bg-white border-gray-300",
              )}
            >
              <Text
                className={cn(
                  "text-base font-medium",
                  option.isSelected ? "text-white" : "text-gray-600",
                )}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
