import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import {
  HEADER_LEADING_CONTROL_SIZE_CLASS,
  useHeaderChrome,
} from "@/components/headerChrome";
import { cn } from "@/utils/cn";

interface BrandHeaderTitleProps {
  label?: string;
  subtitle?: string;
  /** Explicit override. When omitted, follows header chrome (hidden if back is shown). */
  showMark?: boolean;
  titleTestID?: string;
  titleNumberOfLines?: number;
  onTitlePress?: () => void;
}

export default function BrandHeaderTitle({
  label = "Taskr",
  subtitle,
  showMark: showMarkProp,
  titleTestID,
  titleNumberOfLines,
  onTitlePress,
}: BrandHeaderTitleProps) {
  const { allowBrandMark } = useHeaderChrome();
  const showMark = showMarkProp ?? allowBrandMark;

  const title = (
    <Text
      testID={titleTestID}
      className="text-[24px] font-semibold tracking-[0.18em] text-[#F8FCFF]"
      numberOfLines={titleNumberOfLines}
      ellipsizeMode="tail"
    >
      {label.toUpperCase()}
    </Text>
  );

  return (
    <View testID="brand-header-title" className="flex-row items-center">
      {showMark ? (
        <Image
          testID="brand-header-title__mark"
          source={require("../../assets/icon.png")}
          className={cn(HEADER_LEADING_CONTROL_SIZE_CLASS, "rounded-xl")}
          resizeMode="contain"
          accessibilityLabel="Taskr"
        />
      ) : null}
      <View className={showMark ? "ml-3" : undefined}>
        {onTitlePress ? (
          <Pressable
            testID={titleTestID ? `${titleTestID}_pressable` : undefined}
            onPress={onTitlePress}
          >
            {title}
          </Pressable>
        ) : (
          title
        )}
        {subtitle ? (
          <Text
            testID={titleTestID ? `${titleTestID}_subtitle` : undefined}
            className="mt-0.5 text-xs uppercase tracking-[0.22em] text-[#B9D9E4]"
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
