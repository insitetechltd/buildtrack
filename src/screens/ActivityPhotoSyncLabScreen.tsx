import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ActivityPhotoSyncLabCard, {
  type PhotoSyncLabEvent,
} from "@/components/cards/ActivityPhotoSyncLabCard";

type ActivityPhotoSyncLabScreenProps = {
  onClose: () => void;
};

/** Deterministic placeholder photos (no network auth). */
const PHOTO = {
  a: "https://picsum.photos/seed/ra-lab-a/800/600",
  b: "https://picsum.photos/seed/ra-lab-b/800/600",
  c: "https://picsum.photos/seed/ra-lab-c/800/600",
  d: "https://picsum.photos/seed/ra-lab-d/800/600",
};

const DOOR_EVENTS: PhotoSyncLabEvent[] = [
  {
    id: "e-reject",
    action: "Rejected — wrong finish on hinges",
    actorLabel: "Sara CA",
    actorUserId: "u-sara",
    timestampLabel: "Jul 4, 8:20 AM",
    dotTone: "negative",
    photoUris: [PHOTO.a],
  },
  {
    id: "e-submit",
    action: "Submitted for review",
    actorLabel: "Bob Worker",
    actorUserId: "u-bob",
    timestampLabel: "Jul 4, 7:55 AM",
    dotTone: "caution",
    photoUris: [PHOTO.b, PHOTO.c],
  },
  {
    id: "e-progress",
    action: "Progress photo added — latch set installed",
    actorLabel: "Bob Worker",
    actorUserId: "u-bob",
    timestampLabel: "Jul 4, 7:10 AM",
    dotTone: "caution",
    photoUris: [PHOTO.d],
  },
  {
    id: "e-accept",
    action: "Task accepted",
    actorLabel: "Bob Worker",
    actorUserId: "u-bob",
    timestampLabel: "Jul 3, 4:02 PM",
    dotTone: "positive",
  },
  {
    id: "e-create",
    action: "New task created",
    actorLabel: "Sam PM",
    actorUserId: "u-sam",
    timestampLabel: "Jul 3, 3:40 PM",
    dotTone: "info",
  },
];

const LIGHTING_EVENTS: PhotoSyncLabEvent[] = [
  {
    id: "l-progress",
    action: "Progress photo added — fixture row B complete",
    actorLabel: "Alex Chen",
    actorUserId: "u-alex",
    timestampLabel: "Jul 4, 9:40 AM",
    dotTone: "caution",
    photoUris: [PHOTO.c, PHOTO.a],
  },
  {
    id: "l-accept",
    action: "Task accepted",
    actorLabel: "Alex Chen",
    actorUserId: "u-alex",
    timestampLabel: "Jul 4, 8:05 AM",
    dotTone: "positive",
  },
];

/**
 * Dev-only playground for Phase 2 Option A (photo pager highlights owning
 * visible event). Does not change production Recent Activity.
 */
export default function ActivityPhotoSyncLabScreen({
  onClose,
}: ActivityPhotoSyncLabScreenProps) {
  return (
    <SafeAreaView
      testID="activity-photo-sync-lab__root"
      className="flex-1 bg-[#EAF6FB]"
      edges={["top", "left", "right"]}
    >
      <View className="flex-row items-center justify-between border-b border-[#C8E6EF] bg-[#08576E] px-4 py-3">
        <Text className="text-lg font-semibold text-white">
          RA photo↔event lab
        </Text>
        <Pressable
          testID="activity-photo-sync-lab__close"
          onPress={onClose}
          hitSlop={12}
        >
          <Text className="text-base font-semibold text-white">Close</Text>
        </Pressable>
      </View>

      <ScrollView
        testID="activity-photo-sync-lab__scroll"
        contentContainerClassName="gap-4 px-4 py-4 pb-10"
      >
        <View className="rounded-2xl border border-[#C8E6EF] bg-white p-3">
          <Text className="text-sm font-semibold text-[#08576E]">
            Option A (test only)
          </Text>
          <Text className="mt-1 text-sm leading-5 text-[#577783]">
            Gallery = photos from visible events only. Swipe photos → owning
            event bolds + tint. Expand +N to include more photos in the gallery.
            Production Recent Activity is unchanged.
          </Text>
        </View>

        <ActivityPhotoSyncLabCard
          testID="activity-photo-sync-lab__door"
          taskTitle="Door hardware punch"
          events={DOOR_EVENTS}
        />

        <ActivityPhotoSyncLabCard
          testID="activity-photo-sync-lab__lighting"
          taskTitle="Install corridor lighting — Level 3"
          events={LIGHTING_EVENTS}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
