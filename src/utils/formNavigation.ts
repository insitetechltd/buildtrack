import type { NativeSyntheticEvent, TextInputKeyPressEventData } from "react-native";

export interface FocusableFieldRegistration {
  fieldId: string;
  isFocusable: boolean;
}

export interface FormNavigationRegistry {
  fields: FocusableFieldRegistration[];
}

export function createFormNavigationRegistry(
  fields: FocusableFieldRegistration[],
): FormNavigationRegistry {
  return { fields };
}

function getOrderedFocusableFieldIds(registry: FormNavigationRegistry): string[] {
  return registry.fields.filter((field) => field.isFocusable).map((field) => field.fieldId);
}

export function getNextFocusableFieldId(
  registry: FormNavigationRegistry,
  activeFieldId: string,
): string | null {
  const ids = getOrderedFocusableFieldIds(registry);
  const index = ids.indexOf(activeFieldId);

  if (index === -1 || index === ids.length - 1) {
    return null;
  }

  return ids[index + 1];
}

export function getPreviousFocusableFieldId(
  registry: FormNavigationRegistry,
  activeFieldId: string,
): string | null {
  const ids = getOrderedFocusableFieldIds(registry);
  const index = ids.indexOf(activeFieldId);

  if (index <= 0) {
    return null;
  }

  return ids[index - 1];
}

export function getTabNavigationDirection(
  event: NativeSyntheticEvent<TextInputKeyPressEventData>,
): "next" | "previous" {
  const nativeEvent = event.nativeEvent as TextInputKeyPressEventData & {
    shiftKey?: boolean;
  };

  return nativeEvent.shiftKey === true ? "previous" : "next";
}
