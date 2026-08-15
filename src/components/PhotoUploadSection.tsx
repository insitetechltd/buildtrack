import React from "react";
import { Alert } from "react-native";

import FileUploadHarness, { type FileUploadItem } from "./ui/FileUploadHarness";
import { usePhotoSelection } from "../utils/usePhotoSelection";

interface PhotoUploadSectionProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  title?: string;
  emptyMessage?: string;
  maxPhotos?: number;
  showCount?: boolean;
}

export const PhotoUploadSection: React.FC<PhotoUploadSectionProps> = ({
  photos,
  onPhotosChange,
  title = "Photos",
  maxPhotos,
  showCount = false,
}) => {
  const { showPhotoSelectionDialog } = usePhotoSelection();

  const handleAddPhotos = async () => {
    if (maxPhotos && photos.length >= maxPhotos) {
      Alert.alert(
        "Limit Reached",
        `You can only upload up to ${maxPhotos} photo${maxPhotos > 1 ? "s" : ""}.`,
      );
      return;
    }

    await showPhotoSelectionDialog({
      allowClipboard: true,
      allowMultiple: true,
      onPhotosSelected: (selectedPhotos) => {
        const nextPhotos = [...photos, ...selectedPhotos.map((photo) => photo.uri)];
        if (maxPhotos && nextPhotos.length > maxPhotos) {
          onPhotosChange(nextPhotos.slice(0, maxPhotos));
          Alert.alert(
            "Limit Reached",
            `Only the first ${maxPhotos} photo${maxPhotos > 1 ? "s" : ""} were added.`,
          );
          return;
        }
        onPhotosChange(nextPhotos);
      },
    });
  };

  const items: FileUploadItem[] = photos.map((uri, index) => ({
    id: `${uri}-${index}`,
    uri,
    onRemove: () => onPhotosChange(photos.filter((_, photoIndex) => photoIndex !== index)),
  }));

  return (
    <FileUploadHarness
      title={title}
      countLabel={showCount && photos.length > 0 ? String(photos.length) : undefined}
      items={items}
      onAdd={() => {
        void handleAddPhotos();
      }}
    />
  );
};
