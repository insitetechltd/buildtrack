import React from "react";
import { Image, Text, View } from "react-native";

interface BrandHeaderTitleProps {
  label?: string;
  subtitle?: string;
}

export default function BrandHeaderTitle({
  label = "Taskr",
  subtitle,
}: BrandHeaderTitleProps) {
  return (
    <View testID="brand-header-title" className="flex-row items-center">
      <Image
        source={require("../../assets/icon.png")}
        className="h-10 w-10 rounded-xl"
        resizeMode="contain"
      />
      <View className="ml-3">
        <Text className="text-[24px] font-semibold tracking-[0.18em] text-[#F8FCFF]">
          {label.toUpperCase()}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-xs uppercase tracking-[0.22em] text-[#B9D9E4]">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
