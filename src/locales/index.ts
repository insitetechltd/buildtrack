import { en, TranslationKeys } from "./en";
import { zhTW } from "./zh-TW";
import { Language } from "../state/languageStore";

export const translations: Record<Language, TranslationKeys> = {
  en: en,
  "zh-TW": zhTW,
};

export * from "./en";
export * from "./zh-TW";
