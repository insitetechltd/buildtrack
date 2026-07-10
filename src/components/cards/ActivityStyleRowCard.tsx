import React, { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ActivityStyleRowCardProps {
  testID: string;
  title: string;
  subtitle: string;
  metaLabel: string;
  badgeLabel: string;
  imageUri?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  metaClassName?: string;
  badgeClassName?: string;
  topLeftMarker?: React.ReactNode;
  badgeVariant?: "plain" | "pill";
  onPress?: () => void;
}

export default function ActivityStyleRowCard({
  testID,
  title,
  subtitle,
  metaLabel,
  badgeLabel,
  imageUri,
  titleClassName,
  subtitleClassName,
  metaClassName,
  badgeClassName,
  topLeftMarker,
  badgeVariant = "plain",
  onPress,
}: ActivityStyleRowCardProps) {
  const [hasUsableImage, setHasUsableImage] = useState(Boolean(imageUri));

  useEffect(() => {
    setHasUsableImage(Boolean(imageUri));
  }, [imageUri]);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      className="overflow-hidden rounded-2xl bg-white"
    >
      {topLeftMarker ? (
        <View testID={`${testID}:top-left-marker`} className="absolute left-3 top-3 z-10">
          {topLeftMarker}
        </View>
      ) : null}
      <View className="h-24 flex-row">
        <View
          testID={`${testID}:thumbnail`}
          className="h-24 w-24 items-center justify-center overflow-hidden bg-slate-100"
        >
          {hasUsableImage && imageUri ? (
            <Image
              testID={`${testID}:thumbnail-image`}
              source={{ uri: imageUri }}
              className="h-24 w-24"
              resizeMode="cover"
              onError={() => setHasUsableImage(false)}
            />
          ) : (
            <View
              testID={`${testID}:thumbnail-placeholder`}
              className="h-24 w-24 items-center justify-center bg-slate-100"
            >
              <Ionicons
                testID={`${testID}:no-photo-icon`}
                name="image-outline"
                size={22}
                color="#94a3b8"
              />
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1 justify-center p-4">
          <View className="min-w-0">
            <Text
              className={titleClassName ?? "text-base font-semibold text-slate-900"}
              numberOfLines={2}
            >
              {title}
            </Text>
            <Text
              className={subtitleClassName ?? "mt-1 text-sm text-slate-500"}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          </View>
          <View
            testID={`${testID}:bottom-row`}
            className="mt-3 flex-row items-center justify-between gap-3"
          >
            <Text
              className={metaClassName ?? "flex-1 text-xs font-medium text-slate-400"}
              numberOfLines={1}
            >
              {metaLabel}
            </Text>
            <View
              testID={`${testID}:${badgeVariant === "pill" ? "badge-pill" : "badge-plain"}`}
              className={badgeVariant === "pill" ? "rounded-full bg-slate-100 px-2.5 py-1" : ""}
            >
              <Text
                className={
                  badgeClassName ??
                  "max-w-[96px] text-right text-xs font-medium uppercase tracking-wide text-slate-400"
                }
                numberOfLines={1}
              >
                {badgeLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
