import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type OwnerConsoleRowStatus = "ready" | "stub" | "planned";

export type OwnerConsoleRow = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: OwnerConsoleRowStatus;
  onPress?: () => void;
  testID: string;
};

function statusLabel(status: OwnerConsoleRowStatus): string {
  switch (status) {
    case "ready":
      return "Open";
    case "stub":
      return "Preview";
    default:
      return "Later";
  }
}

export function OwnerConsoleInfoBanner({ children }: { children: string }) {
  return (
    <View className="mb-4 rounded-2xl border border-[#C8E6EF] bg-[#F8FCFF] px-4 py-3">
      <Text className="text-sm leading-5 text-[#577783]">{children}</Text>
    </View>
  );
}

export function OwnerConsoleSectionLabel({ label }: { label: string }) {
  return (
    <Text className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-[#8AA3AD]">
      {label}
    </Text>
  );
}

export function OwnerConsoleRowCard({ row }: { row: OwnerConsoleRow }) {
  const disabled = row.status === "planned" || !row.onPress;

  return (
    <Pressable
      testID={row.testID}
      disabled={disabled}
      onPress={row.onPress}
      className={`mb-3 rounded-2xl border px-4 py-4 ${
        disabled
          ? "border-[#D5E8EF] bg-[#F4FAFC] opacity-80"
          : "border-[#C8E6EF] bg-white active:bg-[#F0F9FC]"
      }`}
    >
      <View className="flex-row items-start">
        <View className="mr-3 mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-[#E7F4F8]">
          <Ionicons name={row.icon} size={22} color="#0A556B" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-[#0D2630]">
              {row.title}
            </Text>
            <Text
              className={`text-xs font-semibold uppercase ${
                row.status === "ready" ? "text-[#0A556B]" : "text-[#8AA3AD]"
              }`}
            >
              {statusLabel(row.status)}
            </Text>
          </View>
          <Text className="mt-1 text-sm leading-5 text-[#577783]">
            {row.subtitle}
          </Text>
        </View>
        {!disabled ? (
          <Ionicons name="chevron-forward" size={18} color="#8AA3AD" />
        ) : null}
      </View>
    </Pressable>
  );
}

export function OwnerConsoleStubMetrics({
  title,
  items,
  testID,
}: {
  title: string;
  items: string[];
  testID: string;
}) {
  return (
    <View
      testID={testID}
      className="mb-3 rounded-2xl border border-dashed border-[#C8E6EF] bg-white px-4 py-4"
    >
      <Text className="text-sm font-semibold text-[#0D2630]">{title}</Text>
      {items.map((line) => (
        <Text key={line} className="mt-2 text-sm leading-5 text-[#8AA3AD]">
          {line}
        </Text>
      ))}
    </View>
  );
}
