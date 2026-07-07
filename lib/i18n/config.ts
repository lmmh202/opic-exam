export type Locale = "ko" | "en";

export const LOCALES: Locale[] = ["ko", "en"];

export const DEFAULT_LOCALE: Locale = "ko";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "ko" || value === "en";
}
