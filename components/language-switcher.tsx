"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { useTranslation } from "@/components/i18n-provider";

const LOCALE_LABELS: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur">
      <Languages className="ml-1.5 h-4 w-4 text-slate-500" />
      {LOCALES.map((code) => (
        <Button
          key={code}
          size="xs"
          variant={locale === code ? "default" : "ghost"}
          className="rounded-full px-2.5"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          aria-label={LOCALE_LABELS[code]}
        >
          {code.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
