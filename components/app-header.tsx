import { LanguageSwitcher } from "@/components/language-switcher";

export function AppHeader() {
  return (
    <header className="fixed top-3 right-3 z-50">
      <LanguageSwitcher />
    </header>
  );
}
