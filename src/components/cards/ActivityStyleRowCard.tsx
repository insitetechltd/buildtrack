import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "@/utils/cn";
import { extractBuildtrackStoragePath } from "@/api/fileUploadService";
import {
  ACTIVITY_FAMILY,
  activityActorInitial,
} from "@/ui/contracts/activityFamily";

export type ActivityStyleRowVariant = "critical" | "activity" | "task";
export type ActivityStyleRowMediaSize = "md" | "lg";
/**
 * rail = Task card depth (Tasks / Critical) — task name leads
 * post = Recent Activity depth — change leads + task name + optional photo
 * compact / photoHero = aliases that resolve to post
 */
export type ActivityStyleRowLayout = "rail" | "post" | "compact" | "photoHero";

interface ActivityStyleRowCardProps {
  testID: string;
  /** Primary line: change (post) or task name (rail). */
  title: string;
  /** Secondary line: task name (post) or context (rail). */
  subtitle?: string;
  /** @deprecated Prefer actorLabel. */
  overlayTitle?: string;
  /** Updater / assignee display name. */
  actorLabel?: string;
  /** @deprecated Prefer actorLabel. */
  heroActorLabel?: string;
  metaLabel?: string;
  badgeLabel?: string;
  imageUri?: string;
  variant?: ActivityStyleRowVariant;
  layout?: ActivityStyleRowLayout;
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

function resolvePostLayout(layout: ActivityStyleRowLayout): boolean {
  return layout === "post" || layout === "compact" || layout === "photoHero";
}

export default function ActivityStyleRowCard({
  testID,
  title,
  subtitle = "",
  overlayTitle,
  actorLabel,
  heroActorLabel = "",
  metaLabel = "",
  badgeLabel = "",
  imageUri,
  variant = "activity",
  layout = "rail",
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

  // Family-aligned recipes across depths (teal DNA).
  const recipeClasses = useMemo(() => {
    switch (variant) {
      case "critical":
        return {
          title: "text-lg font-semibold text-[#0D2630]",
          subtitle: "mt-1.5 text-base text-[#577783]",
          meta: "flex-1 text-sm font-medium text-[#497080]",
          badge:
            "max-w-[140px] text-right text-sm font-semibold text-[#0A728F]",
          badgePill: ACTIVITY_FAMILY.badgePillClassName,
          placeholder: "bg-[#E7F4F8]",
          placeholderIcon: ACTIVITY_FAMILY.placeholderIcon,
        };
      case "task":
        return {
          // Depth 1: task name leads (slightly larger for browse density)
          title: "text-xl font-semibold text-[#0D2630]",
          subtitle: "mt-1.5 text-base text-[#577783]",
          meta: "flex-1 text-sm font-medium text-[#497080]",
          badge:
            "max-w-[120px] text-right text-sm font-semibold text-[#0A728F]",
          badgePill: ACTIVITY_FAMILY.badgePillClassName,
          placeholder: "bg-[#E7F4F8]",
          placeholderIcon: ACTIVITY_FAMILY.placeholderIcon,
        };
      case "activity":
      default:
        return {
          title: ACTIVITY_FAMILY.titleClassName,
          subtitle: ACTIVITY_FAMILY.subtitleClassName,
          meta: ACTIVITY_FAMILY.metaClassName,
          badge:
            "max-w-[130px] text-right text-sm font-semibold text-[#0A728F]",
          badgePill: ACTIVITY_FAMILY.badgePillClassName,
          placeholder: "bg-[#E7F4F8]",
          placeholderIcon: ACTIVITY_FAMILY.placeholderIcon,
        };
    }
  }, [variant]);

  const hasSubtitle = subtitle.trim().length > 0;
  const hasMeta = metaLabel.trim().length > 0;
  const hasBadge = badgeLabel.trim().length > 0;
  const resolvedActorLabel = (actorLabel ?? heroActorLabel).trim();
  const hasActor = resolvedActorLabel.length > 0;
  const showPostPhoto = Boolean(hasUsableImage && imageUri);

  const bottomRow =
    hasMeta || hasBadge ? (
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
    ) : null;

  // Depth 2 — Post (Recent Activity)
  if (resolvePostLayout(layout)) {
    const changeLine = title.trim();
    const taskName = (subtitle || overlayTitle || "").trim();

    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        className="overflow-hidden rounded-2xl bg-white"
        accessibilityState={{ disabled: Boolean(disabled) }}
      >
        <View testID={`${testID}:variant-${variant}`} className="relative">
          <View
            testID={
              showPostPhoto
                ? `${testID}:layout-photo-hero`
                : `${testID}:layout-compact`
            }
            className="overflow-hidden"
          >
            <View className="px-4 pt-3">
              {(hasActor || hasMeta) && (
                <View testID={`${testID}:post-header`} className="mb-3">
                  <View className="flex-row items-center gap-3">
                    {hasActor ? (
                      <View
                        testID={`${testID}:actor-avatar`}
                        className="h-8 w-8 items-center justify-center rounded-full bg-[#0D6E87]"
                      >
                        <Text className="text-sm font-semibold text-white">
                          {activityActorInitial(resolvedActorLabel)}
                        </Text>
                      </View>
                    ) : null}
                    <View className="min-w-0 flex-1">
                      {hasActor ? (
                        <Text
                          testID={`${testID}:hero-actor-label`}
                          className={ACTIVITY_FAMILY.actorNameClassName}
                          numberOfLines={1}
                        >
                          {resolvedActorLabel}
                        </Text>
                      ) : null}
                      {hasMeta ? (
                        <Text
                          testID={`${testID}:meta`}
                          className={cn(
                            ACTIVITY_FAMILY.metaClassName,
                            hasActor ? "mt-0.5" : "",
                          )}
                          numberOfLines={1}
                        >
                          {metaLabel}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              )}

              <Pressable
                testID={`${testID}:title-pressable`}
                onPress={onPress}
                disabled={disabled}
              >
                <Text
                  testID={`${testID}:title`}
                  className={titleClassName ?? recipeClasses.title}
                  numberOfLines={3}
                >
                  {changeLine}
                </Text>
              </Pressable>
              {taskName ? (
                <Text
                  testID={`${testID}:subtitle`}
                  className={subtitleClassName ?? recipeClasses.subtitle}
                  numberOfLines={2}
                >
                  {taskName}
                </Text>
              ) : null}
            </View>

            {showPostPhoto && imageUri ? (
              <View
                testID={`${testID}:hero`}
                className="mx-4 mt-3 overflow-hidden rounded-2xl bg-slate-100"
                style={{ height: ACTIVITY_FAMILY.photoHeight }}
              >
                <ExpoImage
                  testID={`${testID}:hero-image`}
                  source={{
                    uri: imageUri,
                    cacheKey: extractBuildtrackStoragePath(imageUri) ?? imageUri,
                  }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  onError={() => setHasUsableImage(false)}
                />
              </View>
            ) : null}

            <View className="pb-3" />
          </View>
        </View>
      </Pressable>
    );
  }

  // Depth 1 — Task card rail (Tasks / Critical)
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
          testID={`${testID}:layout-rail`}
          className="absolute inset-0"
          pointerEvents="none"
        />
        {/* Family accent bar on media rail edge */}
        <View
          className="absolute bottom-0 left-0 top-0 z-10 w-1 bg-[#0D6E87]"
          pointerEvents="none"
        />
        <View
          testID={`${testID}:thumbnail`}
          className={cn(
            "absolute bottom-0 left-0 top-0 z-0 overflow-hidden",
            hasUsableImage && imageUri ? "bg-slate-100" : recipeClasses.placeholder,
          )}
          style={{ width: media.widthPx }}
        >
          {hasUsableImage && imageUri ? (
            <ExpoImage
              testID={`${testID}:thumbnail-image`}
              source={{
                uri: imageUri,
                cacheKey: extractBuildtrackStoragePath(imageUri) ?? imageUri,
              }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              cachePolicy="memory-disk"
              onError={() => setHasUsableImage(false)}
            />
          ) : (
            <View
              testID={`${testID}:thumbnail-placeholder`}
              className={cn("h-full w-full items-center justify-center", recipeClasses.placeholder)}
              accessibilityLabel="No photo"
            >
              <Ionicons
                testID={`${testID}:no-photo-icon`}
                name="image-outline"
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
          {bottomRow}
          {hasActor ? (
            <View className="mt-2 flex-row items-center justify-end">
              <View
                testID={`${testID}:actor-avatar`}
                className="h-7 w-7 items-center justify-center rounded-full bg-[#0D6E87]"
              >
                <Text className="text-xs font-semibold text-white">
                  {activityActorInitial(resolvedActorLabel)}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
