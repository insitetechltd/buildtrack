import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "@/utils/cn";

export type ActivityStyleRowVariant = "critical" | "activity" | "task";
export type ActivityStyleRowMediaSize = "md" | "lg";

interface ActivityStyleRowCardProps {
  testID: string;
  title: string;
  subtitle?: string;
  metaLabel?: string;
  badgeLabel?: string;
  imageUri?: string;
  /** Recipe: critical (due this week), activity (what changed), task (list summary). */
  variant?: ActivityStyleRowVariant;
  mediaSize?: ActivityStyleRowMediaSize;
  titleClassName?: string;
  subtitleClassName?: string;
  metaClassName?: string;
  badgeClassName?: string;
  topLeftMarker?: React.ReactNode;
  badgeVariant?: "plain" | "pill";
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * Media rail is absolutely positioned so card height is driven only by text.
 * Avoids React Native `height: '100%'` / stretch blow-up inside ScrollViews.
 */
const MEDIA = {
  md: { widthPx: 112, icon: 26, minHeight: 112 },
  lg: { widthPx: 128, icon: 30, minHeight: 128 },
} as const;

const CONTENT_GAP = 14;

function defaultMediaSize(variant: ActivityStyleRowVariant): ActivityStyleRowMediaSize {
  return variant === "task" ? "md" : "lg";
}

export default function ActivityStyleRowCard({
  testID,
  title,
  subtitle = "",
  metaLabel = "",
  badgeLabel = "",
  imageUri,
  variant = "activity",
  mediaSize,
  titleClassName,
  subtitleClassName,
  metaClassName,
  badgeClassName,
  topLeftMarker,
  badgeVariant,
  onPress,
  disabled,
}: ActivityStyleRowCardProps) {
  const [hasUsableImage, setHasUsableImage] = useState(Boolean(imageUri));

  useEffect(() => {
    setHasUsableImage(Boolean(imageUri));
  }, [imageUri]);

  const resolvedMediaSize = mediaSize ?? defaultMediaSize(variant);
  const media = MEDIA[resolvedMediaSize];
  const resolvedBadgeVariant =
    badgeVariant ?? (variant === "task" || variant === "critical" ? "pill" : "plain");
  const contentPaddingLeft = media.widthPx + CONTENT_GAP;

  // Typography is +2 Tailwind steps vs the original text-base / text-sm / text-xs recipe.
  const recipeClasses = useMemo(() => {
    switch (variant) {
      case "critical":
        return {
          title: "text-xl font-semibold text-[#0D2630]",
          subtitle: "mt-1.5 text-lg text-[#577783]",
          meta: "flex-1 text-base font-medium text-[#497080]",
          badge:
            "max-w-[140px] text-right text-base font-semibold uppercase tracking-wide text-[#0A728F]",
          badgePill: "rounded-full bg-[#E7F4F8] px-3 py-1.5",
          placeholder: "bg-[#08576E]",
          placeholderIcon: "#E7F4F8",
        };
      case "task":
        return {
          title: "text-xl font-semibold text-slate-900",
          subtitle: "mt-1.5 text-lg text-slate-500",
          meta: "flex-1 text-lg font-medium text-slate-400",
          badge:
            "max-w-[120px] text-right text-base font-medium uppercase tracking-wide text-slate-600",
          badgePill: "rounded-full bg-slate-100 px-3 py-1.5",
          placeholder: "bg-[#08576E]",
          placeholderIcon: "#E7F4F8",
        };
      case "activity":
      default:
        return {
          title: "text-xl font-semibold text-[#0D2630]",
          subtitle: "mt-1.5 text-lg text-[#577783]",
          meta: "flex-1 text-base font-medium text-slate-400",
          badge:
            "max-w-[130px] text-right text-base font-semibold uppercase tracking-wide text-[#0A728F]",
          badgePill: "rounded-full bg-[#E7F4F8] px-3 py-1.5",
          placeholder: "bg-[#0D6E87]",
          placeholderIcon: "#E7F4F8",
        };
    }
  }, [variant]);

  const hasSubtitle = subtitle.trim().length > 0;
  const hasMeta = metaLabel.trim().length > 0;
  const hasBadge = badgeLabel.trim().length > 0;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      className="overflow-hidden rounded-2xl bg-white"
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      <View
        testID={`${testID}:variant-${variant}`}
        className="relative"
        style={{ minHeight: media.minHeight }}
      >
        <View
          testID={`${testID}:thumbnail`}
          className={cn(
            "absolute bottom-0 left-0 top-0 z-0 overflow-hidden",
            hasUsableImage && imageUri ? "bg-slate-100" : recipeClasses.placeholder,
          )}
          style={{ width: media.widthPx }}
        >
          {hasUsableImage && imageUri ? (
            <Image
              testID={`${testID}:thumbnail-image`}
              source={{ uri: imageUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              onError={() => setHasUsableImage(false)}
            />
          ) : (
            <View
              testID={`${testID}:thumbnail-placeholder`}
              className={cn("h-full w-full items-center justify-center", recipeClasses.placeholder)}
            >
              <Ionicons
                testID={`${testID}:no-photo-icon`}
                name={variant === "critical" ? "flag-outline" : "image-outline"}
                size={media.icon}
                color={recipeClasses.placeholderIcon}
              />
            </View>
          )}
        </View>

        {topLeftMarker ? (
          <View
            testID={`${testID}:top-left-marker`}
            className="absolute z-10"
            style={{ left: 12, top: 12 }}
          >
            {topLeftMarker}
          </View>
        ) : null}

        <View
          className="min-w-0 justify-center py-4 pr-4"
          style={{ paddingLeft: contentPaddingLeft, minHeight: media.minHeight }}
        >
          <View className="min-w-0">
            <Pressable
              testID={`${testID}:title-pressable`}
              onPress={onPress}
              disabled={disabled}
            >
              <Text
                testID={`${testID}:title`}
                className={titleClassName ?? recipeClasses.title}
                numberOfLines={2}
              >
                {title}
              </Text>
            </Pressable>
            {hasSubtitle ? (
              <Text
                testID={`${testID}:subtitle`}
                className={subtitleClassName ?? recipeClasses.subtitle}
                numberOfLines={2}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {hasMeta || hasBadge ? (
            <View
              testID={`${testID}:bottom-row`}
              className="mt-3 flex-row items-center justify-between gap-3"
            >
              {hasMeta ? (
                <Text
                  testID={`${testID}:meta`}
                  className={metaClassName ?? recipeClasses.meta}
                  numberOfLines={1}
                >
                  {metaLabel}
                </Text>
              ) : (
                <View className="flex-1" />
              )}
              {hasBadge ? (
                <View
                  testID={`${testID}:${resolvedBadgeVariant === "pill" ? "badge-pill" : "badge-plain"}`}
                  className={resolvedBadgeVariant === "pill" ? recipeClasses.badgePill : ""}
                >
                  <Text
                    testID={`${testID}:badge`}
                    className={badgeClassName ?? recipeClasses.badge}
                    numberOfLines={1}
                  >
                    {badgeLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
