import React from "react";
import { Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTranslation } from "../../utils/useTranslation";

interface SelectedPhoto {
  uri: string;
  fileName: string;
  isAnnotated: boolean;
  annotatedUri?: string;
}

type Attachment = string | SelectedPhoto;

interface CreateTaskAttachmentSectionProps {
  attachments: Attachment[];
  asyncStoragePhotoCount?: number;
  onRemoveAttachment: (index: number) => void;
  onAddPhotos: () => void;
}

export default function CreateTaskAttachmentSection({
  attachments,
  asyncStoragePhotoCount = 0,
  onRemoveAttachment,
  onAddPhotos,
}: CreateTaskAttachmentSectionProps) {
  const t = useTranslation();
  const attachmentCount = attachments.length + asyncStoragePhotoCount;

  return (
    <View className="mx-4 mb-6 rounded-2xl border border-gray-200 bg-white p-4">
      <View className="mb-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-gray-900">
            {t.createTask.attachments}
          </Text>
          {attachmentCount > 0 ? (
            <Text className="text-xs font-medium text-gray-500">
              {t.createTask.filesAdded(attachmentCount)}
            </Text>
          ) : null}
        </View>
        <Text className="mt-1 text-sm text-gray-500">
          Add photos before submitting the task.
        </Text>
      </View>

      {attachments.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row">
            {attachments.map((attachment, index) => {
              const photoUri =
                typeof attachment === "string" ? attachment : (attachment.annotatedUri || attachment.uri);
              const isPending = typeof attachment !== "string";

              return (
                <View
                  key={`attachment-${index}-${typeof attachment === "string" ? attachment : attachment.uri}`}
                  className="mr-3 relative"
                >
                  <Image
                    source={{
                      uri: photoUri,
                      cache: Platform.OS === "ios" ? "force-cache" : "default",
                    }}
                    className="w-24 h-24 rounded-lg bg-gray-100"
                    resizeMode="cover"
                  />
                  {isPending && (
                    <View className="absolute top-1 left-1 bg-amber-500 rounded px-1.5 py-0.5">
                      <Text className="text-white text-xs font-semibold">{t.userManagement.pending}</Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() => onRemoveAttachment(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
                  >
                    <Ionicons name="close" size={14} color="white" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      <Pressable
        testID="createTask-add-photos"
        onPress={onAddPhotos}
        className="flex-row items-center justify-between rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3"
      >
        <View className="flex-row items-center flex-1">
          <Ionicons name="cloud-upload-outline" size={20} color="#9ca3af" />
          <Text className="text-gray-600 font-medium ml-2 text-sm">
            {attachments.length === 0
              ? t.createTask.tapToAddFiles
              : t.createTask.filesAdded(attachments.length)}
          </Text>
        </View>
        {attachments.length > 0 && (
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
        )}
      </Pressable>
    </View>
  );
}
