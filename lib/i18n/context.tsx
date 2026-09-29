"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { dictionaries, type DictKey, type Locale } from "./dictionaries";

// The choice lives in a `locale` cookie so the server renders the right
// language on the first byte (app/layout.tsx reads it) — no Korean flash
// for English users. No URL-based routing (/en/...): this app has no SEO
// need for localized URLs yet. Upgrade path if that changes: a `[locale]`
// route segment + proxy redirect, reading this same dictionary.
//
// useSyncExternalStore (not useState+useEffect) — the store is the
// cookie itself, so there's nothing to duplicate into React state.

const LOCALE_CHANGE_EVENT = "haebot-locale-change";
const COOKIE = "locale";

function readCookie(): Locale | null {
  const match = document.cookie.match(/(?:^|;\s*)locale=(en|ko)(?:;|$)/);
  return match ? (match[1] as Locale) : null;
}

function writeCookie(next: Locale) {
  document.cookie = `${COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
}

function subscribe(callback: () => void) {
  window.addEventListener(LOCALE_CHANGE_EVENT, callback);
  return () => window.removeEventListener(LOCALE_CHANGE_EVENT, callback);
}

function writeLocale(next: Locale) {
  writeCookie(next);
  window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({ locale: "ko", setLocale: () => {} });

function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, () => readCookie() ?? initialLocale, () => initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // One-time move of a choice saved by the older localStorage version.
  useEffect(() => {
    try {
      const legacy = localStorage.getItem("locale");
      if ((legacy === "en" || legacy === "ko") && !readCookie()) writeLocale(legacy);
      localStorage.removeItem("locale");
    } catch {
      /* storage blocked — nothing to migrate */
    }
  }, []);

  return <LocaleContext.Provider value={{ locale, setLocale: writeLocale }}>{children}</LocaleContext.Provider>;
}

function useLocale() {
  return useContext(LocaleContext);
}

function useT() {
  const { locale } = useLocale();
  return (key: DictKey) => dictionaries[locale][key];
}

/** For page content authored inline as { ko, en } pairs (lib/site, tool content). */
function useBi() {
  const { locale } = useLocale();
  return (text: { ko: string; en: string }) => text[locale];
}

export { LocaleProvider, useLocale, useT, useBi };
