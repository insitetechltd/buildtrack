import React from "react";
import { Text, View } from "react-native";

interface ProjectsOverviewHeroProps {
  title: string;
  projectCountLabel: string;
}

export default function ProjectsOverviewHero({
  title,
  projectCountLabel,
}: ProjectsOverviewHeroProps) {
  return (
    <View
      testID="projects-overview-hero"
      className="mx-4 mb-6 rounded-3xl bg-blue-600 px-5 py-5"
    >
      <Text className="text-sm font-medium uppercase tracking-[1.8px] text-blue-100">
        Workspace
      </Text>
      <Text className="mt-2 text-2xl font-semibold text-white">{title}</Text>
      <Text className="mt-2 text-sm text-blue-100">{projectCountLabel}</Text>
    </View>
  );
}
