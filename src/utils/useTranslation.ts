import { useLanguageStore } from "../state/languageStore";
import { translations, TranslationKeys } from "../locales";

/**
 * Hook to access translations based on current language
 * 
 * Usage:
 * const t = useTranslation();
 * <Text>{t.dashboard.welcomeBack}</Text>
 * <Text>{t.common.save}</Text>
 */
export function useTranslation(): TranslationKeys {
  const language = useLanguageStore((state) => state.language);
  return translations[language];
}

/**
 * Helper function to get nested translation value
 * Useful for dynamic keys
 * 
 * Usage:
 * const t = useTranslation();
 * const text = getNestedTranslation(t, 'dashboard.welcomeBack');
 */
export function getNestedTranslation(
  translations: any,
  path: string
): string {
  return path.split('.').reduce((obj, key) => obj?.[key], translations) || path;
}
