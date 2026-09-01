import React, { useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@/utils/cn";

interface PrimaryActionBarProps {
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  isPrimaryDisabled?: boolean;
  /** When true, bar is position:absolute bottom (legacy sticky forms). Default true. */
  absolute?: boolean;
  testID?: string;
  primaryTestID?: string;
  secondaryTestID?: string;
  /** Destructive primary (e.g. reject) — red instead of blue. */
  destructive?: boolean;
  /** Marks the primary action as the form-focus target (Tab/next from last field). */
  primarySelected?: boolean;
}

/**
 * Sticky form footer. Owns bottom safe-area inset once via useSafeAreaInsets.
 * Parent SafeAreaView should omit `bottom` so this bar is the single inset owner.
 * Pass `absolute={false}` when the bar is inside KeyboardAvoidingView (Create Task).
 */
export default function PrimaryActionBar({
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  isPrimaryDisabled = false,
  absolute = true,
  testID,
  primaryTestID,
  secondaryTestID,
  destructive = false,
  primarySelected = false,
}: PrimaryActionBarProps) {
  const insets = useSafeAreaInsets();
  const showSecondaryAction = Boolean(secondaryLabel && onSecondaryPress);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // In-flow bars sit above the keyboard via KeyboardAvoidingView; keep the home-indicator
  // inset only when the keyboard is closed so the bar does not float 34px above IME.
  const bottomPad =
    !absolute && keyboardVisible ? 12 : Math.max(insets.bottom, 12);

  return (
    <View
      testID={testID}
      className={cn(
        "border-t border-gray-200 bg-white px-4 pt-3",
        absolute && "absolute bottom-0 left-0 right-0",
      )}
      style={{ paddingBottom: bottomPad }}
    >
      <View className="flex-row gap-3">
        {showSecondaryAction ? (
          <Pressable
            testID={secondaryTestID}
            accessibilityRole="button"
            onPress={onSecondaryPress}
            className="flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white py-3"
          >
            <Text className="text-base font-semibold text-gray-700">{secondaryLabel}</Text>
          </Pressable>
        ) : null}

        <Pressable
          testID={primaryTestID}
          accessibilityRole="button"
          accessibilityState={{
            disabled: isPrimaryDisabled,
            selected: primarySelected,
          }}
          onPress={onPrimaryPress}
          disabled={isPrimaryDisabled}
          className={cn(
            "items-center justify-center rounded-xl py-3",
            destructive ? "bg-red-600" : "bg-blue-600",
            showSecondaryAction ? "flex-1" : "w-full",
            isPrimaryDisabled && "opacity-50",
          )}
        >
          <Text className="text-base font-semibold text-white">{primaryLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}
