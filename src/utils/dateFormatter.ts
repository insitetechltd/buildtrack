import { useLanguageStore, Language } from "../state/languageStore";

/**
 * Get the locale string for date formatting based on the app's language setting
 */
export function getDateLocale(): string {
  const language = useLanguageStore.getState().language;
  return language === "zh-TW" ? "zh-TW" : "en-US";
}

/**
 * Format a date according to the app's current language
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const locale = getDateLocale();
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  };
  
  return dateObj.toLocaleDateString(locale, defaultOptions);
}

/**
 * Format a date with weekday
 * e.g., "Thu, Dec 25, 2025" or "2025年12月25日 星期四"
 */
export function formatDateWithWeekday(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const locale = getDateLocale();
  
  return dateObj.toLocaleDateString(locale, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date for display (long format)
 * e.g., "December 25, 2025" or "2025年12月25日"
 */
export function formatDateLong(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const locale = getDateLocale();
  
  return dateObj.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a date for short display
 * e.g., "12/25/2025" or "2025/12/25"
 */
export function formatDateShort(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const locale = getDateLocale();
  
  return dateObj.toLocaleDateString(locale);
}

/**
 * Format time
 * e.g., "3:30 PM" or "下午3:30"
 */
export function formatTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const locale = getDateLocale();
  
  return dateObj.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format date and time together
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const locale = getDateLocale();
  
  return dateObj.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * React hook version that re-renders when language changes
 */
export function useDateFormatter() {
  const language = useLanguageStore((state) => state.language);
  const locale = language === "zh-TW" ? "zh-TW" : "en-US";
  
  return {
    locale,
    formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return dateObj.toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        ...options,
      });
    },
    formatDateWithWeekday: (date: Date | string) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return dateObj.toLocaleDateString(locale, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    },
    formatDateLong: (date: Date | string) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return dateObj.toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
    formatDateShort: (date: Date | string) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return dateObj.toLocaleDateString(locale);
    },
    formatTime: (date: Date | string) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return dateObj.toLocaleTimeString(locale, {
        hour: "numeric",
        minute: "2-digit",
      });
    },
    formatDateTime: (date: Date | string) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return dateObj.toLocaleString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    },
  };
}

