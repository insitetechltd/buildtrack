import React from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTranslation } from "../../utils/useTranslation";

/**
 * Shared file-upload UI for every capture surface (Create/Edit Task, Progress Update,
 * Add Comment, Reject). Change this module to restyle all of those screens at once.
 * Photo picking stays in `usePhotoSelection`.
 */

export const FILE_UPLOAD_HARNESS_ROOT_TEST_ID = "file-upload-harness__root";
export const FILE_UPLOAD_HARNESS_CTA_TEST_ID = "file-upload-harness__cta";
export const FILE_UPLOAD_HARNESS_ADD_TEST_ID = "file-upload-harness__add";
export const FILE_UPLOAD_HARNESS_PLUS_TEST_ID = "file-upload-harness__plus_icon";
export const FILE_UPLOAD_HARNESS_DEFAULT_TITLE = "Add photos / files";

/** Matches photo preview tiles so the dashed Add cell always occupies the first grid slot. */
const TILE_CLASS = "w-24 h-24";

export type FileUploadItemStatus = "pending" | "uploaded";

export interface FileUploadItem {
  id: string;
  uri: string;
  status?: FileUploadItemStatus;
  onRemove?: () => void;
}

export interface FileUploadHarnessProps {
  title?: string;
  countLabel?: string;
  items?: FileUploadItem[];
  onAdd: () => void;
  embedded?: boolean;
  testID?: string;
  ctaTestID?: string;
  addTestID?: string;
  plusIconTestID?: string;
  previewTestIDPrefix?: string;
  removeTestIDPrefix?: string;
  accessibilityLabel?: string;
}

export default function FileUploadHarness({
  title = FILE_UPLOAD_HARNESS_DEFAULT_TITLE,
  countLabel,
  items = [],
  onAdd,
  embedded = false,
  testID = FILE_UPLOAD_HARNESS_ROOT_TEST_ID,
  ctaTestID = FILE_UPLOAD_HARNESS_CTA_TEST_ID,
  addTestID = FILE_UPLOAD_HARNESS_ADD_TEST_ID,
  plusIconTestID = FILE_UPLOAD_HARNESS_PLUS_TEST_ID,
  previewTestIDPrefix = "file-upload-harness__preview",
  removeTestIDPrefix = "file-upload-harness__preview_remove",
  accessibilityLabel = "Add attachments",
}: FileUploadHarnessProps) {
  const t = useTranslation();
  const pendingLabel = t.userManagement?.pending ?? "Pending";

  return (
    <View testID={testID} className={embedded ? "pb-2" : "mb-6"}>
      <View className="mb-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-gray-900">{title}</Text>
          {countLabel ? (
            <Text className="text-xs font-medium text-gray-500">{countLabel}</Text>
          ) : null}
        </View>
      </View>

      <View testID={ctaTestID} className="flex-row flex-wrap" style={{ gap: 12 }}>
        <Pressable
          testID={addTestID}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          onPress={onAdd}
          className={`${TILE_CLASS} items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-slate-50`}
        >
          <View
            testID={plusIconTestID}
            className="h-11 w-11 items-center justify-center rounded-full bg-white border border-gray-200"
          >
            <Ionicons name="add" size={24} color="#08576E" />
          </View>
        </Pressable>

        {items.map((item, index) => (
          <View
            key={item.id}
            testID={`${previewTestIDPrefix}_${index}`}
            className={`${TILE_CLASS} relative`}
          >
            <Image
              source={{
                uri: item.uri,
                cache: Platform.OS === "ios" ? "force-cache" : "default",
              }}
              className={`${TILE_CLASS} rounded-lg bg-gray-100`}
              resizeMode="cover"
            />
            {item.status === "pending" ? (
              <View className="absolute top-1 left-1 bg-amber-500 rounded px-1.5 py-0.5">
                <Text className="text-white text-xs font-semibold">{pendingLabel}</Text>
              </View>
            ) : null}
            {item.status === "uploaded" ? (
              <View className="absolute top-1 left-1 w-6 h-6 rounded-full items-center justify-center bg-green-500">
                <Ionicons name="checkmark" size={14} color="white" />
              </View>
            ) : null}
            {item.onRemove ? (
              <Pressable
                testID={`${removeTestIDPrefix}_${index}`}
                onPress={item.onRemove}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={14} color="white" />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
