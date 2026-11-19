import React from "react";
import { Platform, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

type MonthDateCalendarProps = {
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  locale?: string;
  onChange: (date: Date) => void;
  onClose?: () => void;
};

/** Month grid used by every date field. iOS stays open after a day tap; Android uses the system dialog. */
export default function MonthDateCalendar({
  value,
  minimumDate,
  maximumDate,
  locale,
  onChange,
  onClose,
}: MonthDateCalendarProps) {
  return (
    <View className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <DateTimePicker
        value={value}
        mode="date"
        display={Platform.OS === "ios" ? "inline" : "default"}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        locale={locale}
        themeVariant="light"
        onChange={(event, selectedDate) => {
          if (Platform.OS !== "ios") {
            onClose?.();
          }
          if (!selectedDate || event?.type === "dismissed") {
            return;
          }
          onChange(selectedDate);
        }}
      />
    </View>
  );
}
