import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { extractBuildtrackStoragePath } from "@/api/fileUploadService";
import FullScreenImageViewer from "@/components/FullScreenImageViewer";
import type { TaskDetailFileModel } from "@/ui/contracts/viewAdapters";

const PHOTOS_ACROSS = 4;
const PHOTO_GAP = 8;

interface TaskDetailFilesSectionProps {
  photosTitle: string;
  filesTitle: string;
  files: TaskDetailFileModel[];
  testID?: string;
}

function buildCachedImageSource(uri: string) {
  return {
    uri,
    cacheKey: extractBuildtrackStoragePath(uri) ?? uri,
  };
}

function PhotoTile({
  testID,
  uri,
  size,
  label,
  onPress,
}: {
  testID: string;
  uri: string;
  size: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width: size, height: size, borderRadius: 12, overflow: "hidden" }}
    >
      <ExpoImage
        source={buildCachedImageSource(uri)}
        contentFit="cover"
        cachePolicy="memory-disk"
        style={{ width: size, height: size, backgroundColor: "#E2E8F0" }}
      />
    </Pressable>
  );
}

export default function TaskDetailFilesSection({
  photosTitle,
  filesTitle,
  files,
  testID = "task-detail__files",
}: TaskDetailFilesSectionProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [rowWidth, setRowWidth] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const photos = files.filter((file) => file.kind === "image");
  const documents = files.filter((file) => file.kind !== "image");
  const imageUris = photos.map((file) => file.uri);
  const tileSize =
    rowWidth > 0
      ? Math.floor((rowWidth - PHOTO_GAP * (PHOTOS_ACROSS - 1)) / PHOTOS_ACROSS)
      : 0;
  const overflow = !catalogOpen && photos.length > PHOTOS_ACROSS;
  const visiblePhotos = overflow ? photos.slice(0, PHOTOS_ACROSS - 1) : photos;
  const hiddenCount = photos.length - visiblePhotos.length;

  if (photos.length === 0 && documents.length === 0) {
    return null;
  }

  return (
    <View testID={testID}>
      {photos.length > 0 ? (
        <View
          testID={`${testID}__photos`}
          className="mx-4 mb-4 rounded-2xl border border-gray-200 bg-white p-4"
        >
          <Text className="text-lg font-semibold text-[#0D2630]">{photosTitle}</Text>
          <View
            testID={catalogOpen ? `${testID}__catalog` : `${testID}__strip`}
            className="mt-3 flex-row flex-wrap"
            style={{ gap: PHOTO_GAP }}
            onLayout={(event) => {
              const width = event.nativeEvent.layout.width;
              if (width && width !== rowWidth) {
                setRowWidth(width);
              }
            }}
          >
            {tileSize > 0
              ? visiblePhotos.map((photo) => (
                  <PhotoTile
                    key={photo.id}
                    testID={`${testID}__photo-${photo.id}`}
                    uri={photo.uri}
                    size={tileSize}
                    label={photosTitle}
                    onPress={() => setViewerIndex(imageUris.indexOf(photo.uri))}
                  />
                ))
              : null}
            {overflow && tileSize > 0 ? (
              <Pressable
                testID={`${testID}__more`}
                accessibilityRole="button"
                accessibilityLabel={`Show ${hiddenCount} more photos`}
                onPress={() => setCatalogOpen(true)}
                className="items-center justify-center rounded-xl bg-[#E7F4F8]"
                style={{ width: tileSize, height: tileSize }}
              >
                <Text className="text-base font-semibold text-[#0A728F]">{`+${hiddenCount}`}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {documents.length > 0 ? (
        <View
          testID={`${testID}__documents`}
          className="mx-4 mb-4 rounded-2xl border border-gray-200 bg-white p-4"
        >
          <Text className="text-lg font-semibold text-[#0D2630]">{filesTitle}</Text>
          <View className="mt-3 gap-3">
            {documents.map((file) => (
              <View
                key={file.id}
                testID={`${testID}__row-${file.id}`}
                className="flex-row items-center gap-3"
              >
                <View className="h-11 w-11 items-center justify-center rounded-lg bg-[#E7F4F8]">
                  <Ionicons name="document-text-outline" size={22} color="#0A728F" />
                </View>
                <Text
                  testID={`${testID}__name-${file.id}`}
                  className="min-w-0 flex-1 text-base text-[#0D2630]"
                  numberOfLines={2}
                >
                  {file.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {viewerIndex !== null ? (
        <FullScreenImageViewer
          visible
          images={imageUris}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </View>
  );
}
