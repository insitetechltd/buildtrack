import React from "react";
import { Image as ExpoImage } from "expo-image";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";

import { cn } from "@/utils/cn";
import {
  getUserAvatarInitial,
  resolveUserAvatarColor,
} from "@/utils/userAvatarIdentity";

type UserAvatarProps = {
  name?: string | null;
  userId?: string | null;
  email?: string | null;
  imageUri?: string | null;
  size?: number;
  className?: string;
  textClassName?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

function avatarFontSize(size: number): number {
  if (size >= 72) {
    return 30;
  }
  if (size >= 40) {
    return 16;
  }
  if (size >= 32) {
    return 13;
  }
  if (size >= 28) {
    return 11;
  }
  return 10;
}

/**
 * User avatar — uploaded photo when available; otherwise initials on a per-user color.
 */
export function UserAvatar({
  name,
  userId,
  email,
  imageUri,
  size = 32,
  className,
  textClassName,
  style,
  testID,
}: UserAvatarProps) {
  const trimmedUri = imageUri?.trim();
  const backgroundColor = resolveUserAvatarColor({ userId, name, email });
  const initial = getUserAvatarInitial(name || email);

  if (trimmedUri) {
    return (
      <ExpoImage
        testID={testID}
        source={{ uri: trimmedUri }}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style,
        ]}
        className={className}
        contentFit="cover"
        accessibilityLabel={name?.trim() || "User photo"}
      />
    );
  }

  return (
    <View
      testID={testID}
      className={cn("items-center justify-center rounded-full", className)}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      <Text
        className={cn("font-semibold text-white", textClassName)}
        style={{ fontSize: avatarFontSize(size) }}
      >
        {initial}
      </Text>
    </View>
  );
}
