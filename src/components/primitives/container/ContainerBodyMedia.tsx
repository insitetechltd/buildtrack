import React, { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import type { ContainerBodyMediaContract } from "@/ui/contracts/primitives";

interface ContainerBodyMediaProps {
  cardTestId: string;
  media: ContainerBodyMediaContract;
}

export default function ContainerBodyMedia({
  cardTestId,
  media,
}: ContainerBodyMediaProps) {
  const [isExpanded, setIsExpanded] = useState(media.mode === "expanded");

  const shouldShowItems = media.mode === "expanded" || isExpanded;
  const collapsedLabel = useMemo(() => {
    if (media.collapsedLabel) {
      return media.collapsedLabel;
    }

    return `Photos (${media.items.length})`;
  }, [media.collapsedLabel, media.items.length]);

  if (media.mode === "hidden" || media.items.length === 0) {
    return null;
  }

  return (
    <View testID={`${cardTestId}__media`} className="gap-3">
      {media.mode === "collapsible" ? (
        <Pressable
          testID={`${cardTestId}__media-toggle`}
          accessibilityRole="button"
          accessibilityLabel={collapsedLabel}
          onPress={() => setIsExpanded((current) => !current)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
        >
          <Text className="text-sm font-medium text-slate-700">{collapsedLabel}</Text>
        </Pressable>
      ) : null}

      {shouldShowItems ? (
        <View className="flex-row flex-wrap gap-2">
          {media.items.map((item) => (
            <Image
              key={item.id}
              testID={`${cardTestId}__media-item__${item.id}`}
              source={{ uri: item.uri }}
              accessibilityLabel={item.accessibilityLabel}
              resizeMode="cover"
              className="h-16 w-16 rounded-lg bg-slate-200"
              style={{ width: 64, height: 64, borderRadius: 12 }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
