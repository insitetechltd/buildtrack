import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "@/utils/cn";
import { extractBuildtrackStoragePath } from "@/api/fileUploadService";
import { UserAvatar } from "@/components/UserAvatar";
import { ACTIVITY_FAMILY } from "@/ui/contracts/activityFamily";
import {
  ACTIVITY_FEED_COLLAPSED_PRIORS,
  ACTIVITY_FEED_DOT_COLORS,
  type ActivityFeedDotTone,
} from "@/ui/contracts/activityFeed";

export type ActivityStyleRowVariant = "critical" | "activity" | "task";
export type ActivityStyleRowMediaSize = "md" | "lg";
/**
 * rail = Task card depth (Tasks / Critical) — task name leads
 * post = Recent Activity depth — task name leads + change/description + optional photo
 * compact / photoHero = aliases that resolve to post
 */
export type ActivityStyleRowLayout = "rail" | "post" | "compact" | "photoHero";

export type ActivityStylePostEvent = {
  id: string;
  action: string;
  actorLabel?: string;
  actorUserId?: string;
  timestampLabel: string;
  dotTone: ActivityFeedDotTone;
};

interface ActivityStyleRowCardProps {
  testID: string;
  /** Primary API line: change text for post, task name for rail. Post layout remaps visually. */
  title: string;
  /** Secondary API line: task name for post, context for rail. Post layout remaps visually. */
  subtitle?: string;
  /** @deprecated Prefer actorLabel. */
  overlayTitle?: string;
  /** Updater / assignee display name. */
  actorLabel?: string;
  /** Stable id for per-user avatar color (when no uploaded photo). */
  actorUserId?: string;
  /** @deprecated Prefer actorLabel. */
  heroActorLabel?: string;
  metaLabel?: string;
  badgeLabel?: string;
  /** Single preview photo (still supported). Prefer imageUris for multi. */
  imageUri?: string;
  /** All event photos — enables horizontal swipe when length > 1. */
  imageUris?: string[];
  /**
   * Recipe B: newest-first same-task events. When set, post layout renders
   * bullets, colored dots, truncated priors, and +N expand.
   */
  activityEvents?: ActivityStylePostEvent[];
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
  /**
   * Stretch to fill a grid cell so sibling cards in a wrap row share height.
   * Pins meta/badge (rail) or trailing chrome (post) to the bottom of the cell.
   */
  fillHeight?: boolean;
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
/** Tablet grid rail cards: 2-line title + subtitle + meta, independent of sibling content. */
export const TABLET_RAIL_CARD_HEIGHT = 176;
const RAIL_GRID_HEIGHT = TABLET_RAIL_CARD_HEIGHT;

/** Pager dots slot under the post photo (reserved even when 0–1 photos). */
export const TABLET_POST_PAGER_RESERVE = 16;
/**
 * Recipe B stacked event rows: fixed meta column so avatars share one X axis
 * (not trailing/right-packed against variable action lengths).
 */
export const EVENT_META_COLUMN_WIDTH = 140;
const EVENT_AVATAR_SIZE = 18;
/**
 * Tablet grid post cards (Recent Activity): fixed height so wrap-row siblings
 * match whether they have 0 / 1 / N photos.
 * Chrome ≈ title + action/meta row + photo + pager (synthesis layout).
 */
export const TABLET_POST_CARD_HEIGHT =
  12 + // pt-3
  66 + // title ≤3 lines
  40 + // action+author · date row ≤2 lines
  12 + // mt-3 before photo
  ACTIVITY_FAMILY.photoHeight +
  8 + // mt-2 before pager
  TABLET_POST_PAGER_RESERVE +
  12; // pb-3

/** Latest-only emphasis: reject/decline weight (priors stay regular). */
function isEmphasizedPostAction(
  changeLine: string,
  tone?: ActivityFeedDotTone,
): boolean {
  if (tone) {
    return tone === "negative";
  }
  return /\b(reject|rejected|decline|declined)\b/i.test(changeLine);
}


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
  actorUserId,
  heroActorLabel = "",
  metaLabel = "",
  badgeLabel = "",
  imageUri,
  imageUris,
  activityEvents,
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
  fillHeight = false,
}: ActivityStyleRowCardProps) {
  const resolvedImageUris = useMemo(() => {
    if (Array.isArray(imageUris) && imageUris.length > 0) {
      return imageUris.filter((uri) => typeof uri === "string" && uri.length > 0);
    }
    if (imageUri) {
      return [imageUri];
    }
    return [] as string[];
  }, [imageUri, imageUris]);

  const [failedUris, setFailedUris] = useState<Record<string, true>>({});
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [heroWidth, setHeroWidth] = useState(0);
  const [eventsExpanded, setEventsExpanded] = useState(false);

  const usableImageUris = useMemo(
    () => resolvedImageUris.filter((uri) => !failedUris[uri]),
    [failedUris, resolvedImageUris],
  );

  useEffect(() => {
    setFailedUris({});
    setGalleryIndex(0);
  }, [resolvedImageUris.join("|")]);

  useEffect(() => {
    if (galleryIndex >= usableImageUris.length) {
      setGalleryIndex(Math.max(0, usableImageUris.length - 1));
    }
  }, [galleryIndex, usableImageUris.length]);

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
  const showPostPhoto = usableImageUris.length > 0;
  const primaryImageUri = usableImageUris[0];
  const hasUsableImage = Boolean(primaryImageUri);

  const markImageFailed = (uri: string) => {
    setFailedUris((current) => (current[uri] ? current : { ...current, [uri]: true }));
  };

  const onHeroLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== heroWidth) {
      setHeroWidth(nextWidth);
    }
  };

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

  useEffect(() => {
    setEventsExpanded(false);
  }, [(activityEvents ?? []).map((event) => event.id).join("|")]);

  // Depth 2 — Post (Recent Activity) — Recipe B when activityEvents is set:
  // Title → latest (• + action … avatar · date) → photos-if-latest → priors → +N.
  // Photo carousel must NOT sit inside the card Pressable — iOS gives the
  // parent press responder priority and horizontal swipe never starts.
  if (resolvePostLayout(layout)) {
    const changeLine = title.trim();
    const taskName = (subtitle || overlayTitle || "").trim();
    const primaryLine = taskName || changeLine;
    const stackedEvents =
      Array.isArray(activityEvents) && activityEvents.length > 0
        ? activityEvents
        : null;
    const latestEvent = stackedEvents?.[0];
    const priorEvents = stackedEvents?.slice(1) ?? [];
    const hiddenPriorCount = Math.max(
      0,
      priorEvents.length - ACTIVITY_FEED_COLLAPSED_PRIORS,
    );
    const visiblePriors = eventsExpanded
      ? priorEvents
      : priorEvents.slice(0, ACTIVITY_FEED_COLLAPSED_PRIORS);
    const legacySecondaryLine = stackedEvents
      ? ""
      : taskName
        ? changeLine
        : "";
    const latestAction = latestEvent?.action ?? legacySecondaryLine;
    const latestTone = latestEvent?.dotTone;
    const actionEmphasized = isEmphasizedPostAction(
      latestAction || changeLine,
      latestTone,
    );
    const showPagerDots = usableImageUris.length > 1;
    // Recipe B: no photo slot when latest has no photos (skip fillHeight spacer).
    const showMediaBlock = stackedEvents
      ? showPostPhoto
      : showPostPhoto || fillHeight;
    const showMetaRow = stackedEvents
      ? Boolean(latestEvent)
      : Boolean(legacySecondaryLine) || hasActor || hasMeta;
    const actionClassName =
      subtitleClassName ??
      (actionEmphasized
        ? "text-base font-semibold text-[#0D2630]"
        : "text-base text-[#577783]");

    const renderActorDate = (params: {
      leafTestID: string;
      actorName?: string;
      actorId?: string;
      dateLabel?: string;
    }) => {
      const name = (params.actorName ?? "").trim();
      const date = (params.dateLabel ?? "").trim();
      if (!name && !date) {
        // Still reserve meta column width so sibling rows keep avatar X alignment.
        return (
          <View
            testID={`${params.leafTestID}:meta-column`}
            style={{ width: EVENT_META_COLUMN_WIDTH }}
            className="shrink-0"
          />
        );
      }
      return (
        <View
          testID={`${params.leafTestID}:meta-column`}
          style={{ width: EVENT_META_COLUMN_WIDTH }}
          className="shrink-0 flex-row items-center gap-1.5"
        >
          <View
            testID={`${params.leafTestID}:avatar-slot`}
            style={{ width: EVENT_AVATAR_SIZE, height: EVENT_AVATAR_SIZE }}
            className="items-center justify-center"
          >
            {name ? (
              <UserAvatar
                testID={`${params.leafTestID}:actor-avatar`}
                userId={params.actorId}
                name={name}
                size={EVENT_AVATAR_SIZE}
              />
            ) : null}
          </View>
          <View className="min-w-0 flex-1 flex-row items-center gap-1">
            {name ? (
              <Text
                testID={`${params.leafTestID}:hero-actor-label`}
                className={cn(ACTIVITY_FAMILY.metaClassName, "min-w-0 shrink")}
                numberOfLines={1}
              >
                {name}
              </Text>
            ) : null}
            {name && date ? (
              <Text className={ACTIVITY_FAMILY.metaClassName}>·</Text>
            ) : null}
            {date ? (
              <Text
                testID={`${params.leafTestID}:meta`}
                className={cn(ACTIVITY_FAMILY.metaClassName, "min-w-0 shrink")}
                numberOfLines={1}
              >
                {date}
              </Text>
            ) : null}
          </View>
        </View>
      );
    };

    const renderEventRow = (params: {
      containerTestID: string;
      leafTestID: string;
      action: string;
      tone?: ActivityFeedDotTone;
      actorName?: string;
      actorId?: string;
      dateLabel?: string;
      emphasize: boolean;
      withBullet: boolean;
    }) => {
      const emphasized =
        params.emphasize &&
        isEmphasizedPostAction(params.action, params.tone);
      const rowActionClass =
        subtitleClassName ??
        (emphasized
          ? "text-base font-semibold text-[#0D2630]"
          : "text-base text-[#577783]");
      return (
        <View
          testID={params.containerTestID}
          className="mt-1.5 flex-row items-start gap-2"
        >
          {params.withBullet && params.tone ? (
            <View
              testID={`${params.leafTestID}:dot`}
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: ACTIVITY_FEED_DOT_COLORS[params.tone],
              }}
            />
          ) : null}
          {params.action ? (
            <Text
              testID={`${params.leafTestID}:subtitle`}
              className={cn(rowActionClass, "min-w-0 flex-1")}
              numberOfLines={2}
            >
              {params.action}
            </Text>
          ) : (
            <View className="min-w-0 flex-1" />
          )}
          {renderActorDate({
            leafTestID: params.leafTestID,
            actorName: params.actorName,
            actorId: params.actorId,
            dateLabel: params.dateLabel,
          })}
        </View>
      );
    };

    return (
      <View
        testID={testID}
        className="overflow-hidden rounded-2xl bg-white"
        style={fillHeight ? { height: TABLET_POST_CARD_HEIGHT } : undefined}
        accessibilityState={{ disabled: Boolean(disabled) }}
      >
        <View
          testID={`${testID}:variant-${variant}`}
          className="relative"
          style={fillHeight ? { flex: 1 } : undefined}
        >
          <View
            testID={
              showPostPhoto
                ? `${testID}:layout-photo-hero`
                : `${testID}:layout-compact`
            }
            className="overflow-hidden"
            style={fillHeight ? { flex: 1 } : undefined}
          >
            <Pressable
              testID={`${testID}:body-pressable`}
              onPress={onPress}
              disabled={disabled}
              className="px-4 pt-3"
            >
              {primaryLine ? (
                <View testID={`${testID}:title-pressable`}>
                  <Text
                    testID={`${testID}:title`}
                    className={titleClassName ?? recipeClasses.title}
                    numberOfLines={3}
                  >
                    {primaryLine}
                  </Text>
                </View>
              ) : null}

              {stackedEvents && latestEvent
                ? renderEventRow({
                    containerTestID: `${testID}:post-footer`,
                    leafTestID: testID,
                    action: latestEvent.action,
                    tone: latestEvent.dotTone,
                    actorName: latestEvent.actorLabel,
                    actorId: latestEvent.actorUserId,
                    dateLabel: latestEvent.timestampLabel,
                    emphasize: true,
                    withBullet: true,
                  })
                : null}

              {!stackedEvents && showMetaRow ? (
                <View
                  testID={`${testID}:post-footer`}
                  className="mt-1.5 flex-row items-start gap-2"
                >
                  {legacySecondaryLine ? (
                    <Text
                      testID={`${testID}:subtitle`}
                      className={cn(actionClassName, "min-w-0 flex-1")}
                      numberOfLines={2}
                    >
                      {legacySecondaryLine}
                    </Text>
                  ) : (
                    <View className="min-w-0 flex-1" />
                  )}
                  {renderActorDate({
                    leafTestID: testID,
                    actorName: resolvedActorLabel,
                    actorId: actorUserId,
                    dateLabel: metaLabel,
                  })}
                </View>
              ) : null}
            </Pressable>

            {fillHeight ? <View style={{ flex: 1 }} /> : null}

            {showMediaBlock ? (
              <View className="mx-4 mt-3">
                {showPostPhoto ? (
                  <View
                    testID={`${testID}:hero`}
                    className="overflow-hidden rounded-2xl bg-slate-100"
                    style={{ height: ACTIVITY_FAMILY.photoHeight }}
                    onLayout={onHeroLayout}
                  >
                    {usableImageUris.length > 1 && heroWidth > 0 ? (
                      <ScrollView
                        testID={`${testID}:hero-swipe`}
                        horizontal
                        pagingEnabled
                        directionalLockEnabled
                        nestedScrollEnabled
                        disableIntervalMomentum
                        decelerationRate="fast"
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ height: "100%" }}
                        style={{ height: ACTIVITY_FAMILY.photoHeight }}
                        onMomentumScrollEnd={(event) => {
                          const pageWidth = Math.max(
                            event.nativeEvent.layoutMeasurement.width,
                            heroWidth,
                            1,
                          );
                          const nextIndex = Math.round(
                            event.nativeEvent.contentOffset.x / pageWidth,
                          );
                          setGalleryIndex(
                            Math.min(
                              Math.max(nextIndex, 0),
                              usableImageUris.length - 1,
                            ),
                          );
                        }}
                      >
                        {usableImageUris.map((uri, photoIndex) => (
                          <Pressable
                            key={`${testID}:hero-slide:${photoIndex}`}
                            testID={
                              photoIndex === 0
                                ? `${testID}:hero-image-pressable`
                                : `${testID}:hero-image-pressable-${photoIndex}`
                            }
                            accessibilityRole="button"
                            accessibilityLabel={`Activity photo ${photoIndex + 1} of ${usableImageUris.length}`}
                            disabled={disabled}
                            onPress={onPress}
                            style={{
                              width: heroWidth,
                              height: ACTIVITY_FAMILY.photoHeight,
                              position: "relative",
                            }}
                          >
                            <ExpoImage
                              testID={
                                photoIndex === 0
                                  ? `${testID}:hero-image`
                                  : `${testID}:hero-image-${photoIndex}`
                              }
                              source={{
                                uri,
                                cacheKey:
                                  extractBuildtrackStoragePath(uri) ?? uri,
                              }}
                              style={StyleSheet.absoluteFillObject}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                              onError={() => markImageFailed(uri)}
                            />
                          </Pressable>
                        ))}
                      </ScrollView>
                    ) : (
                      <Pressable
                        testID={`${testID}:hero-image-pressable`}
                        accessibilityRole="button"
                        disabled={disabled}
                        onPress={onPress}
                        style={StyleSheet.absoluteFillObject}
                      >
                        <ExpoImage
                          testID={`${testID}:hero-image`}
                          source={{
                            uri: primaryImageUri,
                            cacheKey:
                              extractBuildtrackStoragePath(primaryImageUri) ??
                              primaryImageUri,
                          }}
                          style={StyleSheet.absoluteFillObject}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          onError={() => markImageFailed(primaryImageUri)}
                        />
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <View
                    testID={`${testID}:hero-spacer`}
                    className="overflow-hidden rounded-2xl bg-slate-100"
                    style={{ height: ACTIVITY_FAMILY.photoHeight }}
                  />
                )}
                {fillHeight || showPagerDots ? (
                  <View
                    testID={`${testID}:hero-pager`}
                    className="mt-2 flex-row items-center justify-center gap-1.5"
                    style={{ height: TABLET_POST_PAGER_RESERVE }}
                  >
                    {showPagerDots
                      ? usableImageUris.map((_, photoIndex) => (
                          <View
                            key={`${testID}:hero-dot:${photoIndex}`}
                            className={cn(
                              "h-2 rounded-full",
                              photoIndex === galleryIndex
                                ? "w-5 bg-[#08576E]"
                                : "w-2 bg-slate-300",
                            )}
                          />
                        ))
                      : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            {stackedEvents && (visiblePriors.length > 0 || hiddenPriorCount > 0) ? (
              <View testID={`${testID}:event-stack`} className="px-4">
                {visiblePriors.map((event, index) => (
                  <React.Fragment key={event.id}>
                    {renderEventRow({
                      containerTestID: `${testID}:prior-${index}`,
                      leafTestID: `${testID}:prior-${index}`,
                      action: event.action,
                      tone: event.dotTone,
                      actorName: event.actorLabel,
                      actorId: event.actorUserId,
                      dateLabel: event.timestampLabel,
                      emphasize: false,
                      withBullet: true,
                    })}
                  </React.Fragment>
                ))}
                {!eventsExpanded && hiddenPriorCount > 0 ? (
                  <Pressable
                    testID={`${testID}:expand-earlier`}
                    accessibilityRole="button"
                    accessibilityLabel={`Show ${hiddenPriorCount} earlier events`}
                    onPress={() => setEventsExpanded(true)}
                    hitSlop={8}
                    className="mt-1.5 self-start py-1"
                  >
                    <Text className="text-base font-medium text-[#0A728F]">
                      {`+${hiddenPriorCount} earlier`}
                    </Text>
                  </Pressable>
                ) : null}
                {eventsExpanded &&
                priorEvents.length > ACTIVITY_FEED_COLLAPSED_PRIORS ? (
                  <Pressable
                    testID={`${testID}:collapse-earlier`}
                    accessibilityRole="button"
                    accessibilityLabel="Show fewer earlier events"
                    onPress={() => setEventsExpanded(false)}
                    hitSlop={8}
                    className="mt-1.5 self-start py-1"
                  >
                    <Text className="text-base font-medium text-[#0A728F]">
                      Show less
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View className="pb-3" />
          </View>
        </View>
      </View>
    );
  }

  // Depth 1 — Task card rail (Tasks / Critical)
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      className="overflow-hidden rounded-2xl bg-white"
      style={fillHeight ? { height: RAIL_GRID_HEIGHT } : undefined}
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      <View
        testID={`${testID}:variant-${variant}`}
        className="relative"
        style={{
          height: fillHeight ? RAIL_GRID_HEIGHT : undefined,
          minHeight: fillHeight ? RAIL_GRID_HEIGHT : media.minHeight,
        }}
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
            hasUsableImage && primaryImageUri ? "bg-slate-100" : recipeClasses.placeholder,
          )}
          style={{ width: media.widthPx }}
        >
          {hasUsableImage && primaryImageUri ? (
            <ExpoImage
              testID={`${testID}:thumbnail-image`}
              source={{
                uri: primaryImageUri,
                cacheKey:
                  extractBuildtrackStoragePath(primaryImageUri) ?? primaryImageUri,
              }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              cachePolicy="memory-disk"
              onError={() => markImageFailed(primaryImageUri)}
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
          className="min-w-0 py-4 pr-4"
          style={{
            paddingLeft: contentPaddingLeft,
            minHeight: fillHeight ? RAIL_GRID_HEIGHT : media.minHeight,
            height: fillHeight ? RAIL_GRID_HEIGHT : undefined,
            ...(fillHeight
              ? { justifyContent: "space-between" }
              : { justifyContent: "center" }),
          }}
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
          {(bottomRow || hasActor) && (
            <View>
              {bottomRow}
              {hasActor ? (
                <View className="mt-2 flex-row items-center justify-end">
                  <UserAvatar
                    testID={`${testID}:actor-avatar`}
                    userId={actorUserId}
                    name={resolvedActorLabel}
                    size={28}
                  />
                </View>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
