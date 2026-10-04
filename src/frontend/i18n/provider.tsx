"use client";
import { createContext, useContext, useState } from "react";
import type { Locale } from "@/shared/types";
const Context = createContext({
  locale: "vi" as Locale,
  setLocale: (value: Locale) => {
    void value;
  },
  t: (vi: string, en: string) => {
    void en;
    return vi;
  },
});
export function LanguageProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial: Locale;
}) {
  const [locale, update] = useState(initial);
  function setLocale(value: Locale) {
    update(value);
    document.cookie = `pipicachu_locale=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = value;
  }
  return (
    <Context.Provider
      value={{ locale, setLocale, t: (vi, en) => (locale === "vi" ? vi : en) }}
    >
      {children}
    </Context.Provider>
  );
}
export const useLanguage = () => useContext(Context);
