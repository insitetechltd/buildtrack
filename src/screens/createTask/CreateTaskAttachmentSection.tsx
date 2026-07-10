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
  embedded?: boolean;
}

export default function CreateTaskAttachmentSection({
  attachments,
  asyncStoragePhotoCount = 0,
  onRemoveAttachment,
  onAddPhotos,
  embedded = false,
}: CreateTaskAttachmentSectionProps) {
  const t = useTranslation();
  const attachmentCount = attachments.length + asyncStoragePhotoCount;

  return (
    <View
      testID="create-task__attachments_section"
      className={embedded ? "pb-2" : "mx-4 mb-6 rounded-2xl border border-gray-200 bg-white p-4"}
    >
      <View className="mb-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-gray-900">
            Add photos / files
          </Text>
          {attachmentCount > 0 ? (
            <Text className="text-xs font-medium text-gray-500">
              {t.createTask.filesAdded(attachmentCount)}
            </Text>
          ) : null}
        </View>
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

      <View testID="create-task__attachments_cta">
        <Pressable
          testID="createTask-add-photos"
          accessibilityLabel="Add attachments"
          accessibilityRole="button"
          onPress={onAddPhotos}
          className="items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-slate-50 px-5 py-5"
        >
          <View
            testID="create-task__attachments_cta_plus_icon"
            className="h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#08576E]/15 bg-white"
          >
            <Ionicons name="add" size={30} color="#08576E" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
