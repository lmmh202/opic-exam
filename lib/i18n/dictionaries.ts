import ko from "./locales/ko.json";
import en from "./locales/en.json";
import type { Locale } from "./config";

export type TranslationKey = keyof typeof ko;

const enDictionary: Partial<Record<TranslationKey, string>> = en;

export const dictionaries: Record<Locale, Record<string, string>> = {
  ko,
  en: enDictionary as Record<string, string>,
};
