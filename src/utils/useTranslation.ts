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

/** Non-hook access for pure modules (activity feed builders, etc.). */
export function getTranslations(): TranslationKeys {
  const language = useLanguageStore.getState().language;
  return translations[language] ?? translations.en;
}

export function fillTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] != null ? String(vars[key]) : `{${key}}`,
  );
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
  translationTree: any,
  path: string,
): string {
  return path.split(".").reduce((obj, key) => obj?.[key], translationTree) || path;
}
