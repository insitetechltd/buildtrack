/**
 * DEV LAB ONLY — Phase 2 Option A photo↔event highlight.
 * Does not replace live Recent Activity / ActivityStyleRowCard.
 * Gallery = photos from visible events only (latest + collapsed/expanded priors).
 */
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
import { UserAvatar } from "@/components/UserAvatar";
import { ACTIVITY_FAMILY } from "@/ui/contracts/activityFamily";
import {
  ACTIVITY_FEED_COLLAPSED_PRIORS,
  ACTIVITY_FEED_DOT_COLORS,
  type ActivityFeedDotTone,
} from "@/ui/contracts/activityFeed";
import { cn } from "@/utils/cn";
import {
  EVENT_META_COLUMN_WIDTH,
  type ActivityStylePostEvent,
} from "@/components/cards/ActivityStyleRowCard";

const EVENT_AVATAR_SIZE = 18;

export type PhotoSyncLabEvent = ActivityStylePostEvent & {
  photoUris?: string[];
};

type GallerySlide = {
  uri: string;
  eventId: string;
};

type ActivityPhotoSyncLabCardProps = {
  testID: string;
  taskTitle: string;
  events: PhotoSyncLabEvent[];
};

function isNegative(tone: ActivityFeedDotTone): boolean {
  return tone === "negative";
}

export default function ActivityPhotoSyncLabCard({
  testID,
  taskTitle,
  events,
}: ActivityPhotoSyncLabCardProps) {
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [heroWidth, setHeroWidth] = useState(0);

  const latest = events[0];
  const priors = events.slice(1);
  const hiddenPriorCount = Math.max(
    0,
    priors.length - ACTIVITY_FEED_COLLAPSED_PRIORS,
  );
  const visiblePriors = eventsExpanded
    ? priors
    : priors.slice(0, ACTIVITY_FEED_COLLAPSED_PRIORS);
  const visibleEvents = useMemo(
    () => (latest ? [latest, ...visiblePriors] : visiblePriors),
    [latest, visiblePriors],
  );

  /** Option A: gallery only from currently visible events. */
  const gallery = useMemo((): GallerySlide[] => {
    const slides: GallerySlide[] = [];
    for (const event of visibleEvents) {
      for (const uri of event.photoUris ?? []) {
        if (uri) {
          slides.push({ uri, eventId: event.id });
        }
      }
    }
    return slides;
  }, [visibleEvents]);

  useEffect(() => {
    setGalleryIndex(0);
  }, [gallery.map((slide) => `${slide.eventId}:${slide.uri}`).join("|")]);

  useEffect(() => {
    if (galleryIndex >= gallery.length) {
      setGalleryIndex(Math.max(0, gallery.length - 1));
    }
  }, [gallery.length, galleryIndex]);

  const activeEventId =
    gallery[galleryIndex]?.eventId ?? latest?.id ?? null;

  const onHeroLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== heroWidth) {
      setHeroWidth(nextWidth);
    }
  };

  const renderMeta = (params: {
    leafTestID: string;
    actorName?: string;
    actorId?: string;
    dateLabel?: string;
  }) => {
    const name = (params.actorName ?? "").trim();
    const date = (params.dateLabel ?? "").trim();
    return (
      <View
        testID={`${params.leafTestID}:meta-column`}
        style={{ width: EVENT_META_COLUMN_WIDTH }}
        className="shrink-0 flex-row items-center gap-1.5"
      >
        <View
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

  const renderEventRow = (
    event: PhotoSyncLabEvent,
    opts: { leafTestID: string; containerTestID: string },
  ) => {
    const photoActive = activeEventId === event.id && gallery.length > 0;
    const emphasized = photoActive || isNegative(event.dotTone);
    const actionClass = emphasized
      ? "text-base font-semibold text-[#0D2630]"
      : "text-base text-[#577783]";

    return (
      <View
        testID={opts.containerTestID}
        className={cn(
          "mt-1.5 flex-row items-start gap-2 rounded-lg",
          photoActive ? "bg-[#E7F4F8] px-1.5 py-1" : undefined,
        )}
      >
        <View
          testID={`${opts.leafTestID}:dot`}
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: ACTIVITY_FEED_DOT_COLORS[event.dotTone] }}
        />
        <Text
          testID={`${opts.leafTestID}:subtitle`}
          className={cn(actionClass, "min-w-0 flex-1")}
          numberOfLines={2}
        >
          {event.action}
        </Text>
        {renderMeta({
          leafTestID: opts.leafTestID,
          actorName: event.actorLabel,
          actorId: event.actorUserId,
          dateLabel: event.timestampLabel,
        })}
      </View>
    );
  };

  if (!latest) {
    return null;
  }

  return (
    <View
      testID={testID}
      className="overflow-hidden rounded-2xl border border-[#C8E6EF] bg-white"
    >
      <View className="px-4 pt-3">
        <Text testID={`${testID}:title`} className={ACTIVITY_FAMILY.titleClassName}>
          {taskTitle}
        </Text>
        {renderEventRow(latest, {
          containerTestID: `${testID}:post-footer`,
          leafTestID: testID,
        })}
      </View>

      {gallery.length > 0 ? (
        <View className="mx-4 mt-3">
          <View
            testID={`${testID}:hero`}
            className="overflow-hidden rounded-2xl bg-slate-100"
            style={{ height: ACTIVITY_FAMILY.photoHeight }}
            onLayout={onHeroLayout}
          >
            {gallery.length > 1 && heroWidth > 0 ? (
              <ScrollView
                testID={`${testID}:hero-swipe`}
                horizontal
                pagingEnabled
                directionalLockEnabled
                nestedScrollEnabled
                disableIntervalMomentum
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
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
                    Math.min(Math.max(nextIndex, 0), gallery.length - 1),
                  );
                }}
              >
                {gallery.map((slide, photoIndex) => (
                  <View
                    key={`${slide.eventId}:${slide.uri}:${photoIndex}`}
                    style={{
                      width: heroWidth,
                      height: ACTIVITY_FAMILY.photoHeight,
                    }}
                  >
                    <ExpoImage
                      testID={
                        photoIndex === 0
                          ? `${testID}:hero-image`
                          : `${testID}:hero-image-${photoIndex}`
                      }
                      source={{ uri: slide.uri }}
                      style={StyleSheet.absoluteFillObject}
                      contentFit="cover"
                    />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <ExpoImage
                testID={`${testID}:hero-image`}
                source={{ uri: gallery[0]?.uri }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
              />
            )}
          </View>
          {gallery.length > 1 ? (
            <View
              testID={`${testID}:hero-pager`}
              className="mt-2 flex-row items-center justify-center gap-1.5"
            >
              {gallery.map((slide, photoIndex) => (
                <View
                  key={`dot-${slide.eventId}-${photoIndex}`}
                  className={cn(
                    "h-2 rounded-full",
                    photoIndex === galleryIndex
                      ? "w-5 bg-[#08576E]"
                      : "w-2 bg-slate-300",
                  )}
                />
              ))}
            </View>
          ) : null}
          <Text
            testID={`${testID}:active-event-hint`}
            className="mt-1 text-sm text-[#497080]"
          >
            {`Photo ${galleryIndex + 1}/${gallery.length} · event ${activeEventId}`}
          </Text>
        </View>
      ) : null}

      <View testID={`${testID}:event-stack`} className="px-4 pb-3">
        {visiblePriors.map((event, index) => (
          <React.Fragment key={event.id}>
            {renderEventRow(event, {
              containerTestID: `${testID}:prior-${index}`,
              leafTestID: `${testID}:prior-${index}`,
            })}
          </React.Fragment>
        ))}
        {!eventsExpanded && hiddenPriorCount > 0 ? (
          <Pressable
            testID={`${testID}:expand-earlier`}
            onPress={() => setEventsExpanded(true)}
            className="mt-1.5 self-start py-1"
          >
            <Text className="text-base font-medium text-[#0A728F]">
              {`+${hiddenPriorCount} earlier`}
            </Text>
          </Pressable>
        ) : null}
        {eventsExpanded && priors.length > ACTIVITY_FEED_COLLAPSED_PRIORS ? (
          <Pressable
            testID={`${testID}:collapse-earlier`}
            onPress={() => setEventsExpanded(false)}
            className="mt-1.5 self-start py-1"
          >
            <Text className="text-base font-medium text-[#0A728F]">Show less</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
